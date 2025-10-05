import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private API_URL = 'http://localhost:3000/api'; 
  currentUser: User | null = null;
  pendingRequests: { userId: string, groupId: number, username: string }[] = [];

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  // -------------- STORAGE -------------- //
  loadFromStorage() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      this.currentUser = JSON.parse(saved);
    }
  }

  saveToStorage(user: User) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUser = user;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      this.loadFromStorage(); // fallback if currentUser is null
    }
    return this.currentUser;
  }

  setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearPendingRequests() {
    this.pendingRequests = [];
  }

  // -------------- API CALLS -------------- //
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/users`);
  }

  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/users/${userId}`);
  }

  getUsersByGroup(groupId: number): Observable<User[]> {
    // ✅ Once your backend supports filtering by group, replace this with real endpoint
    return this.getAllUsers().pipe(
      map(users => users.filter(u => u.groups.includes(groupId)))
    );
  }


  // -------------- ROLE HELPERS -------------- //
  isSuperAdmin(user: User): boolean {
    return user.role.includes('SUPER_ADMIN');
  }

  isGroupAdmin(user: User): boolean {
    return user.role.includes('GROUP_ADMIN');
  }

  canManageGroup(user: User, groupId: number): boolean {
    return this.isSuperAdmin(user) || (this.isGroupAdmin(user) && user.groups.includes(groupId));
  }

  getAllSuperAdmins(): Observable<User[]> {
    return this.getAllUsers().pipe(
      map(users => users.filter(u => this.isSuperAdmin(u)))
    );
  }

  // -------------- GROUP OPERATIONS -------------- //
  leaveGroup(user: User, groupId: number) {
    user.groups = user.groups.filter(g => g !== groupId);
    if (this.currentUser?.id === user.id) {
      this.saveToStorage(user);
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

  removeUserFromGroup(user: User, groupId: number, admin: User) {
    if (!this.canManageGroup(admin, groupId)) return;
  
    return this.http.post(`${this.API_URL}/groups/${groupId}/users/${user.id}/remove`, {});
  }

  promoteUser(user: User, role: 'SUPER_ADMIN' | 'GROUP_ADMIN', groupId?: number): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.isSuperAdmin(currentUser)) return false;

    if (role === 'SUPER_ADMIN' && !user.role.includes('SUPER_ADMIN')) {
      user.role.push('SUPER_ADMIN');
    }
    if (role === 'GROUP_ADMIN') {
      if (!user.role.includes('GROUP_ADMIN')) user.role.push('GROUP_ADMIN');
      if (groupId && !user.groups.includes(groupId)) user.groups.push(groupId);
    }
    return true;
  }

  removeUser(user: User) {
    // In real app, delete via API
    if (this.currentUser?.id === user.id) this.logout();
  }
}
