import { Component, OnInit } from '@angular/core';
import { FormsModule} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { UserService } from '../../services/user.service';
import { Group } from '../../models/group.model';
import { GroupService } from '../../services/group.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, CommonModule, RouterModule, Navbar],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})

export class Dashboard implements OnInit {

  userGroups: Group[] = [];
  otherGroups: Group[] = [];
  allGroups: Group[] = [];

  showCreateForm = false;
  newGroupName = '';

  constructor(public userService: UserService, public groupService: GroupService, public router: Router) { }

  ngOnInit(): void {
    const currentUser = this.userService.getCurrentUser();
    this.allGroups = this.groupService.getGroups();

    if (currentUser) {
      // Groups the user belongs to
      this.userGroups = this.allGroups.filter(group => currentUser.groups.includes(group.id));
      console.log(this.userGroups)

      // Groups the user does NOT belong to
      this.otherGroups = this.allGroups.filter(group => !currentUser.groups.includes(group.id));
      console.log(this.otherGroups)
    }
  }

  getImageFile(group: Group): string {

   // If group was created later, fallback to default
  if (group.id > 7) {
    return "defaultImg.png";
  }

  // Otherwise, parse the name like "Group1-Tulip"
  const parts = group.name?.split('-');
  const flower = parts && parts[1] ? parts[1].trim().toLowerCase() : 'default';
  return flower + '.png';
  }

  registerGroup(groupId: number): void {
    const currentUser = this.userService.getCurrentUser();
  
    if (!currentUser) {
      console.error("No current user found.");
      return;
    }
  
    const success = this.userService.registerNewGroup(currentUser, groupId);
  
    if (success) {
      console.log("Successfully requested to join group:", groupId);
    } else {
      console.log("Could not register for group:", groupId);
    }
  }

  // Delete the logged-in user account
  deleteAccount() {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;

    if (confirm("Are you sure you want to delete your account?")) {
      this.userService.deleteSelf(currentUser);

      // Navigate to login/register page
      this.router.navigate(['/login']);
    }
  }

  leaveGroup(groupId: number) {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;
  
    this.userService.leaveGroup(currentUser, groupId);
  
    // Refresh the local userGroups array
    this.userGroups = this.userGroups.filter(g => g.id !== groupId);
    console.log('Left group:', groupId);
  }


  // check if current user is GROUP_ADMIN for a specific group
  isGroupAdminOf(group: Group): boolean {
    const u = this.userService.getCurrentUser();
    return !!u && u.role.includes('GROUP_ADMIN') && u.groups.includes(group.id);
  }

  // check if user is SUPER_ADMIN or GROUP_ADMIN (global helper)
  canManageGroup(): boolean {
    const u = this.userService.getCurrentUser();
    return !!u && (u.role.includes('GROUP_ADMIN') || u.role.includes('SUPER_ADMIN'));
  }

  // -------ONLY ADMIN GROUP CAN ACCESS THOSE FUNCTIONS -------//

  createGroup(name: string): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;

    if (!name.trim()) {
      alert("Group name cannot be empty!");
      return;
    }

    const newGroup = this.groupService.createGroup(name);
    if (!newGroup) {
      console.warn('Failed to create group.');
      return;
    }
  
    console.log('Group created:', newGroup);
  
    // If current user is GROUP_ADMIN, automatically add them to the new group
    if (currentUser.role.includes('GROUP_ADMIN') && !currentUser.groups.includes(newGroup.id)) {
      currentUser.groups.push(newGroup.id);
    }
  
    // Refresh dashboard lists
    this.allGroups = this.groupService.getGroups();
  
    this.userGroups = this.allGroups.filter(group =>
      currentUser.role.includes('SUPER_ADMIN') || currentUser.groups.includes(group.id)
    );
  
    this.otherGroups = !currentUser.role.includes('SUPER_ADMIN')
      ? this.allGroups.filter(group => !currentUser.groups.includes(group.id))
      : []; // Super Admin sees no "You may like" section
  }

  onDeleteGroup(groupId: number): void {
    if (this.groupService.deleteGroup(groupId)) {
      this.userGroups = this.userGroups.filter(g => g.id !== groupId);
      console.log('Group deleted:', groupId);
    }
  }

  onModifyGroup(groupId: number): void {
    const newName = prompt('Enter new group name:');
    if (newName && this.groupService.modifyGroup(groupId, newName)) {
      // Refresh local userGroups to show updated name
      this.userGroups = this.groupService.getAllGroups();
      console.log('Group modified:', groupId, newName);
    }
  }

}
