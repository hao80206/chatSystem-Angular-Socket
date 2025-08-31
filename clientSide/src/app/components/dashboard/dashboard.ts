import { Component, OnInit } from '@angular/core';
import { FormsModule} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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

  constructor(public userService: UserService, public groupService: GroupService) { }

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

  getImageFile(groupName: string): string {
    // Example: "Group1-Tulip" → "tulip.png"
    const flower = groupName.split('-')[1]?.trim().toLowerCase() || 'default';
    return flower + '.png';
  }

  // check if current user is GROUP_ADMIN for a specific group
  isGroupAdminOf(group: Group): boolean {
    const u = this.userService.getCurrentUser();
    return !!u && u.role.includes('GROUP_ADMIN') && u.groups.includes(group.id);
  }

  // check if user is SUPER_ADMIN or GROUP_ADMIN (global helper)
  canCreateGroup(): boolean {
    const u = this.userService.getCurrentUser();
    return !!u && (u.role.includes('GROUP_ADMIN') || u.role.includes('SUPER_ADMIN'));
  }

  createGroup(name: string): void {

    if (!name.trim()) {
      alert("Group name cannot be empty!");
      return;
    }

    const newGroup = this.groupService.createGroup(name);
    if (newGroup) {
      console.log('Group created:', newGroup);
    } else {
      console.warn('Failed to create group.');
    }
  }
}
