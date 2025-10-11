import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-navbar',
  standalone: true,           // add this since it's a standalone component
  imports: [],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar {

  constructor(private userService: UserService, private router:Router, private socketService:SocketService ) { }

  logout() {
    this.userService.logout();  //clear user data
    this.router.navigate(['/login']);  //redirect to login
    console.log('current user logOut')
  }

  goToDashboard() {
    const user = this.userService.getCurrentUser();
    if (!user) {
      alert('Login first');
      return;
    }
  
    // Emit leave event to server
    // We need the channelId, so pass it from ChannelChat when opening navbar
    const channelId = this.userService.getChannelId(); // simple global reference
    if (user.status === 'online' && channelId) {
      const confirmLeave = confirm("You are currently in a channel. Leave this channel and go to Dashboard?");
      if (!confirmLeave) return;
  
      this.socketService.emit('leaveChannel', { channelId, userId: user.id });
      user.status = 'offline';
      this.userService.setChannelId(null);
    }
    this.router.navigate(['/dashboard']);
  }
}  