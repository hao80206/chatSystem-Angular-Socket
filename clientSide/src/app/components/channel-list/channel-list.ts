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
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-channel-list',
  imports: [FormsModule, CommonModule, Navbar, HttpClientModule],
  templateUrl: './channel-list.html',
  styleUrls: ['./channel-list.css'],
  standalone: true
})
export class ChannelList implements OnInit, OnDestroy {
  private readonly API_URL = 'http://localhost:3000/api';
  private subscriptions: Subscription[] = [];

  currentUser: User | null = null;
  groupId!: number;
  channelsInGroup: Channel[] = [];
  usersInGroup: User[] = [];
  pendingRequests: { userId: string, groupId: number }[] = [];
  usersMap: Record<string, User> = {};

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
    if (!this.currentUser) {
      console.error('User not logged in');
      this.router.navigate(['/login']);
      return;
    }

    this.userService.getAllUsers().subscribe(users => {
      users.forEach(u => this.usersMap[u.id] = u);
    });

    this.groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    if (!this.groupId) {
      console.error('Missing groupId in route');
      return;
    }

    // Subscribe to channels from service (reactive updates)
    const sub = this.channelService.getAllChannels().subscribe(allChannels => {
      this.channelsInGroup = allChannels.filter(c => c.groupId === this.groupId);
    });
    this.subscriptions.push(sub);

    // Load initial channels
    this.channelService.loadChannels(this.groupId);

    this.refreshUsers();
    this.loadPendingRequests();
    this.registerSocketListeners();

    // Join socket.io room for this group
    this.socketService.emit('joinGroup', { groupId: this.groupId, userId: this.currentUser.id });

    this.socketService.emit('updateStatus', { userId: this.currentUser.id, status: 'online' });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // ----------------- users & requests -----------------
  private refreshUsers(): void {
    this.userService.getUsersByGroup(this.groupId)
      .pipe(map(users => users.filter(u => !u.role.includes('SUPER_ADMIN') && !u.role.includes('ADMIN'))))
      .subscribe(filteredUsers => {
        this.usersInGroup = filteredUsers;
      });
  }

  private loadPendingRequests(): void {
    this.http.get<{ userId: string, groupId: number }[]>(`${this.API_URL}/groups/${this.groupId}/join-requests`)
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
    this.socketService.on('groupCreated', group => this.groupService.addGroup(group));

    this.socketService.on('channelCreated', (channel: Channel) => {
      if (channel.groupId === this.groupId) this.channelService.addLocalChannel(channel);
    });

    this.socketService.on('channelDeleted', (channelId: number) => {
      this.channelService.removeLocalChannel(channelId);
    });

    this.socketService.on('groupRequest', (req: { userId: string, groupId: number }) => {
      if (req.groupId === this.groupId && !this.pendingRequests.some(r => r.userId === req.userId)) {
        this.pendingRequests.push(req);
      }
    });

    this.socketService.on('requestApproved', (data: { userId: string, groupId: number }) => {
      if (this.currentUser?.id === data.userId && !this.currentUser.groups.includes(data.groupId)) {
        this.currentUser.groups.push(data.groupId);
        this.channelService.loadChannels(this.groupId); // refresh channels after approval
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
  
    this.userService.removeUserFromGroup(user, this.groupId, this.currentUser!)
      ?.subscribe({
        next: () => this.refreshUsers(),
        error: (err) => console.error('Failed to remove user:', err)
      });
  }

  approveRequest(request: { userId: string; groupId: number }) {
    this.http.post(`${this.API_URL}/groups/${request.groupId}/join-requests/${request.userId}/approve`, {})
      .subscribe({
        next: (res: any) => {
          // Remove from pending requests locally
          this.pendingRequests = this.pendingRequests.filter(r => r.userId !== request.userId);
  
          // Optionally update current user groups if the request was for the logged-in user
          if (this.currentUser?.id === request.userId) {
            if (!this.currentUser.groups.includes(request.groupId)) {
              this.currentUser.groups.push(request.groupId);
            }
          }
  
          // Refresh channels in case user just got access
          this.channelService.loadChannels(request.groupId);
        },
        error: (err) => {
          console.error('Approval failed:', err);
          alert('Failed to approve join request: ' + (err?.error?.detail || err.message));
        }
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
        next: () => {},
        error: (err) => {
          console.error('Failed to promote user:', err);
          alert('Failed to promote user');
        }
      });
  }

  openChannel(channelId: number): void {
    const channel = this.channelsInGroup.find(c => c.id === channelId);
    if (!channel) return;
    if (!this.currentUser!.groups.includes(channel.groupId)) return;
    if (channel.bannedUsers?.includes(this.currentUser!.id)) {
      console.log("this user is banned and cannot access this channel");
      alert("You cannot access this channel because you have been banned !");
      return;
    }

    // Change user status before navigating
    this.updateUserStatus(); 
    this.router.navigate([`/group/${this.groupId}/channel/${channelId}`]);
  }

  getChannelImage(channel: any): string {
    // List of allowed images in assets/Channels (optional, or you can hardcode logic)
    const validImages = ['General', 'News', 'Trip', 'Beauty', 'Comedy', 'Cooking', 'Exercise', 'Games', 'WorldHeritage', 'Cosmetics', 'Vlog', 'Mystery'];
    
    const namePart = channel.name?.trim();
    if (namePart && validImages.includes(namePart)) {
      return `${namePart}.png`;
    } else {
      return 'defaultImg.png'; // fallback image
    }
  }

  createChannel(): void {
    const name = this.newChannelName.trim();
    if (!name) return;

    const obs = this.channelService.createChannel(this.groupId, name);
    if (obs) {
      obs.subscribe({
        next: () => this.newChannelName = '',
        error: (err) => {
          console.error('Channel creation failed', err);

        // Custom message for duplicate channel name
        if (err?.error?.error === 'Channel name has to be unique') {
          alert('Channel name has to be unique');
        } else {
          alert('Failed to create channel: ' + (err?.error?.detail || err.message));
        }
      }})
    }
  }

  deleteChannel(channelId: number): void {
    const obs = this.channelService.deleteChannel(this.groupId, channelId);
    if (obs) {
      obs.subscribe({
        error: (err) => console.error('Failed to delete channel', err)
      });
    }
  }


  banUser(channelId: number, userId: string): void {
    this.channelService.banUserFromChannel(channelId, userId);
  }

  updateUserStatus(): void {
    if (!this.currentUser) return;
  
    this.currentUser.status = 'online';
  
    // If you want to sync this with the backend:
    this.http.post(`${this.API_URL}/users/${this.currentUser.id}/status`, { status: 'online' })
    .subscribe({
      next: () => console.log('Status set to online'),
      error: (err) => console.error('Failed to update status:', err)
    });

  this.socketService.emit('updateStatus', { userId: this.currentUser.id, status: 'online' });
  }
}
