import { Component } from '@angular/core';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [Navbar, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  standalone: true,
})
export class Login {
  private readonly API = 'http://localhost:3000';

  constructor(
    private router: Router, 
    private userService: UserService,
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // LOGIN FUNCTION
  login(username: string, password: string) {
    if (!username.trim() || !password.trim()) {
      alert('Username and password are required!');
      return;
    }

    this.authService.login(username, password).subscribe({
      next: (user) => {
        console.log('Logged in as:', user);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.error || 'Invalid username or password');
      }
    });
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
        const loginSuccess = this.authService.login(username, password);
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
