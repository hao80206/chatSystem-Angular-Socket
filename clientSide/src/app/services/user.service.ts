import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

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
  pendingRequests: { userId: string, groupId: number, username: string}[] = [];

  constructor() {
    const saved = localStorage.getItem('currentUser'); 
    if (saved) {
      this.currentUser = JSON.parse(saved);
    }
  }

  // ----------- AUTHENTICATION ----------- //
  login(username: string, password: string): boolean {
    const user = this.dummyUsers.find(u => u.username === username && u.password === password);
    if (user) {
      this.currentUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getUserById(userId: string): User | undefined {
    return this.getAllUsers().find(u => u.id === userId);
  }

  getAllUsers(): User[] {
    return this.dummyUsers;
  }

  getAllSuperAdmins(): User[] {
    return this.dummyUsers.filter(u => u.role.includes('SUPER_ADMIN'));
  }

  createUser(newUser: User): boolean {
    const exist = this.dummyUsers.some(u => u.username === newUser.username);
    if (!exist) {
      this.dummyUsers.push(newUser);
      return true;
    }
    console.error("Username must be unique");
    return false;
  }

  deleteSelf(user: User) {
    this.dummyUsers = this.dummyUsers.filter(u => u.id !== user.id);
    if (this.currentUser?.id === user.id) this.logout();
  }

  leaveGroup(user: User, groupId: number) {
    user.groups = user.groups.filter(g => g !== groupId);
  }

  registerNewGroup(user: User, groupId: number): boolean {
    if (user.groups.includes(groupId)) return false;
    const exists = this.pendingRequests.some(r => r.userId === user.id && r.groupId === groupId);
    if (exists) {
      alert("User already requested to join this group. Please wait.");
      return false;
    }
    this.pendingRequests.push({ userId: user.id, groupId, username: user.username });
    alert("New group registration request submitted!");
    return true;
  }

  // ----------- GROUP MANAGEMENT ----------- //
  isSuperAdmin(user: User): boolean {
    return user.role.includes('SUPER_ADMIN');
  }

  isGroupAdmin(user: User): boolean {
    return user.role.includes('GROUP_ADMIN');
  }

  canManageGroup(user: User, groupId: number): boolean {
    return this.isSuperAdmin(user) || (this.isGroupAdmin(user) && user.groups.includes(groupId));
  }

  getUsersByGroup(groupId: number): User[] {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];

    if (this.isSuperAdmin(currentUser) || (this.isGroupAdmin(currentUser) && currentUser.groups.includes(groupId))) {
      return this.dummyUsers.filter(u => u.groups.includes(groupId));
    }
    return [];
  }

  removeUserFromGroup(user: User, groupId: number, admin: User) {
    if (this.canManageGroup(admin, groupId)) {
      user.groups = user.groups.filter(g => g !== groupId);
    }
  }

  letUserJoinGroup(user: User, groupId: number, admin: User): boolean {
    if (!this.canManageGroup(admin, groupId)) return false;
    const reqIndex = this.pendingRequests.findIndex(r => r.userId === user.id && r.groupId === groupId);
    if (reqIndex === -1) return false;
    user.groups.push(groupId);
    this.pendingRequests.splice(reqIndex, 1);
    return true;
  }

  createGroup(groupId: number, user: User) {
    if (!user.groups.includes(groupId)) user.groups.push(groupId);
    if (!user.role.includes('GROUP_ADMIN')) user.role.push('GROUP_ADMIN');
  }

  removeGroup(groupId: number, admin: User) {
    if (this.isGroupAdmin(admin) && admin.groups.includes(groupId)) {
      this.dummyUsers.forEach(u => {
        u.groups = u.groups.filter(g => g !== groupId);
      });
    }
  }

  // ----------- SUPER ADMIN ----------- //
  promoteUser(user: User, role: 'SUPER_ADMIN' | 'GROUP_ADMIN', groupId?: number) {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.isSuperAdmin(currentUser)) return false;

    if (role === 'SUPER_ADMIN' && !user.role.includes('SUPER_ADMIN')) user.role.push('SUPER_ADMIN');
    if (role === 'GROUP_ADMIN') {
      if (!user.role.includes('GROUP_ADMIN')) user.role.push('GROUP_ADMIN');
      if (groupId && !user.groups.includes(groupId)) user.groups.push(groupId);
    }
    return true;
  }

  removeUser(user: User) {
    this.dummyUsers = this.dummyUsers.filter(u => u.id !== user.id);
    if (this.currentUser?.id === user.id) this.logout();
  }
}
