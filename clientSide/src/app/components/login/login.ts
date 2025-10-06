import { Component } from '@angular/core';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [Navbar, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  standalone: true,
})
export class Login {
  private readonly API = 'http://localhost:3000';

  icons: string[] = [
    '/assets/Icons/woman-img-1.png',
    '/assets/Icons/woman-img-2.png',
    '/assets/Icons/woman-img-3.png',
    '/assets/Icons/woman-img-4.png',
    '/assets/Icons/man-img-1.png',
    '/assets/Icons/man-img-2.png',
    '/assets/Icons/man-img-3.png',
  ];

  selectedIcon: string = this.icons[0]; // default

  constructor(
    private router: Router, 
    private userService: UserService,
    private http: HttpClient,
    private authService: AuthService
  ) { }

  selectIcon(icon: string) {
    this.selectedIcon = icon;
  }

  // LOGIN FUNCTION
  login(username: string, password: string) {
    if (!username.trim() || !password.trim()) {
      alert('Username and password are required!');
      return;
    }

    this.authService.login(username, password).subscribe({
      next: (user) => {
        console.log('Logged in as:', user);
    
        // Update UserService
        this.userService.setCurrentUser(user);
        this.userService.clearPendingRequests();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.error || 'Invalid username or password');
      }
    });
  }

  // REGISTER FUNCTION
  register(username: string, email: string, password: string, icon: string) {
    console.log('Register function called with:', { username, email, password, icon });

    if (!username.trim() || !email.trim() || !password.trim()) {
      alert('All fields are required!');
      return;
    }

    // Call the server register API
    this.http.post(`${this.API}/api/register`, { username, email, password, profileImg: icon }).subscribe({
      next: (response: any) => {
        console.log('Registration successful:', response);
        
        this.authService.login(username, password).subscribe({
          next: (loginResponse) => {
            alert('Account created successfully!');
            this.userService.clearPendingRequests();
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            console.error('Auto-login failed:', err);
            alert('Account created but login failed. Please log in manually.');
          }
        });
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
