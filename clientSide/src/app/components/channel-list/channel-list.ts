import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { Channel } from '../../models/channel.model';
import { User } from '../../models/user.model';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-channel-list',
  imports: [FormsModule, CommonModule, Navbar],
  templateUrl: './channel-list.html',
  styleUrl: './channel-list.css'
})
export class ChannelList implements OnInit {

  groupId!: number;
  channels: Channel[] = [];
  usersInGroup: User[] = [];
  newChannel = '';

  constructor(private route: ActivatedRoute, 
              private router: Router,
              private channelService:ChannelService,
              private userService:UserService
            ) { }

  ngOnInit(): void {
    // Get groupId from route and convert to number
    this.groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    console.log('GroupID: ', this.groupId);

    // Fetch channels from service
    this.channels = this.channelService.getChannelByGroup(this.groupId);
    console.log('Channels: ', this.channels);

    // Load only normal users of this group
    this.usersInGroup = this.userService.getUsersByGroup(this.groupId)
    .filter(u => !u.role.includes('GROUP_ADMIN') && !u.role.includes('SUPER_ADMIN'));
    console.log('Users in group: ', this.usersInGroup);
  }

  // Only GROUP_ADMIN or SUPER_ADMIN can manage group
  canManageGroup(): boolean {
    const u = this.userService.getCurrentUser();
    if (!u) return false;

    if (u.role.includes('SUPER_ADMIN')) return true;

    // Check if user is GROUP_ADMIN **and belongs to this group**
    return u.role.includes('GROUP_ADMIN') && u.groups.includes(this.groupId);
  }

  openChannel(channelId: number) {
    // ✅ Everyone can open channels
    this.router.navigate(['/channel', channelId]);
  }

  removeUser(user: User) {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;

    // Check if current user can manage this group
    if (!this.canManageGroup()) {
      console.warn("You do not have permission to manage this group.");
      return;
    }

    // Only allow removing normal users
    if (user.role.includes('SUPER_ADMIN') || user.role.includes('GROUP_ADMIN')) {
      console.warn("You cannot remove this user since they'are ADMINISTRATOR.");
      return;
    }

    // Remove user from group
    this.userService.removeUserFromGroup(user, this.groupId, currentUser);

    // Refresh users list (only normal users)
    this.usersInGroup = this.userService.getUsersByGroup(this.groupId)
      .filter(u => !u.role.includes('GROUP_ADMIN') && !u.role.includes('SUPER_ADMIN'));
  }

  createChannel(name: string): void {

    if (!name.trim()) {
      alert("channel name cannot be empty!");
      return;
    }

    const newChannel = this.channelService.createChannel(this.groupId, name);
    if (newChannel) {
      console.log('Channel created:', newChannel);
      this.channels.push(newChannel); // refresh list
    } else {
      console.warn('Failed to create channel.');
    }
  }

  deleteChannel(channelId: number): void {

    const deleted = this.channelService.deleteChannel(channelId); // returns boolean now
    if (deleted) {
      console.log("Channel deleted:", channelId);
      this.channels = this.channels.filter(c => c.id !== channelId);
    } else {
      console.warn("Failed to delete channel or not allowed.");
    }
  }

}
