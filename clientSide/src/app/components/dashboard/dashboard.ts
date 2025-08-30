import { Component, OnInit } from '@angular/core';
import { FormsModule} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, CommonModule, RouterModule, Navbar],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})

export class Dashboard implements OnInit {
  userGroups: any[] = [];
  groups = [
    {id: 1, name: 'Group1 - Tulip'},
    {id: 2, name: 'Group2 - Calendula'},
    {id: 3, name: 'Group3 - Lavender'},
    {id: 4, name: 'Group4 - Lily'},
    {id: 5, name: 'Group5 - Marigold'},
    {id: 6, name: 'Group6 - Rose'},
    {id: 7, name: 'Group7 - Jasmine'}
  ];

  constructor(public userService: UserService) { }

  ngOnInit(): void {
    const currentUser = this.userService.getCurrentUser();
    console.log('Current User:', currentUser);
  
    this.groups.forEach(group => {
      console.log('Group ID type:', typeof group.id, 'Value:', group.id);
    });
  
    if (currentUser) {
      this.userGroups = this.groups.filter(group => currentUser.groups.includes(group.id));
      console.log('Filtered Groups:', this.userGroups);
    }
  }

  getImageFile(groupName: string): string {
    // Example: "Group1-Tulip" → "tulip.png"
    const flower = groupName.split('-')[1]?.trim().toLowerCase() || 'default';
    return flower + '.png';
  }
}
