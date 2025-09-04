import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { Channel } from '../../models/channel.model';
import { User } from '../../models/user.model';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { SocketService } from '../../services/socket.service';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-channel-list',
  standalone: true,
  imports: [FormsModule, CommonModule, Navbar, HttpClientModule],
  templateUrl: './channel-list.html',
  styleUrls: ['./channel-list.css']
})
export class ChannelList implements OnInit, OnDestroy {
  private readonly API_URL = 'http://localhost:3000/api';

  currentUser: User | null = null;
  groupId!: number;
  channels: Channel[] = [];
  usersInGroup: User[] = [];
  pendingRequests: { userId: string, groupId: number }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private channelService: ChannelService,
    public userService: UserService,
    private http: HttpClient,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
    if (!this.currentUser) return;

    this.groupId = Number(this.route.snapshot.paramMap.get('groupId'));

    this.loadChannels();
    this.refreshUsers();
    this.loadPendingRequests();
    this.registerSocketListeners();

    // Join group room
    this.socketService.emit('joinGroup', { groupId: this.groupId, userId: this.currentUser!.id });
  }

  ngOnDestroy(): void {
    // Leave group room
    this.socketService.emit('leaveGroup', { groupId: this.groupId, userId: this.currentUser?.id });
    // Don't disconnect socket as it's shared
  }

  private loadChannels() {
    this.channels = this.channelService.getChannelByGroup(this.groupId);
  }

  private refreshUsers(): void {
    // If your REST route is not ready, you can keep using the local service:
    this.usersInGroup = this.userService.getUsersByGroup(this.groupId)
      .filter(u => !u.role.includes('SUPER_ADMIN') && !u.role.includes('GROUP_ADMIN'));
    // When your API is ready, switch to:
    // this.http.get<User[]>(`${this.API_URL}/groups/${this.groupId}/users`)
    //   .subscribe(users => {
    //     this.usersInGroup = users.filter(u => !u.role.includes('SUPER_ADMIN') && !u.role.includes('GROUP_ADMIN'));
    //   });
  }

  private loadPendingRequests() {
    // Load pending requests from server API
    this.http.get<any[]>(`${this.API_URL}/groups/${this.groupId}/join-requests`).subscribe({
      next: (requests) => {
        this.pendingRequests = requests;
        console.log('Loaded pending requests for group', this.groupId, ':', requests);
      },
      error: (err) => {
        console.error('Failed to load pending requests:', err);
        this.pendingRequests = [];
      }
    });
  }

  private registerSocketListeners(): void {
    this.socketService.on('channelCreated', (channel: Channel) => {
      if (channel.groupId === this.groupId) this.channels.push(channel);
    });

    this.socketService.on('channelDeleted', (channelId: number) => {
      this.channels = this.channels.filter(c => c.id !== channelId);
    });

    this.socketService.on('groupRequest', (req: { userId: string, groupId: number }) => {
      if (req.groupId === this.groupId) this.pendingRequests.push(req);
    });

    this.socketService.on('requestApproved', (userId: string) => {
      this.pendingRequests = this.pendingRequests.filter(r => r.userId !== userId);
      this.refreshUsers();
    });

    this.socketService.on('requestRejected', (userId: string) => {
      this.pendingRequests = this.pendingRequests.filter(r => r.userId !== userId);
    });

    this.socketService.on('userPromoted', () => this.refreshUsers());
  }

  canManageGroup(): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role.includes('SUPER_ADMIN')) return true;
    return this.currentUser.role.includes('GROUP_ADMIN') && this.currentUser.groups.includes(this.groupId);
  }

  // ------------------ User Actions ------------------
  removeUser(user: User): void {
    if (!this.canManageGroup()) return;
    if (user.role.includes('SUPER_ADMIN') || user.role.includes('GROUP_ADMIN')) {
      alert('Cannot remove admin users.');
      return;
    }
    this.userService.removeUserFromGroup(user, this.groupId, this.currentUser!);
    this.refreshUsers();
  }

  approveRequest(req: { userId: string, groupId: number }): void {
    this.http.post(`${this.API_URL}/groups/${this.groupId}/join-requests/${req.userId}/approve`, {})
      .subscribe({
        next: () => {
          console.log('Request approved:', req);
          this.socketService.emit('approveRequest', req);
          this.loadPendingRequests(); // Refresh the list
          this.refreshUsers(); // Refresh users list
        },
        error: (err) => {
          console.error('Failed to approve request:', err);
          alert('Failed to approve request');
        }
      });
  }

  rejectRequest(req: { userId: string, groupId: number }): void {
    this.http.post(`${this.API_URL}/groups/${this.groupId}/join-requests/${req.userId}/reject`, {})
      .subscribe({
        next: () => {
          console.log('Request rejected:', req);
          this.socketService.emit('rejectRequest', req);
          this.loadPendingRequests(); // Refresh the list
        },
        error: (err) => {
          console.error('Failed to reject request:', err);
          alert('Failed to reject request');
        }
      });
  }

  promoteUser(user: User, role: 'GROUP_ADMIN' | 'SUPER_ADMIN'): void {
    this.http.post(`${this.API_URL}/groups/${this.groupId}/users/${user.id}/promote`, { role })
      .subscribe(() => this.socketService.emit('promoteUser', { userId: user.id, role, groupId: this.groupId }));
  }

  // ------------------ Channel Actions ------------------
  openChannel(channelId: number): void {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) return;
    if (!this.currentUser!.groups.includes(channel.groupId)) return;
    if (channel.bannedUsers?.includes(this.currentUser!.id)) return;
    this.router.navigate([`/group/${this.groupId}/channel/${channelId}`]);
  }

  createChannel(name: string): void {
    if (!name.trim()) return;
    this.http.post<Channel>(`${this.API_URL}/groups/${this.groupId}/channels`, { name })
      .subscribe(newChannel => {
        // Server will emit channelCreated event, no need to manually add
        // this.channels.push(newChannel); // REMOVED - causes duplicates
        // this.socket.emit('createChannel', newChannel); // REMOVED - not needed
      });
  }

  deleteChannel(channelId: number): void {
    this.http.delete(`${this.API_URL}/groups/${this.groupId}/channels/${channelId}`)
      .subscribe(() => {
        // Server will emit channelDeleted event, no need to manually remove
        // this.channels = this.channels.filter(c => c.id !== channelId); // REMOVED - causes issues
        // this.socket.emit('deleteChannel', { channelId, groupId: this.groupId }); // REMOVED - not needed
      });
  }
}
