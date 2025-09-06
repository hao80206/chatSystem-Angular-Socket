import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { Channel } from '../../models/channel.model';
import { User } from '../../models/user.model';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import { SocketService } from '../../services/socket.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-channel-list',
  imports: [FormsModule, CommonModule, Navbar, HttpClientModule],
  templateUrl: './channel-list.html',
  styleUrls: ['./channel-list.css'],
  standalone: true
})
export class ChannelList implements OnInit, OnDestroy {
  private readonly API_URL = 'http://localhost:3000/api';

  currentUser: User | null = null;
  groupId!: number;
  channels: Channel[] = [];
  usersInGroup: User[] = [];
  pendingRequests: { userId: string, groupId: number }[] = [];

  newChannelName = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private channelService: ChannelService,
    public userService: UserService,
    private http: HttpClient,
    private socketService: SocketService,
    private groupService: GroupService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
    if (!this.currentUser) return;

    this.groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    if (!this.groupId) {
      console.error('Missing groupId in route');
      return;
    }

    this.loadChannels();
    this.refreshUsers();
    this.loadPendingRequests();
    this.registerSocketListeners();

    // Join socket.io room for this group
    this.socketService.emit('joinGroup', { groupId: this.groupId, userId: this.currentUser.id });
  }

  ngOnDestroy(): void {
    this.socketService.emit('leaveGroup', { groupId: this.groupId, userId: this.currentUser?.id });
  }

  // ----------------- data loaders -----------------
  private loadChannels() {
    this.http.get<Channel[]>(`${this.API_URL}/groups/${this.groupId}/channels`)
      .subscribe({
        next: (channels) => this.channels = channels || [],
        error: (err) => {
          console.error('Failed to load channels', err);
          this.channels = this.channelService.getChannelByGroup(this.groupId);
        }
      });
  }

  private refreshUsers(): void {
    this.usersInGroup = this.userService
      .getUsersByGroup(this.groupId)
      .filter(u => !u.role.includes('SUPER_ADMIN') && !u.role.includes('GROUP_ADMIN'));
  }

  private loadPendingRequests() {
    this.http.get<{ userId: string, groupId: number, username: string }[]>(`${this.API_URL}/groups/${this.groupId}/join-requests`)
      .subscribe({
        next: (requests) => this.pendingRequests = Array.isArray(requests) ? requests : [],
        error: (err) => {
          console.error('Failed to load pending requests:', err);
          this.pendingRequests = [];
        }
      });
  }

  // ----------------- sockets -----------------
  private registerSocketListeners(): void {

    this.socketService.on('groupCreated', (group) => {
      console.log('New group received via socket', group);
      // Add group locally
      this.groupService.addGroup(group);
    })

    this.socketService.on('channelCreated', (channel: Channel) => {
      if (channel && channel.groupId === this.groupId) {
        const exists = this.channels.some(c => c.id === channel.id);
        if (!exists) this.channels = [...this.channels, channel];
      }
    });

    this.socketService.on('channelDeleted', (channelId: number) => {
      this.channels = this.channels.filter(c => c.id !== channelId);
    });

    this.socketService.on('groupRequest', (req: { userId: string, groupId: number }) => {
      if (req && req.groupId === this.groupId) {
        const exists = this.pendingRequests.some(r => r.userId === req.userId);
        if (!exists) this.pendingRequests.push(req);
        this.pendingRequests = [...this.pendingRequests];
      }
    });

    this.socketService.on('requestApproved', (data: { userId: string, groupId: number }) => {
      if (this.currentUser && this.currentUser.id === data.userId) {
        if (!this.currentUser.groups.includes(data.groupId)) {
          this.currentUser.groups.push(data.groupId);
        }
        this.loadChannels(); // refresh list after approval
      }
    });

    this.socketService.on('requestRejected', (payload: { userId: string }) => {
      this.pendingRequests = this.pendingRequests.filter(r => r.userId !== payload.userId);
    });

    this.socketService.on('userPromoted', (payload: { userId: string, role: string, groupId: number }) => {
      if (payload.groupId !== this.groupId) return;
      const user = this.usersInGroup.find(u => u.id === payload.userId);
      if (user && !user.role.includes(payload.role)) {
        user.role.push(payload.role);
        this.usersInGroup = [...this.usersInGroup];
      }
    });
  }

  // ----------------- actions -----------------
  canManageGroup(): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role.includes('SUPER_ADMIN')) return true;
    return this.currentUser.role.includes('GROUP_ADMIN') && this.currentUser.groups.includes(this.groupId);
  }

  removeUser(user: User): void {
    if (!this.canManageGroup()) return;
    if (user.role.includes('SUPER_ADMIN') || user.role.includes('GROUP_ADMIN')) {
      alert('Cannot remove admin users.');
      return;
    }
    this.userService.removeUserFromGroup(user, this.groupId, this.currentUser!);
    this.refreshUsers();
  }

  approveRequest(request: { userId: string; groupId: number }) {
    this.http.post(`${this.API_URL}/groups/${request.groupId}/join-requests/${request.userId}/approve`, {})
      .subscribe({
        next: () => this.pendingRequests = this.pendingRequests.filter(r => r.userId !== request.userId),
        error: (err) => console.error('Approval failed:', err)
      });
  }

  rejectRequest(request: { userId: string; groupId: number }) {
    this.http.post(`${this.API_URL}/groups/${request.groupId}/join-requests/${request.userId}/reject`, {})
      .subscribe({
        next: () => this.pendingRequests = this.pendingRequests.filter(r => r.userId !== request.userId),
        error: (err) => console.error('Reject failed:', err)
      });
  }

  promoteUser(user: User, role: 'GROUP_ADMIN' | 'SUPER_ADMIN'): void {
    this.http.post(`${this.API_URL}/groups/${this.groupId}/users/${user.id}/promote`, { role })
      .subscribe({
        next: () => {
          // server will emit userPromoted, no need to emit manually
        },
        error: (err) => {
          console.error('Failed to promote user:', err);
          alert('Failed to promote user');
        }
      });
  }

  openChannel(channelId: number): void {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;
    if (!this.currentUser!.groups.includes(channel.groupId)) return;
    if (channel.bannedUsers?.includes(this.currentUser!.id)) return;
    this.router.navigate([`/group/${this.groupId}/channel/${channelId}`]);
  }

  createChannel() {
    const name = this.newChannelName.trim();
    if (!name) return;

    this.http.post<Channel>(`${this.API_URL}/groups/${this.groupId}/channels`, { name })
      .subscribe({
        next: (channel) => {
          // server already emits channelCreated to all tabs (including this one)
          this.newChannelName = '';
        },
        error: (err) => {
          console.error('Channel creation failed', err);
          alert('Failed to create channel');
        }
      });
  }

  deleteChannel(channelId: number): void {
    this.http.delete(`${this.API_URL}/groups/${this.groupId}/channels/${channelId}`)
      .subscribe({
        error: (err) => console.error('Failed to delete channel', err)
      });
  }
}
