import { Injectable, OnInit } from '@angular/core';
import { Group } from '../models/group.model';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class GroupService{

  private groups: Group[] = [];
  private nextId = 1;

  constructor(private userService: UserService) {
    const initialGroups = [
      'Group1 - Tulip',
      'Group2 - Calendula',
      'Group3 - Lavender',
      'Group4 - Lily',
      'Group5 - Marigold',
      'Group6 - Rose',
      'Group7 - Jasmine'
    ];

    initialGroups.forEach(name => {
      this.groups.push(new Group(this.nextId++, name, 'Super', []));
    });
  };

  // ---------------- HELPERS ---------------- //
  private currentUser() {
    return this.userService.getCurrentUser();
  }

  getAllGroups(): Group[] {
    return [...this.groups]; // return a copy
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

  createGroup(name: string): Group | null {
    const user = this.userService.getCurrentUser();
    if (!user){
      return null
    }

    if (!this.userService.isSuperAdmin(user) && !this.userService.isGroupAdmin(user)) {
      console.warn('Permission denied: Only group_admin or super_admin can create groups.');
      return null;
    }
  
    // Create new group
    const newGroup = new Group(this.nextId++, name, user.username);
    this.groups.push(newGroup);

    // If creator is a group admin, add them to this group
    if (this.userService.isGroupAdmin(user)) {
      if (!user.groups.includes(newGroup.id)) {
        user.groups.push(newGroup.id);
      }
    }

  // Add the new group to all super admins
  const superAdmins = this.userService.getAllSuperAdmins();
  superAdmins.forEach(sa => {
    if (!sa.groups.includes(newGroup.id)) {
      sa.groups.push(newGroup.id);
    }
  });

  return newGroup;
  };

  // GROUP_ADMIN or SUPER_ADMIN can modify the name of group
  modifyGroup(groupId: number, newName: string){

    const group = this.groups.find(g => g.id === groupId);
    if (!group) return false;
    
    if (!this.canManageGroup(group)) {
      console.error('You do not have permission to modify this group.');
      return false;
    }

    group.name = newName;
    console.log('Group modified:', group);
    return true;
  }

  deleteGroup(groupId: number): boolean {
    const groupIndex = this.groups.findIndex(g => g.id === groupId);

    if (groupIndex === -1) {
      return false;
    };

    const group = this.groups[groupIndex];
    if (!this.canManageGroup(group)) {
      console.warn('Permission denied: You cannot delete this group.');
      return false;
    }

    this.groups.splice(groupIndex, 1);
    console.log('Group deleted:', group);
    return true;
  }
  
}
