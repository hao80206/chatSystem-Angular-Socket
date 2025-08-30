import { Component } from '@angular/core';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-login',
  imports: [Navbar],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  currentUser!: User;
  constructor(private router: Router) { }

  // Dummy users
  dummyUsers: User[] = [
    new User('1', 'Alice', 'alice@example.com','123', 'user', [1, 3]),           // Normal user
    new User('2', 'Bob', 'bob@example.com','123', 'group_admin', [2, 4]),        // Group Admin
    new User('3', 'Charlie', 'charlie@example.com','123', 'super_admin', [1,2,3,4,5,6,7]) // Super Admin
  ];

  login(username:string, password: string) {
    // Find user by username from dummy data
    const user = this.dummyUsers.find(u => u.username == username && u.password === password);
    if (user) {
      this.currentUser = user;
      console.log('Logged in as:', this.currentUser);
      // redirect to dashboard
      this.router.navigate(['/dashboard']);
    } else {
      alert('Invalid username or password');
    }
  }

}
