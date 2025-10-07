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
  messages: { user: string; text: string; timestamp: Date; senderId: string, content: string, type: string, profileImg: string }[] = [];
  newMessage = '';
  allUsersInGroup: User[] = [];
  usersInGroup: User[] = [];
  selectedImage: File | null = null;

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
    this.userService.setChannelId(this.channelId);
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

    // Load all users (for online list)
    this.userService.getUsersByGroup(this.groupId).subscribe(users => {
      this.allUsersInGroup = [...users];
    });

    // Users in this group (exclude admins)
    this.userService.getUsersByGroup(this.groupId).pipe(
      map(users =>
        users.filter(u => !u.role.includes('SUPER_ADMIN') && !u.role.includes('GROUP_ADMIN'))
      )
    ).subscribe(filteredUsers => {
      this.usersInGroup = filteredUsers; 
    });

  // Someone joins
    this.socketService.on('userJoined', ({ channelId, user }) => {
      if (channelId === this.channelId) {
        const idx = this.allUsersInGroup.findIndex(u => u.id === user.id);
        if (idx >= 0) this.allUsersInGroup[idx].status = 'online';
        else this.allUsersInGroup.push({ ...user, status: 'online' });
        this.allUsersInGroup = [...this.allUsersInGroup];
      }
    });

    // Someone leaves
    this.socketService.on('userLeft', ({ channelId, userId }) => {
      if (channelId === this.channelId) {
        const user = this.allUsersInGroup.find(u => u.id === userId);
        if (user) user.status = 'offline';
        this.allUsersInGroup = [...this.allUsersInGroup];
      }
    });
    
    // Join channel room
    this.socketService.emit('joinChannel', { channelId: this.channelId, userId: this.currentUser?.id });

    // Add current user to the list
    const meInList = this.usersInGroup.find(u => u.id === this.currentUser?.id);
    if (!meInList && this.currentUser) {
      this.usersInGroup.push({ ...this.currentUser, status: 'online' });
      this.usersInGroup = [...this.usersInGroup];
    }

    // Listen for incoming messages
    this.socketService.on('receiveMessage', (msg: any) => {
      if (msg.channelId === this.channelId) {
        this.messages.push({
          user: msg.senderName || 'Unknown',
          text: msg.type === 'text' ? msg.content : '',
          content: msg.type === 'image' ? msg.content : '',
          type: msg.type,
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
  };


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
          text: msg.type === 'text' ? msg.content : '',
          content: msg.type === 'image' ? msg.content : '',
          type: msg.type,
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
    if (!this.currentUser) return;
  
    // Prepare base message
    const baseMessage = {
      channelId: this.channelId,
      senderId: this.currentUser.id,
      senderName: this.currentUser.username,
      type: '',
      content: '',
      timestamp: new Date(),
      profileImg: this.currentUser.profileImg
    };
  
    // Text message
    if (this.newMessage.trim()) {
      const message = { ...baseMessage, type: 'text', content: this.newMessage };
  
      // 1. Save to DB
      this.http.post(`${this.API}/api/channels/${this.channelId}/messages`, message).subscribe({
        next: () => this.newMessage = '',
        error: (err) => console.error('Failed to send message:', err)
      });
    }
  
    // Image message
    if (this.selectedImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const imgBase64 = reader.result as string;
        const message = { ...baseMessage, type: 'image', content: imgBase64 };
  
        console.log('Posting message to server, type=', message.type, 'content length=', (message.content || '').length);
        this.http.post(`${this.API}/api/channels/${this.channelId}/messages`, message).subscribe({
          next: () => this.selectedImage = null,
          error: (err) => console.error('Failed to send image:', err)
        });
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedImage = file;
  
      // Automatically send the image after selecting
      const reader = new FileReader();
      reader.onload = () => {
        const imgBase64 = reader.result as string;
  
        // Build message object
        const message = {
          channelId: this.channelId,
          senderId: this.currentUser?.id,
          senderName: this.currentUser?.username,
          type: 'image',
          content: imgBase64,
          timestamp: new Date(),
          profileImg: this.currentUser?.profileImg
        };
  
        // Send to server
        this.http.post(`${this.API}/api/channels/${this.channelId}/messages`, message).subscribe({
          next: () => this.selectedImage = null,
          error: (err) => console.error('Failed to send image:', err)
        });
      };
      reader.readAsDataURL(file);
  
    } else {
      alert('Please select a valid image file.');
      this.selectedImage = null;
    }
  }
  

  leaveChannel(): void {
    if (!this.currentUser) return;
  
    const confirmLeave = confirm("You are about to leave this channel. Are you sure?");
    if (!confirmLeave) return;
  
    // Update status to offline before leaving
    this.updateUserStatus('offline');
  
    // Emit leave event to server
    this.socketService.emit('leaveChannel', {
      channelId: this.channelId,
      userId: this.currentUser.id
    });
  
    // Navigate back to channel list
    this.userService.setChannelId(null)
    this.router.navigate([`/group/${this.groupId}/channels`]);
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

  updateUserStatus(newStatus: string): void {
    if (!this.currentUser) return;
  
    this.currentUser.status = newStatus;
    console.log("Status Updated:", newStatus);
  
    // If you want to sync this with the backend:
    this.http.patch(`${this.API}/api/users/${this.currentUser.id}/status`, { status: newStatus })
      .subscribe({
        error: (err) => console.error('Failed to update status:', err)
      });
  }

  ngOnDestroy(): void {
    if (this.channelId && this.currentUser?.id) {
      this.socketService.emit('leaveChannel', { channelId: this.channelId, userId: this.currentUser.id });
    }
  }
}
