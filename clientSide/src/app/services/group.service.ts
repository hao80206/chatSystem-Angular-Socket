import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Group } from '../models/group.model';
import { UserService } from './user.service';
import { SocketService } from './socket.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GroupService{

  private groups: Group[] = [];
  private groups$ = new BehaviorSubject<Group[]>([]);
  private API_URL = 'http://localhost:3000/api/groups'; 

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private socketService: SocketService
  ) {
    // Load groups from the server on service init
    this.loadGroups();

    // 🔑 Listen for new groups from the server
    this.socketService.on('groupCreated', (group: Group) => {
      console.log("New group received via socket:", group);
      this.addGroup(group);
    });
  }

  // ---------------- HELPERS ---------------- //
  private currentUser() {
    return this.userService.getCurrentUser();
  }

  loadGroups(): void {
    this.http.get<Group[]>(this.API_URL).subscribe({
      next: (groups) => {
        this.groups = groups;
        this.groups$.next([...this.groups]);
      },
      error: (err) => {
        console.error('Failed to load groups from server', err);
      }
    });
  }

  getAllGroups() {
    return this.groups$.asObservable(); // components subscribe to this
  }

  addGroup(group: Group) {
    if (!this.groups.find(g => g.id === group.id)) {
      this.groups.push(group);
      this.groups$.next([...this.groups]); // notify subscribers
    }
  }

  private canManageGroup(group: Group): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return this.userService.isSuperAdmin(user) || 
           (this.userService.isGroupAdmin(user));
  }

  getGroups(): Group[] {
    return this.groups;
  }

  createGroup(name: string): Observable<Group> | null {
    const user = this.userService.getCurrentUser();
    if (!user) return null;
  
    if (!this.userService.isSuperAdmin(user) && !this.userService.isGroupAdmin(user)) {
      console.warn('Permission denied: Only group_admin or super_admin can create groups.');
      return null;
    }
  
    const newGroupData = { name, createdBy: user.username }; // backend expects 'createdBy'
  
    return this.http.post<Group>(this.API_URL, newGroupData).pipe(
      tap((createdGroup) => {
        this.addGroup(createdGroup); // adds group to local group list
  
        // Update user's groups locally
        if (!user.groups.includes(createdGroup.id)) {
          user.groups.push(createdGroup.id);
        }
        if (!user.role.includes('GROUP_ADMIN')) {
          user.role.push('GROUP_ADMIN');
        }
        this.userService.setCurrentUser(user); // save updated user locally
      })
    );
  }

  // GROUP_ADMIN or SUPER_ADMIN can modify the name of group
  modifyGroup(groupId: number, newName: string): Observable<Group> | null {
    const group = this.groups.find(g => g.id === groupId);
    if (!group || !this.canManageGroup(group)) {
      console.error('You do not have permission to modify this group.');
      return null;
    }
  
    return this.http.put<Group>(`${this.API_URL}/${groupId}`, { name: newName }).pipe(
      tap(updatedGroup => {
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
          this.groups[index] = updatedGroup;
          this.groups$.next([...this.groups]);
        }
        console.log('Group modified on server:', updatedGroup);
      })
    );
  }

  deleteGroup(groupId: number): Observable<void> | null {
    const group = this.groups.find(g => g.id === groupId);
    if (!group || !this.canManageGroup(group)) {
      console.warn('Permission denied: You cannot delete this group.');
      return null;
    }
  
    return this.http.delete<void>(`${this.API_URL}/${groupId}`).pipe(
      tap(() => {
        this.groups = this.groups.filter(g => g.id !== groupId);
        this.groups$.next([...this.groups]);
        console.log('Group deleted on server, removed locally');
      })
    );
  }


  
}
