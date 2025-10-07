import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
import Peer from 'peerjs';

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
  remoteStreams: { userId: string; username: string; profileImg: string; stream: MediaStream }[] =[];

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  peer!: Peer;
  localStream!: MediaStream;
  remoteStream!: MediaStream;
  videoStarted = false;
  remoteConnected = false;


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

    this.socketService.connect();
    

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

    this.socketService.on('userJoinedVideo', ({ userId }) => {
      console.log(`User ${userId} joined video chat`);
    });
    
    this.socketService.on('userLeftVideo', ({ userId }) => {
      console.log(`User ${userId} left video chat`);
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

  private initPeer() {
    this.peer = new Peer({
      host: 'localhost',
      port: 3000,
      path: '/peerjs',
      secure: false
    });
  
    // When this user opens PeerJS
this.peer.on('open', (id) => {
  console.log('My Peer ID:', id);
  if (this.localStream) {
    this.socketService.emit('peerIdReady', {
      channelId: this.channelId,
      userId: this.currentUser?.id,
      username: this.currentUser?.username,
      profileImg: this.currentUser?.profileImg,
      peerId: id
    });
  }
});

// Incoming call from other peers
this.peer.on('call', (call) => {
  if (!this.localStream) return;

  call.answer(this.localStream);
  
  call.on('stream', (remoteStream) => {
    const existing = this.remoteStreams.find(r => r.userId === call.metadata.userId);
    if (!existing) {
      this.remoteStreams.push({
        userId: call.metadata.userId,
        username: call.metadata.username || 'Unknown',
        profileImg: call.metadata.profileImg || '/assets/Icons/woman-img-1.png',
        stream: remoteStream
      });
    }
  });
});

    // Listen for new peers announcing themselves
    this.socketService.on('peerIdReady', ({ peerId, userId, username, profileImg }) => {
      if (userId !== this.currentUser?.id && this.localStream) {
        const call = this.peer.call(peerId, this.localStream, {
          metadata: { userId: this.currentUser?.id, username: this.currentUser?.username, profileImg: this.currentUser?.profileImg }
        });

        call.on('stream', (remoteStream) => {
          const existing = this.remoteStreams.find(r => r.userId === userId);
          if (!existing) {
            this.remoteStreams.push({
              userId,
              username,
              profileImg,
              stream: remoteStream
            });
          }
        });
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


  getRemoteUsername(): string {
    // Find the first user who is not the current user
    const remoteUser = this.allUsersInGroup.find(u => u.id !== this.currentUser?.id);
    return remoteUser?.username || 'Unknown';
  }
  
  getRemoteProfileImg(): string {
    const remoteUser = this.allUsersInGroup.find(u => u.id !== this.currentUser?.id);
    return remoteUser?.profileImg || '/assets/Icons/woman-img-1.png';
  }


  canBan(user: User | null | undefined): boolean {
    if (!this.currentUser) return false;  // current user must exist
    if (!user || !user.role) return false; // user or role missing
    if (user.id === this.currentUser.id) return false; // can't ban self
    if (user.role?.includes('SUPER_ADMIN') || user.role?.includes('GROUP_ADMIN')) return false;
  
    // Check if current user is admin
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

  // ------ VIDEO CHAT --------//

  async startVideoChat() {
    if (this.videoStarted) return;

    const confirmStart = confirm("Start the video chat?");
    if (!confirmStart) return;

    this.videoStarted = true;

    // Get local media
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.localVideo.nativeElement.srcObject = this.localStream;
      this.localVideo.nativeElement.muted = true;
      await this.localVideo.nativeElement.play();

      // Emit join video event
      this.socketService.emit('joinVideo', { channelId: this.channelId, userId: this.currentUser?.id });

      // Emit peerIdReady only AFTER local media is ready
      if (!this.peer) {
        this.initPeer();
      } else {
        this.socketService.emit('peerIdReady', {
          channelId: this.channelId,
          userId: this.currentUser?.id,
          peerId: this.peer.id
        });
      }

    } catch (err) {
      console.error('Failed to get local media', err);
      alert('Cannot access camera/mic.');
      this.videoStarted = false;
      return;
    }
  }

  endVideoChat() {
    const confirmEnd = confirm("End the video chat?");
    if (!confirmEnd) return;

    this.videoStarted = false;
    this.remoteConnected = false;

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
    }

    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }
  
    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }

    // Emit leave video event
    this.socketService.emit('leaveVideo', { channelId: this.channelId, userId: this.currentUser?.id });
  }

  async setRemoteStream(stream: MediaStream) {
    this.remoteStream = stream;

    if (!this.remoteVideo?.nativeElement) return;

    try {
      this.remoteVideo.nativeElement.srcObject = stream;
      await this.remoteVideo.nativeElement.play();
    } catch (err) {
      console.warn('Play interrupted, retrying...', err);
      // Retry once after short delay
      setTimeout(() => {
        if (this.remoteVideo?.nativeElement) this.remoteVideo.nativeElement.play().catch(() => {});
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.channelId && this.currentUser?.id) {
      this.socketService.emit('leaveChannel', { channelId: this.channelId, userId: this.currentUser.id });
    }
  
    this.endVideoChat();
  
    // Remove all peer listeners
    if (this.peer) {
      this.peer.destroy();
    }
  
    // Remove socket listeners
    this.socketService.off('peerIdReady');
  }
}

