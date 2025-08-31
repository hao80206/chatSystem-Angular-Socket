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
  constructor(public userService: UserService, public groupService: GroupService) { }

  ngOnInit(): void {
    const currentUser = this.userService.getCurrentUser();
    const allGroups = this.groupService.getGroups();

    if (currentUser) {
      this.userGroups = allGroups.filter(group =>
        currentUser.groups.includes(group.id)
      );
    }
  }

  getImageFile(groupName: string): string {
    // Example: "Group1-Tulip" → "tulip.png"
    const flower = groupName.split('-')[1]?.trim().toLowerCase() || 'default';
    return flower + '.png';
  }
}
