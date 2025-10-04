import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import { SocketService } from '../../services/socket.service';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  standalone: true,
  imports: [Navbar, FormsModule, CommonModule, RouterLink, HttpClientModule],
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
  userGroups: Group[] = [];
  otherGroups: Group[] = [];
  pendingRequests: { userId: string; groupId: number }[] = [];
  newGroupName = '';
  private subs: Subscription[] = [];
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    public userService: UserService,
    private groupService: GroupService,
    private router: Router,
    private socketService: SocketService,
    private http: HttpClient,
    private authService: AuthService
  ) {

  }

  ngOnInit(): void {
    this.connectSocket();
    this.pendingRequests = this.userService.pendingRequests;

    // Subscribe to group changes
    const groupSub = this.groupService.getAllGroups().subscribe(groups => {
      const currentUser = this.authService.getCurrentUser(); // always fresh
      this.recomputeLists(groups, currentUser);
    });
    this.subs.push(groupSub);

  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private connectSocket() {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;

    (currentUser.groups || []).forEach(gid => {
      this.socketService.emit('joinGroup', { groupId: gid, userId: currentUser.id });
    });

    this.socketService.on('groupCreated', (group) => {
      this.groupService.addGroup(group);  //triggers BehaviorSubject, dashboard updates automatically
    });
  
   // Handle group deletion
    this.socketService.on('groupDeleted', (groupId: number) => {
      const currentUser = this.userService.getCurrentUser();
      this.groupService.getAllGroups().subscribe(groups => {
        this.recomputeLists(groups, currentUser);
      });
    });

    // Handle group modification
    this.socketService.on('groupModified', (group: Group) => {
      const currentUser = this.userService.getCurrentUser();
      this.groupService.getAllGroups().subscribe(groups => {
        this.recomputeLists(groups, currentUser);
      });
    });
  }

  private recomputeLists(groups: Group[], currentUser: User | null) {
      if (!currentUser) {
        this.userGroups = [];
        this.otherGroups = groups;
        return;
      }

      // SUPER_ADMIN: access to all groups, "other" section empty
      if (currentUser.role.includes('SUPER_ADMIN')) {
        this.userGroups = groups;
        this.otherGroups = [];
        return;
      }

      // GROUP_ADMIN: show only groups they manage in "My Groups"
      if (currentUser.role.includes('GROUP_ADMIN')) {
        this.userGroups = groups.filter(g => currentUser.groups.includes(g.id));
        this.otherGroups = groups.filter(g => !currentUser.groups.includes(g.id));
        return;
      }

      // Regular user
      this.userGroups = groups.filter(g => currentUser.groups.includes(g.id));
      this.otherGroups = groups.filter(g => !currentUser.groups.includes(g.id));
  }

  // ---------- Actions ---------- //

  requestJoinGroup(groupId: number) {
    const user = this.userService.getCurrentUser();
    if (!user) return alert('Login first');
  
    this.http.post(`${this.API_URL}/groups/${groupId}/join-requests`, { userId: user.id, groupId: groupId })
      .subscribe({
        next: () => {
          this.pendingRequests.push({ userId: user.id, groupId });
          this.socketService.emit('requestJoinGroup', { userId: user.id, groupId });
          alert("Request sent")
        },
        error: (err) => {
          console.error('Join request failed:', err);
          alert('You already sent request. Please wait for a moment');
        }
      });
  }

  leaveGroup(groupId: number) {
    const user = this.userService.getCurrentUser();
    if (!user) return;

    this.userService.leaveGroup(user, groupId); // remove locally
    const currentUser = this.userService.getCurrentUser();
    this.groupService.getAllGroups().subscribe(groups => {
      this.recomputeLists(groups, currentUser);
    });
    alert('You left the group successfully');
  }

  deleteAccount() {
    const user = this.userService.getCurrentUser();
    if (!user) return;
    if (!confirm('Are you sure you want to delete your account?')) return;
  
    this.http.delete(`${this.API_URL}/users/${user.id}`)
      .subscribe({
        next: () => {
          this.authService.logout();
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Failed to delete account:', err);
          alert('Failed to delete account');
        }
      });
  }

  createGroup() {
    const name = this.newGroupName.trim();
    if (!name) return;

    const user = this.userService.getCurrentUser();
    if (!user) return alert('Login first');
  
    const newGroup = this.groupService.createGroup(name);
    if (newGroup) {
      this.socketService.emit('groupCreated', newGroup); // emit full group including ID
      this.newGroupName = '';
    }
  }

  getImageFile(group: Group): string {
    if (group.id > 7) return 'defaultImg.png';
    const parts = group.name?.split('-');
    const flower = parts && parts[1] ? parts[1].trim().toLowerCase() : 'default';
    return flower + '.png';
  }

  // Check if current user is group admin of this group
  isGroupAdminOf(group: Group): boolean {
    const user = this.userService.getCurrentUser();
    if (!user) return false;
    return this.userService.isGroupAdmin(user) && user.groups.includes(group.id);
  }

  // Can the current user manage this group (modify/delete)?
  canManageGroup(group?: Group): boolean {
    const user = this.userService.getCurrentUser();
    if (!user) return false;
    if (!group) return this.userService.isSuperAdmin(user) || this.userService.isGroupAdmin(user);
    return this.userService.isSuperAdmin(user) || this.isGroupAdminOf(group);
  }

  // Delete group action
  onDeleteGroup(groupId: number) {
    const success = this.groupService.deleteGroup(groupId);

    if (success) {
      this.socketService.emit('groupDeleted', groupId);

      const currentUser = this.userService.getCurrentUser();
      this.groupService.getAllGroups().subscribe(groups => {
        this.recomputeLists(groups, currentUser);

      }); 
    } else {
      alert('Cannot delete this group (permission denied).');
    }
  }

  // Modify group action
  onModifyGroup(groupId: number) {
    const newName = prompt('Enter new group name:');
    if (!newName) return;

    const success = this.groupService.modifyGroup(groupId, newName);
    if (success) {
      this.socketService.emit('groupModified', this.groupService.getGroups().find(g => g.id === groupId));

      const currentUser = this.userService.getCurrentUser();
      this.groupService.getAllGroups().subscribe(groups => {
        this.recomputeLists(groups, currentUser);
      });
    } else {
      alert('Cannot modify this group (permission denied).');
    }
  }

}
