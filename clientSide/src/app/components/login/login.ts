import { Component } from '@angular/core';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [Navbar, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  constructor(private router: Router,private userService: UserService) { }

  // LOGIN FUNCTION
  login(username: string, password: string) {
    if (!username.trim() || !password.trim()) {
      alert('Username and password are required!');
      return;
    }

    const success = this.userService.login(username, password);
    if (success) {
      console.log('Logged in as:', this.userService.getCurrentUser());
      this.router.navigate(['/dashboard']);
    } else {
      alert('Invalid username or password');
    }
  }

  // REGISTER FUNCTION
  register(username: string, email: string, password: string) {

    if (!username.trim() || !email.trim() || !password.trim()) {
      alert('All fields are required!');
      return;
    }

    const newUser: User = {
      id: (this.userService.dummyUsers.length + 1).toString(),
      username,
      email,
      password,
      role: ['USER'],
      groups: []
    };

    const success = this.userService.createUser(newUser);
    if (success) {
      alert('Account created successfully!');
      // Optionally auto-login after register
      this.userService.login(username, password);
      this.router.navigate(['/dashboard']);
    } else {
      alert('Username already exists. Choose a different one.');
    }
  }

}
