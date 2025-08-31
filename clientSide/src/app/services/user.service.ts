import { Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { ChannelService } from './channel.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  dummyUsers: User[] = [
    { id: '1', username: 'Alice', email: 'alice@mail.com', password: '123', role: ['USER'], groups: [1,2,5,7] },
    { id: '2', username: 'Bob', email: 'bob@mail.com', password: '123', role: ['USER'], groups: [2,3,6,7] },
    { id: '3', username: 'Kevin', email: 'kevin@mail.com', password: '123', role: ['USER'], groups: [1,4,6,7] },
    { id: '4', username: 'Taylor', email: 'taylor@mail.com', password: '123', role: ['USER'], groups: [1,2,3,4] },
    { id: '5', username: 'Stella', email: 'stella@mail.com', password: '123', role: ['GROUP_ADMIN'], groups: [1,3,4]},
    { id: '6', username: 'Super', email: 'super@mail.com', password: '123', role: ['SUPER_ADMIN'], groups: [1,2,3,4,5,6,7] },

  ];

  currentUser: User | null = null;
  pendingGroupRequests: { userId: string, groupId: number }[] = [];

// ----------- AUTHENTICATION ----------- //

  login(username: string, password: string): boolean {
    const user = this.dummyUsers.find(u => u.username === username && u.password === password);
    if (user) {
      this.currentUser = user;
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

// ------------- CHAT USER ------------- //
  createUser(newUser: User) {
    const exist = this.dummyUsers.some(u => u.username === newUser.username)
    if (!exist) {
      this.dummyUsers.push(newUser);
      return true;
    }
      console.error("username must be unique");
      return false
  };

  joinChannel(user: User, channelId: number, channelService: ChannelService): boolean {
    return channelService.joinChannel(user, channelId);
  }

  leaveGroup(user: User, groupId: number) {
    user.groups = user.groups.filter(g => g !== groupId)
  }

  // Register interest for a group
  registerNewGroup(user: User, groupId: number): boolean {
    if (user.groups.includes(groupId)) return false; // already a member

    const exists = this.pendingGroupRequests.some(r => r.userId === user.id && r.groupId === groupId);

    if (exists) return false; 

    this.pendingGroupRequests.push({ userId: user.id, groupId });
    console.log("already requested")
    return true;
  }

  deleteSelf(user: User) {
    this.dummyUsers = this.dummyUsers.filter(u => u.id !== user.id);
    if (this.currentUser?.id === user.id) {
      this.logout();
    }
  }


// ----------- BOTH SUPER AND GROUP ADMINISTRATOR ----------- //

  createGroup(groupId: number, user: User) {
    // Assign the group to the user as admin
    if (!user.groups.includes(groupId)) {
      user.groups.push(groupId)
    };
    if (!user.role.includes('GROUP_ADMIN')) {
      user.role.push('GROUP_ADMIN')
    }
  }

  removeGroup(groupId: number, admin: User) {
    if (admin.role.includes('GROUP_ADMIN') && admin.groups.includes(groupId)) {
      // Remove this group from all users
      this.dummyUsers.forEach(u => {
        u.groups = u.groups.filter(g => g !== groupId);
      });
    }
  }

  removeUserFromGroup(user: User, groupId: number, admin: User) {
    if (admin.role.includes('GROUP_ADMIN') && admin.groups.includes(groupId)) {
      user.groups = user.groups.filter(g => g !== groupId);
    }
  }

  letUserJoinGroup(user: User, groupId: number, admin: User): boolean {
    if (!this.isGroupAdmin(admin) && !this.isSuperAdmin(admin)) return false;

    const reqIndex = this.pendingGroupRequests.findIndex(r => r.userId === user.id && r.groupId === groupId);
    if (reqIndex === -1) return false;

    user.groups.push(groupId);
    this.pendingGroupRequests.splice(reqIndex, 1);
    return true;
  }

  // ----------- SUPER ADMINISTRATOR ----------- //
  promoteToGroupAdmin(user: User, groupId: number) {
    if (!user.role.includes('GROUP_ADMIN')) {
      user.role.push('GROUP_ADMIN')
    };
    if (!user.groups.includes(groupId)) {
      user.groups.push(groupId)
    };
  }

  removeUser(user: User) {
    this.dummyUsers = this.dummyUsers.filter(u => u.id !== user.id);
    if (this.currentUser?.id === user.id) this.logout();
  }

  upgradeToSuper(user: User) {
    if (!user.role.includes('SUPER_ADMIN')) user.role.push('SUPER_ADMIN');
  }

  // -------- Helpers -------- //
  getAllUsers(): User[] {
    return this.dummyUsers;
  }

  isSuperAdmin(u: User | null): boolean {
    return !!u && u.role.includes('SUPER_ADMIN');
  }

  isGroupAdmin(u: User | null): boolean {
    return !!u && u.role.includes('GROUP_ADMIN');
  }

  // Can this user manage a given group? (SUPER can manage all, GROUP_ADMIN only their groups)
  private canManageGroup(u: User | null, groupId: number): boolean {
    if (!u) return false;
    if (u.role.includes('SUPER_ADMIN')) return true;
    return u.role.includes('GROUP_ADMIN') && u.groups.includes(groupId);
  }
}
