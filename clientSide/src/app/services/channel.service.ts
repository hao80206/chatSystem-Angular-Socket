import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Channel } from '../models/channel.model';
import { User } from '../models/user.model';
import { UserService } from './user.service';
import { SocketService } from './socket.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  private readonly API_URL = 'http://localhost:3000/api';
  private channels: Channel[] = [];
  private channels$ = new BehaviorSubject<Channel[]>([]);

  constructor(
    private userService: UserService,
    private socketService: SocketService,
    private http: HttpClient
  ) {}

  // ---------------- LOAD CHANNELS FOR A GROUP ----------------
  loadChannels(groupId: number): void {
    this.http.get<Channel[]>(`${this.API_URL}/groups/${groupId}/channels`).subscribe({
      next: (channels) => {
        this.channels = channels;
        this.channels$.next([...this.channels]);
      },
      error: (err) => {
        console.error('Failed to load channels:', err);
      }
    });
  }

  getAllChannels(): Observable<Channel[]> {
    return this.channels$.asObservable();
  }

  getChannelByGroup(groupId: number): Channel[] {
    return this.channels.filter(c => c.groupId === groupId);
  }

  getChannelById(channelId: number): Channel | undefined {
    return this.channels.find(c => c.id === channelId);
  }

  getChannelsForUser(groupId: number, user: User | null): Channel[] {
    if (!user) return [];
  
    // SuperAdmin sees all channels
    if (user.role.includes('SUPER_ADMIN')) {
      return this.channels.filter(c => c.groupId === groupId);
    }
  
    // GroupAdmin or regular user: only channels in groups they belong to
    if (user.groups.includes(groupId)) {
      return this.channels.filter(c => c.groupId === groupId);
    }
  
    return [];
  }

  // ---------------- JOIN CHANNEL ----------------
  joinChannel(user: User, channelId: number): boolean {
    const channel = this.getChannelById(channelId);
    if (!channel) return false;

    if (!user.groups.includes(channel.groupId)) return false;
    if (channel.bannedUsers.includes(user.id)) return false;

    if (!channel.members.includes(user.id)) {
      channel.members.push(user.id);
      this.updateChannelMembers(channel.id, channel.members).subscribe();
    }

    return true;
  }

  private updateChannelMembers(channelId: number, members: string[]): Observable<Channel> {
    return this.http.put<Channel>(`${this.API_URL}/${channelId}/members`, { members }).pipe(
      tap(updated => {
        const index = this.channels.findIndex(c => c.id === channelId);
        if (index !== -1) {
          this.channels[index] = updated;
          this.channels$.next([...this.channels]);
        }
      })
    );
  }

  // ChannelService Helper
  addLocalChannel(channel: Channel): void {
    const exists = this.channels.find(c => c.id === channel.id);
    if (!exists) {
      this.channels.push(channel);
      this.channels$.next([...this.channels]);
    }
  }

  removeLocalChannel(channelId: number): void {
    this.channels = this.channels.filter(c => c.id !== channelId);
    this.channels$.next([...this.channels]);
  }

  // ---------------- BAN USER ----------------
  banUserFromChannel(channelId: number, targetUserId: string): boolean {
    const currentUser = this.userService.getCurrentUser();
    const channel = this.getChannelById(channelId);
    if (!currentUser || !channel) return false;
  
    const isAllowed = this.userService.isSuperAdmin(currentUser) ||
      (this.userService.isGroupAdmin(currentUser) && currentUser.groups.includes(channel.groupId));
  
    if (!isAllowed) {
      console.warn("You're not allowed to ban users. Only SUPER_ADMIN or GROUP_ADMIN can ban.");
      return false;
    }
  
    // Emit to server to persist in DB
    this.socketService.emit('banUser', { channelId, userId: targetUserId });
  
    // Optimistic UI update (optional)
    if (!channel.bannedUsers.includes(targetUserId)) {
      channel.bannedUsers.push(targetUserId);
      channel.members = channel.members.filter(id => id !== targetUserId);
      this.channels$.next([...this.channels]);
    }
  
    return true;
  }
  

  // ---------------- CREATE CHANNEL ----------------
  createChannel(groupId: number, name: string): Observable<Channel> | null {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return null;

    if (
      !this.userService.isSuperAdmin(currentUser) &&
      !(this.userService.isGroupAdmin(currentUser) && currentUser.groups.includes(groupId))
    ) {
      console.warn("You don't have permission to create new channel");
      return null;
    }

    return this.http.post<Channel>(`${this.API_URL}/groups/${groupId}/channels`, { name }).pipe(
      tap(newChannel => {
        this.channels.push(newChannel);
        this.channels$.next([...this.channels]);
      })
    );
  }

  // ---------------- DELETE CHANNEL ----------------
  deleteChannel(groupId: number, channelId: number | string): Observable<void> | null {
    const currentUser = this.userService.getCurrentUser();
    const id = Number(channelId);
    const channel = this.getChannelById(id);
    if (!currentUser || !channel) return null;

    if (!this.userService.canManageGroup(currentUser, channel.groupId)) {
      console.warn("You're not allowed to delete this channel");
      return null;
    }

    return this.http.delete<void>(`${this.API_URL}/groups/${groupId}/channels/${channelId}`).pipe(
      tap(() => {
        this.channels = this.channels.filter(c => c.id !== id);
        this.channels$.next([...this.channels]);
      })
    );
  }
}
