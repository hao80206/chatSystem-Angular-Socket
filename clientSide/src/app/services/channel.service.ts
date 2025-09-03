import { Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { Channel } from '../models/channel.model';
import { UserService } from './user.service';


@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  private channels: Channel[] = [
    { id: 101, groupId: 1, name: 'General', members: [], bannedUsers: [] },
    { id: 102, groupId: 1, name: 'News', members: [], bannedUsers: [] },
    { id: 103, groupId: 1, name: 'Trip', members: [], bannedUsers: [] },
    { id: 104, groupId: 1, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 105, groupId: 1, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 106, groupId: 1, name: 'Cooking', members: [], bannedUsers: [] },
    { id: 107, groupId: 1, name: 'Exercise', members: [], bannedUsers: [] },
  
    { id: 201, groupId: 2, name: 'News', members: [], bannedUsers: [] },
    { id: 202, groupId: 2, name: 'Games', members: [], bannedUsers: [] },
    { id: 203, groupId: 2, name: 'Trip', members: [], bannedUsers: [] },
    { id: 204, groupId: 2, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 205, groupId: 2, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 206, groupId: 2, name: 'Cooking', members: [], bannedUsers: [] },
  
    { id: 301, groupId: 3, name: 'News', members: [], bannedUsers: [] },
    { id: 302, groupId: 3, name: 'General', members: [], bannedUsers: [] },
    { id: 303, groupId: 3, name: 'Trip', members: [], bannedUsers: [] },
    { id: 304, groupId: 3, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 305, groupId: 3, name: 'Games', members: [], bannedUsers: [] },
  
    { id: 401, groupId: 4, name: 'General', members: [], bannedUsers: [] },
    { id: 402, groupId: 4, name: 'WorldHeritage', members: [], bannedUsers: [] },
    { id: 403, groupId: 4, name: 'Cosmetics', members: [], bannedUsers: [] },
    { id: 404, groupId: 4, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 405, groupId: 4, name: 'Mystery', members: [], bannedUsers: [] },
  
    { id: 501, groupId: 5, name: 'News', members: [], bannedUsers: [] },
    { id: 502, groupId: 5, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 503, groupId: 5, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 504, groupId: 5, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 505, groupId: 5, name: 'Games', members: [], bannedUsers: [] },
  
    { id: 601, groupId: 6, name: 'News', members: [], bannedUsers: [] },
    { id: 602, groupId: 6, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 603, groupId: 6, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 604, groupId: 6, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 605, groupId: 6, name: 'Cooking', members: [], bannedUsers: [] },
  
    { id: 701, groupId: 7, name: 'General', members: [], bannedUsers: [] },
    { id: 702, groupId: 7, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 703, groupId: 7, name: 'WorldHeritage', members: [], bannedUsers: [] },
    { id: 704, groupId: 7, name: 'Trip', members: [], bannedUsers: [] },
    { id: 705, groupId: 7, name: 'Mystery', members: [], bannedUsers: [] },
  ];

  constructor(private userService: UserService) { 
    const savedChannels = localStorage.getItem('channels');
      if (savedChannels) {
        this.channels = JSON.parse(savedChannels);
      }
  }

  getChannelByGroup(groupId: number) : Channel[] {
    return this.channels.filter(c => c.groupId === groupId);

  };

  getChannelById(channelId: number) : Channel | undefined {
    const id = Number(channelId);
    return this.channels.find(c => c.id === id);
  };

  joinChannel(user: User, channelId: number): boolean {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return false;

    const channel = this.getChannelById(channelId)
    if(!channel) return false;

    //chat user cannot join any channel if he is not a member of the group
    if(!user.groups.includes(channel.groupId)){
      return false
    };
    //check if a chat user is not banned
    if(channel.bannedUsers.includes(user.id)) {
      return false
    };

    if (!channel.members.includes(user.id)) {
      channel.members.push(user.id);
    }
    
    return true;
  }

  leaveChannel(user: User, channelId: number): boolean {
    const channel = this.getChannelById(channelId);
    if (!channel) return false;
    channel.members = channel.members.filter(id => id !== user.id);
    return true;
  }

  banUserFromChannel(channelId: number, targetUserId: string): boolean {
    const currentUser = this.userService.getCurrentUser();
    const channel = this.getChannelById(channelId);
    if (!currentUser || !channel) return false;

   // Only SUPER_ADMIN or GROUP_ADMIN of this group can ban
      const isAllowed = this.userService.isSuperAdmin(currentUser) ||
      (this.userService.isGroupAdmin(currentUser) && currentUser.groups.includes(channel.groupId));

      if (!isAllowed) {
      console.warn("You're not allowed to ban users. Only SUPER_ADMIN or GROUP_ADMIN can ban.");
      return false;
      }

      const targetUser = this.userService.getUserById(targetUserId);
      if (!targetUser) {
        console.warn(`User with ID ${targetUserId} not found.`);
        return false;
      }
    
      // Add to banned list and remove from channel
      if (!channel.bannedUsers.includes(targetUserId)) {
        channel.bannedUsers.push(targetUserId);
        channel.members = channel.members.filter(id => id !== targetUserId);
      }
    
      console.log(
        `User ${targetUser.username} (ID: ${targetUser.id}) banned from channel ${channel.name} - Group: ${channel.groupId}`
      );
    
      // Report to all super admins
      const superAdmins = this.userService
        .getAllUsers()
        .filter(u => u.role.includes('SUPER_ADMIN'));
    
      superAdmins.forEach(sa =>
        console.log(`Reported banned user ${targetUser.username} to SUPER_ADMIN ${sa.username}`)
      );
    
      alert(`Reported banned user ${targetUser.username} to SUPER_ADMIN`);
    
      return true;
    
  }

  createChannel(groupId: number, name: string): Channel | null {
    
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return null;

    if (!this.userService.isSuperAdmin(currentUser) &&
        !(this.userService.isGroupAdmin(currentUser) && currentUser.groups.includes(groupId))) {
      console.log("You dont have permission to create new channel")
      return null;
    }

    const newId = Math.max(...this.channels.map(c => c.id), 100) + 1;
    const newChannel = { id: newId, groupId, name, members: [], bannedUsers: [] };
    this.channels.push(newChannel);
    console.log("New channel has created: ", newChannel)
    return newChannel;
  }

  deleteChannel(channelId: number | string): boolean {
    const currentUser = this.userService.getCurrentUser();
    const id = Number(channelId); // convert to number
    const channel = this.getChannelById(id);

    console.log("deleteChannel called");

    if (!currentUser || !channel) return false;
  
    if (!this.userService.canManageGroup(currentUser, channel.groupId)) {
      console.log("You're not allowed to delete this channel");
      return false;
    }
  
    this.channels = this.channels.filter(c => c.id !== id);
    localStorage.setItem('channels', JSON.stringify(this.channels)); // persist changes
    console.log("Channel deleted:", channel);
    return true;
  }

}


