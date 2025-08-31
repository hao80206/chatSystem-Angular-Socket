import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  dummyUsers: User[] = [
    { id: '1', username: 'Alice', email: 'alice@mail.com', password: '123', role: ['USER'], groups: [1,2] },
    { id: '2', username: 'Bob', email: 'bob@mail.com', password: '123', role: ['GROUP_ADMIN'], groups: [2,3] },
    { id: '3', username: 'Super', email: 'super@mail.com', password: '123', role: ['SUPER_ADMIN'], groups: [1,2,3,4] }
  ];

// ----------- AUTHENTICATION ----------- //

  currentUser: User | null = null;

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

  leaveGroup(user: User, groupId: number) {
    user.groups = user.groups.filter(g => g !== groupId)
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
