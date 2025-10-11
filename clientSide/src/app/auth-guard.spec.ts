import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth-guard';
import { AuthService } from './services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: {} } // we don't use AuthService directly here
      ]
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow activation if currentUser exists in localStorage', () => {
    localStorage.setItem('currentUser', JSON.stringify({ username: 'test' }));

    const canActivate = guard.canActivate();
    expect(canActivate).toBeTrue();
  });

  it('should redirect to /login if currentUser does not exist', () => {
    localStorage.removeItem('currentUser');

    const canActivate = guard.canActivate();
    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
