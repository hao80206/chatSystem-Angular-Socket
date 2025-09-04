import { Component } from '@angular/core';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [Navbar, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  private readonly API = 'http://localhost:3000';

  constructor(
    private router: Router, 
    private userService: UserService,
    private http: HttpClient
  ) { }

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
    console.log('Register function called with:', { username, email, password });

    if (!username.trim() || !email.trim() || !password.trim()) {
      alert('All fields are required!');
      return;
    }

    // Call the server register API
    this.http.post(`${this.API}/api/register`, { username, email, password }).subscribe({
      next: (response: any) => {
        console.log('Registration successful:', response);
        
        // Create the user in the local user service
        const newUser: User = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          password: password, // Keep password for login
          role: response.user.role,
          groups: response.user.groups
        };
        
        // Add user to local service
        this.userService.createUser(newUser);
        
        // Login the user
        const loginSuccess = this.userService.login(username, password);
        if (loginSuccess) {
          alert('Account created successfully! You are now pending admin approval for all groups.');
          this.router.navigate(['/dashboard']);
        } else {
          alert('Account created but login failed. Please try logging in manually.');
        }
      },
      error: (error) => {
        console.error('Registration failed:', error);
        if (error.status === 400) {
          alert(error.error.error || 'Registration failed');
        } else {
          alert('Registration failed. Please try again.');
        }
      }
    });
  }
}
