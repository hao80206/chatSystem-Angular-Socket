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
      this.groups.push(new Group(this.nextId++, name, 'system', []));
    });
  };

  // ---------------- HELPERS ---------------- //
  private currentUser() {
    return this.userService.getCurrentUser();
  }

  private canManageGroup(group: Group): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return this.userService.isSuperAdmin(user) || 
           (this.userService.isGroupAdmin(user) && group.createdBy === user.username);
  }

  getGroups(): Group[] {
    return this.groups;
  }

  createGroup(name: string): Group | null {
    const user = this.userService.getCurrentUser();
    if (!user){
      return null
    }

    if(this.userService.isSuperAdmin(user) || this.userService.isGroupAdmin(user)) {
      const newGroup = new Group(this.nextId++, name, user.username);
      this.groups.push(newGroup);
      return newGroup;
    }

    console.warn('Permission denied: Only group_admin or super_admin can create groups.');
    return null;
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

    console.warn('Permission denied: You cannot delete this group.');
    return false;

  }
  
}
