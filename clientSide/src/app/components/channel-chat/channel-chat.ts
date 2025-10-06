import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { SocketService } from '../../services/socket.service';
import { User } from '../../models/user.model';
import { Channel } from '../../models/channel.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-channel-chat',
  imports: [FormsModule, CommonModule, Navbar],
  standalone: true,
  templateUrl: './channel-chat.html',
  styleUrls: ['./channel-chat.css']
})
export class ChannelChat implements OnInit, OnDestroy {
  private readonly API = 'http://localhost:3000';

  currentUser: User | null = null;
  channelId: number = 0;
  groupId!: number;
  messages: { user: string; text: string; timestamp: Date; senderId: string, profileImg: string }[] = [];
  newMessage = '';
  usersInGroup: User[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public channelService: ChannelService,
    public userService: UserService,
    private socketService: SocketService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
    this.channelId = Number(this.route.snapshot.paramMap.get('channelId'));
    this.loadChannel();

    // Get groupId from channel
    this.route.paramMap.subscribe(params => {
      const id = params.get('groupId'); // make sure the route uses :groupId
      this.groupId = id ? +id : 0; // convert to number
      if(this.groupId) {
        this.loadChannel();
      }
    });

    // Load existing messages from server
    this.loadMessages();

    // Users in this group (exclude admins)
    this.userService.getUsersByGroup(this.groupId).pipe(
      map(users =>
        users.filter(u => !u.role.includes('SUPER_ADMIN') && !u.role.includes('GROUP_ADMIN'))
      )
    ).subscribe(filteredUsers => {
      this.usersInGroup = filteredUsers; 
    });

    // Join channel room
    this.socketService.emit('joinChannel', { channelId: this.channelId, userId: this.currentUser?.id });

    // Listen for incoming messages
    this.socketService.on('receiveMessage', (msg: any) => {
      if (msg.channelId === this.channelId) {
        this.messages.push({
          user: msg.senderName || 'Unknown',
          text: msg.content || '',
          timestamp: new Date(msg.timestamp),
          senderId: msg.senderId,
          profileImg: msg.profileImg || '/assets/Icons/woman-img-1.png'
        });
    }});

    this.socketService.on('userBannedFromChannel', ({ channelId, userId }) => {
      if (channelId === this.channelId) {
        this.usersInGroup = this.usersInGroup.filter(u => u.id !== userId);
      }
    });
    
    this.socketService.on('userBanned', (userId: string) => {
      if (userId === this.currentUser?.id) {
        alert("You are banned!");
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private loadChannel() {
    const channel = this.channelService.getChannelById(this.channelId);
    if (channel) {
      this.groupId = channel.groupId;
    } else {
      this.http.get<Channel>(`${this.API}/api/channels/${this.channelId}`)
        .subscribe(ch => this.groupId = ch.groupId);
    }
  }

  private loadMessages() {
    this.http.get<any[]>(`${this.API}/api/channels/${this.channelId}/messages`).subscribe({
      next: (messages) => {
        this.messages = messages.map(msg => ({
          user: msg.senderName || 'Unknown',
          text: msg.content || '',
          timestamp: new Date(msg.timestamp),
          senderId: msg.senderId,
          profileImg: msg.profileImg || '/assets/Icons/woman-img-1.png'
        }));
      },
      error: (err) => {
        console.error('Failed to load messages:', err);
      }
    });
  }
  
  sendMessage() {
    if (!this.groupId || !this.newMessage.trim() || !this.currentUser) return;
  
    const message = {
      channelId: this.channelId,
      senderId: this.currentUser.id,
      senderName: this.currentUser.username,
      content: this.newMessage,
      timestamp: new Date(),
      profileImg: this.currentUser.profileImg
    };
  
    // Emit to server via socket
    this.socketService.emit('sendMessage', message);
  
    this.newMessage = '';
  }

  canBan(user: User): boolean {
    if (!this.currentUser) return false;
    if (user.id === this.currentUser.id) return false; // can't ban self
    if (user.role.includes('SUPER_ADMIN') || user.role.includes('GROUP_ADMIN')) return false;
    return this.userService.isSuperAdmin(this.currentUser) || this.userService.isGroupAdmin(this.currentUser);
  }

  banUser(userId: string) {
    if (userId === this.currentUser?.id) {
      console.warn("Cannot ban yourself");
      return;
    }

    const isAdmin = this.currentUser && (this.userService.isGroupAdmin(this.currentUser) || this.userService.isSuperAdmin(this.currentUser))
    if (!isAdmin) {
      alert("You're not allowed to ban users.");
      return;
    }

    // Emit ban event via socket
    this.socketService.emit('banUser', { channelId: this.channelId, userId, groupId: this.groupId });
    
    // Update local state
    this.channelService.banUserFromChannel(this.channelId, userId);
    this.usersInGroup = this.usersInGroup.filter(u => u.id !== userId);
    
    console.log(`User ${userId} banned from channel ${this.channelId}`);
  }

  ngOnDestroy(): void {
    this.socketService.emit('leaveChannel', { channelId: this.channelId, userId: this.currentUser?.id });
    // Don't disconnect socket as it's shared across components
  }
}
