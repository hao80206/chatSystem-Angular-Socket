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
      return false //username must be unique
  };

  joinGroup(user: User, groupId: number) {
    if (!user.groups.includes(groupId)) {
      user.groups.push(groupId);
    }
  }

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

//promote chat user to GROUP_ADMIN
  promoteToGroupAdmin(user: User, groupId: number) {
    if (!user.role.includes('GROUP_ADMIN')) {
      user.role.push('GROUP_ADMIN');
    }
    if (!user.groups.includes(groupId)) {
      user.groups.push(groupId);
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

  reportToSuper(){

  }

  //promote chat user to SUPER_ADMIN
  upgradeToSuper(user: User) {
    if (!user.role.includes('SUPER_ADMIN')) user.role.push('SUPER_ADMIN');
  }

  // ----------- SUPER ADMINISTRATOR ----------- //
  


}
