import { Component } from '@angular/core';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-login',
  imports: [Navbar],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  username = '';
  password = '';

  constructor(private router: Router,private userService: UserService) { }

  login(username:string, password: string) {
    const success = this.userService.login(username, password);
    if (success) {
      console.log('Logged in as:', this.userService.getCurrentUser());
      this.router.navigate(['/dashboard']);
    } else {
      alert('Invalid username or password');
    }
  }

}
