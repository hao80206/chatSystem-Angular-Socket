import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy = { navigate: jasmine.createSpy('navigate') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('#01 be created', () => {
    expect(service).toBeTruthy();
  });

  it('#02 login and store user in localStorage', () => {
    const mockUser = { username: 'test', token: 'abc123' };

    service.login('test', '123456').subscribe(user => {
      expect(user).toEqual(mockUser);
      expect(localStorage.getItem('currentUser')).toEqual(JSON.stringify(mockUser));
    });

    const req = httpMock.expectOne('http://localhost:3000/api/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockUser);
  });

  it('#03 logout and remove currentUser from localStorage', () => {
    localStorage.setItem('currentUser', JSON.stringify({ username: 'test' }));
    service.logout();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('#04 return current user from localStorage', () => {
    const mockUser = { username: 'test' };
    localStorage.setItem('currentUser', JSON.stringify(mockUser));
    expect(service.getCurrentUser()).toEqual(mockUser);
  });

  it('#05 return true if user is authenticated', () => {
    localStorage.setItem('currentUser', JSON.stringify({ username: 'test' }));
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('#06 return false if user is not authenticated', () => {
    localStorage.removeItem('currentUser');
    expect(service.isAuthenticated()).toBeFalse();
  });
});
