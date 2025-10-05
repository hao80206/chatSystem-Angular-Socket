import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private API_URL = 'http://localhost:3000/api';
  private currentUserKey = 'currentUser';

  constructor(private router: Router, private http: HttpClient) {}

  login(username: string, password: string):Observable<any> {
    return this.http.post(`${this.API_URL}/login`, { username, password }).pipe(
      tap((user) => {
        // Store user in localStorage so AuthGuard can find it
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  };

  logout() {
    localStorage.removeItem(this.currentUserKey)
    this.router.navigate(['/login']);
  };

  getCurrentUser(): any {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
  
}
