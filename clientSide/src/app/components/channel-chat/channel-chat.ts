import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { SocketService } from '../../services/socket.service';
import { User } from '../../models/user.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-channel-chat',
  imports: [FormsModule, CommonModule, Navbar],
  templateUrl: './channel-chat.html',
  styleUrls: ['./channel-chat.css']
})
export class ChannelChat implements OnInit, OnDestroy {
  private readonly API = 'http://localhost:3000';

  currentUser: User | null = null;
  channelId!: number;
  groupId!: number;
  messages: { user: string, text: string, timestamp: Date }[] = [];
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

    // Get groupId from channel
    const channel = this.channelService.getChannelById(this.channelId);
    this.groupId = channel?.groupId ?? 0;

    // Load existing messages from server
    this.loadMessages();

    // Users in this group (exclude admins)
    this.usersInGroup = this.userService.getUsersByGroup(this.groupId)
      .filter(u => !u.role.includes('SUPER_ADMIN') && !u.role.includes('GROUP_ADMIN'));

    // Join channel room
    this.socketService.emit('joinChannel', { channelId: this.channelId, userId: this.currentUser?.id });

    // Incoming messages
    this.socketService.on('receiveMessage', (msg: any) => {
      this.messages.push(msg);
    });

    // Ban event
    this.socketService.on('userBanned', (userId: string) => {
      if (userId === this.currentUser?.id) {
        alert('You are banned from this channel!');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private loadMessages() {
    this.http.get<any[]>(`${this.API}/api/channels/${this.channelId}/messages`).subscribe({
      next: (messages) => {
        this.messages = messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      },
      error: (err) => {
        console.error('Failed to load messages:', err);
        // Fallback to dummy messages
        this.messages = [
          { user: 'Alice', text: 'Welcome to the channel!', timestamp: new Date(Date.now() - 60000) },
          { user: 'Bob', text: 'Hi everyone!', timestamp: new Date(Date.now() - 45000) },
          { user: 'Charlie', text: 'Let\'s start our discussion.', timestamp: new Date(Date.now() - 30000) },
        ];
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.currentUser) return;

    const message = {
      channelId: this.channelId,
      user: this.currentUser.username,
      text: this.newMessage,
      timestamp: new Date()
    };

    this.socketService.emit('sendMessage', message);
    this.newMessage = '';
  }

  banUser(userId: string) {
    if (userId === this.currentUser?.id) {
      console.warn("Cannot ban yourself");
      return;
    }

    const isAdmin = this.userService.isGroupAdmin(this.currentUser) || this.userService.isSuperAdmin(this.currentUser);
    if (!isAdmin) {
      alert("You're not allowed to ban users.");
      return;
    }

    // Emit ban event via socket
    this.socketService.emit('banUser', { channelId: this.channelId, userId });
    
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
