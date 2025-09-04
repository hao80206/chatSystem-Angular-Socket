import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar {

  constructor(private userService: UserService, private router:Router ) { }

  logout() {
    this.userService.logout();  //clear user data
    this.router.navigate(['/login']);  //redirect to login
    console.log('current user logOut')
  }
}
