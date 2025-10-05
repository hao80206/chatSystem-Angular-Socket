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
    public authService: AuthService
  ) {

  }

  ngOnInit(): void {
    this.userService.getAllUsers().subscribe();
    this.connectSocket();

    const currentUser = this.userService.getCurrentUser();
    this.pendingRequests = this.userService.pendingRequests.filter(r => r.userId === currentUser?.id);

    const groupSub = this.groupService.getAllGroups().subscribe(groups => {
      const currentUser = this.authService.getCurrentUser();
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

    if (currentUser.role.includes('SUPER_ADMIN')) {
      // SuperAdmin sees all groups as "userGroups"
      this.userGroups = groups;
      this.otherGroups = [];
      return;
    }

    if (currentUser.role.includes('GROUP_ADMIN')) {
      // GROUP_ADMIN sees only groups they belong to
      this.userGroups = groups.filter(g => currentUser.groups.includes(g.id));
      // otherGroups are groups they do NOT belong to
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
  
    interface JoinRequest {
      userId: string;
      groupId: number;
    }
  
    // Step 1: Check backend if a join request already exists
    this.http.get<JoinRequest[]>(`${this.API_URL}/groups/${groupId}/join-requests`).subscribe({
      next: (requests) => {
        const alreadyRequested = requests.some(r => r.userId === user.id);
        if (alreadyRequested) {
          alert('You already sent request. Please wait for a moment');
          return;
        }
  
        // Step 2: Send the join request
        this.http.post<JoinRequest>(`${this.API_URL}/groups/${groupId}/join-requests`, { userId: user.id, groupId })
          .subscribe({
            next: (newRequest) => {
              this.pendingRequests.push({ userId: user.id, groupId });
              this.socketService.emit('requestJoinGroup', { userId: user.id, groupId });
              alert("Request sent");
            },
            error: (err) => {
              console.error('Join request failed:', err);
              alert('Failed to send join request. Please try again.');
            }
          });
      },
      error: (err) => {
        console.error('Failed to check existing requests:', err);
        alert('Cannot check join requests. Please try again.');
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
  
    this.groupService.createGroup(name)?.subscribe({
      next: (createdGroup) => {
        this.socketService.emit('groupCreated', createdGroup); // emit full group including ID
        this.newGroupName = '';
        alert('Group created successfully!');
      },
      error: (err) => {
        console.error('Failed to create group:', err);
        alert('Failed to create group. Please try again.');
      }
    });
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
    const request$ = this.groupService.deleteGroup(groupId);

    if (request$) {
      request$.subscribe({
        next: () => {
          this.socketService.emit('groupDeleted', groupId);

          const currentUser = this.userService.getCurrentUser();
          this.groupService.getAllGroups().subscribe(groups => {
            this.recomputeLists(groups, currentUser);
          });
        },
        error: err => {
          console.error('Failed to delete group:', err);
          alert('Failed to delete group');
        }
      });
    } else {
      alert('Cannot delete this group (permission denied).');
    }
  }

  // Modify group action
  onModifyGroup(groupId: number) {
    const newName = prompt('Enter new group name:');
    if (!newName) return;

    const request$ = this.groupService.modifyGroup(groupId, newName);

    if (request$) {
      request$.subscribe({
        next: updatedGroup => {
          this.socketService.emit('groupModified', updatedGroup);

          const currentUser = this.userService.getCurrentUser();
          this.groupService.getAllGroups().subscribe(groups => {
            this.recomputeLists(groups, currentUser);
          });
        },
        error: err => {
          console.error('Failed to modify group:', err);
          alert('Failed to modify group');
        }
      });
    } else {
      alert('Cannot modify this group (permission denied).');
    }
  }

}
