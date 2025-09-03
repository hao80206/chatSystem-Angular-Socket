// dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Group } from '../../models/group.model';
import { UserService } from '../../services/user.service';
import { SocketService } from '../../services/socket.service';
import { Navbar } from '../navbar/navbar';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  standalone: true,
  imports: [Navbar, FormsModule, CommonModule,RouterLink, HttpClientModule],
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly API = 'http://localhost:3000';
  userGroups: Group[] = [];
  otherGroups: Group[] = [];
  allGroups: Group[] = [];
  newGroupName = '';

  constructor(
    public userService: UserService, 
    private http: HttpClient, 
    private router: Router,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    this.connectSocket();
    this.loadGroupsFromServer();
  }

  ngOnDestroy(): void {
    // Don't disconnect socket here as it's shared
  }

  private connectSocket() {
    const socket = this.socketService.connect();

    // events to keep dashboard live-updated
    this.registerSocketListeners();

    // Join user's groups
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && currentUser.groups) {
      (currentUser.groups || []).forEach((gid: number) => {
        this.socketService.emit('joinGroup', { groupId: gid, userId: currentUser.id });
      });
    }
  }

  private registerSocketListeners(): void {
    this.socketService.on('groupCreated', (group: Group) => {
      console.log('Group created event received:', group);
      // Add the new group to allGroups
      this.allGroups.push(group);
      
      // Check if current user should be automatically added to this group
      const currentUser = this.userService.getCurrentUser();
      if (currentUser) {
        // If user is SUPER_ADMIN or GROUP_ADMIN, they should be automatically added
        if (currentUser.role.includes('SUPER_ADMIN') || currentUser.role.includes('GROUP_ADMIN')) {
          if (!currentUser.groups.includes(group.id)) {
            currentUser.groups.push(group.id);
            console.log(`User ${currentUser.username} automatically added to new group ${group.id}`);
          }
        }
      }
      
      // Refresh the lists
      this.recomputeLists();
    });

    this.socketService.on('groupModified', (updatedGroup: Group) => {
      const idx = this.allGroups.findIndex(g => g.id === updatedGroup.id);
      if (idx !== -1) {
        this.allGroups[idx] = updatedGroup;
        this.recomputeLists();
      }
    });

    this.socketService.on('groupDeleted', (groupId: number) => {
      this.allGroups = this.allGroups.filter(g => g.id !== groupId);
      // Remove from user's groups as well
      const currentUser = this.userService.getCurrentUser();
      if (currentUser) {
        currentUser.groups = currentUser.groups.filter(g => g !== groupId);
      }
      this.recomputeLists();
    });

    this.socketService.on('userPromoted', (payload: { userId: string, role: string, groupId: number }) => {
      console.log('User promoted event received:', payload);
      const currentUser = this.userService.getCurrentUser();
      if (currentUser && currentUser.id === payload.userId) {
        // Update user's role and groups
        if (!currentUser.role.includes(payload.role)) {
          currentUser.role.push(payload.role);
        }
        if (!currentUser.groups.includes(payload.groupId)) {
          currentUser.groups.push(payload.groupId);
        }
        // Refresh the lists
        this.recomputeLists();
      }
    });

    this.socketService.on('userAddedToGroup', (payload: { userId: string, groupId: number }) => {
      console.log('User added to group event received:', payload);
      const currentUser = this.userService.getCurrentUser();
      if (currentUser && currentUser.id === payload.userId) {
        // Add user to the group if not already there
        if (!currentUser.groups.includes(payload.groupId)) {
          currentUser.groups.push(payload.groupId);
          console.log(`User ${currentUser.username} automatically added to group ${payload.groupId}`);
        }
        // Refresh the lists
        this.recomputeLists();
      }
    });
  }

  private loadGroupsFromServer(): void {
    this.http.get<Group[]>(`${this.API}/api/groups`).subscribe({
      next: groups => {
        this.allGroups = groups;
        this.recomputeLists();
      },
      error: err => {
        console.error('Failed to load groups from server, falling back to local groupService', err);
        // fallback to local groupService if you want:
        // this.allGroups = this.groupService.getGroups();
        this.recomputeLists();
      }
    });
  }

  private recomputeLists(): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      this.userGroups = [];
      this.otherGroups = this.allGroups.slice();
      return;
    }
    
    // Groups the user is already a member of
    this.userGroups = this.allGroups.filter(g => (currentUser.groups || []).includes(g.id));
    
    // Groups the user is NOT a member of (for "You May Like" section)
    this.otherGroups = this.allGroups.filter(g => !(currentUser.groups || []).includes(g.id));
    
    console.log('User groups:', this.userGroups.map(g => g.name));
    console.log('Other groups (You May Like):', this.otherGroups.map(g => g.name));
  }

  getImageFile(group: Group): string {
    if (group.id > 7) {
      return "defaultImg.png";
    }
    const parts = group.name?.split('-');
    const flower = parts && parts[1] ? parts[1].trim().toLowerCase() : 'default';
    return flower + '.png';
  }

  createGroup(name: string): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return alert('Login first');
    if (!name || !name.trim()) return alert('Group name cannot be empty');
    const payload = { name, createdBy: currentUser.username };
    this.http.post(`${this.API}/api/groups`, payload).subscribe({
      next: (group: any) => {
        // Server will emit groupCreated event, no need to manually add
        this.newGroupName = '';
      },
      error: err => console.error('Create group failed', err)
    });
  }

  onModifyGroup(groupId: number): void {
    const newName = prompt('Enter new group name:');
    if (!newName || !newName.trim()) return;
    this.http.put(`${this.API}/api/groups/${groupId}`, { name: newName }).subscribe({
      next: (updatedGroup: any) => {
        // Server will emit groupModified event, no need to manually update
      },
      error: err => console.error('Modify group failed', err)
    });
  }

  onDeleteGroup(groupId: number): void {
    if (!confirm('Are you sure you want to delete this group? This will remove all its channels and membership.')) return;
    this.http.delete(`${this.API}/api/groups/${groupId}`).subscribe({
      next: () => {
        // Server will emit groupDeleted event, no need to manually remove
      },
      error: err => console.error('Delete group failed', err)
    });
  }

  // Register/request to join a group (socket + REST)
  joinGroupRequest(groupId: number): void {
    console.log('joinGroupRequest called with groupId:', groupId, 'from:', new Error().stack);
    
    const user = this.userService.getCurrentUser();
    if (!user) {
      console.log('No user found, returning');
      return alert('Login first');
    }
    
    // Check if user is already in this group
    if (user.groups && user.groups.includes(groupId)) {
      console.log('User already in group, skipping join request');
      return;
    }
    
    console.log('Sending join request for user:', user.username, 'to group:', groupId);
    this.socketService.emit('requestJoinGroup', { userId: user.id, groupId });
    
    // Optional REST call to persist the request as well
    this.http.post(`${this.API}/api/groups/${groupId}/join-requests`, { userId: user.id }).subscribe({
      next: () => console.log('Join request recorded via REST'),
      error: (err) => {
        console.error('Join request REST failed:', err);
        if (err.status === 400 && err.error?.error === 'Join request already exists') {
          console.log('Join request already exists, this is expected');
          // Don't show error to user, this is normal
        } else {
          console.log('Join request REST failed (socket used)');
        }
      }
    });
  }

  leaveGroup(groupId: number): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;
    // Remove locally and request server update if you want; here we remove locally
    currentUser.groups = (currentUser.groups || []).filter((id: number) => id !== groupId);
    this.recomputeLists();
    // Optionally persist (you'd add a server route for leave-group if required)
  }

  deleteAccount(): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    this.http.delete(`${this.API}/api/users/${currentUser.id}`).subscribe({
      next: () => {
        // clear client-side login and navigate to login
        this.userService.logout(); // make sure userService.logout clears localStorage
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Delete account failed', err);
        alert('Failed to delete account on server');
      }
    });
  }

  // Helpers used by template
  isGroupAdminOf(group: Group): boolean {
    const u = this.userService.getCurrentUser();
    return !!u && u.role.includes('GROUP_ADMIN') && (u.groups || []).includes(group.id);
  }

  canManageGroup(): boolean {
    const u = this.userService.getCurrentUser();
    return !!u && (u.role.includes('GROUP_ADMIN') || u.role.includes('SUPER_ADMIN'));
  }

  // Handle join request approvals
  approveRequest(request: { userId: string, groupId: number }): void {
    console.log('Approving request:', request);
    this.socketService.emit('approveJoinRequest', request);
    // Remove from pending list
    this.pendingRequests = this.pendingRequests.filter(r => 
      !(r.userId === request.userId && r.groupId === request.groupId)
    );
  }

  rejectRequest(request: { userId: string, groupId: number }): void {
    console.log('Rejecting request:', request);
    this.socketService.emit('rejectJoinRequest', request);
    // Remove from pending list
    this.pendingRequests = this.pendingRequests.filter(r => 
      !(r.userId === request.userId && r.groupId === request.groupId)
    );
  }
}
