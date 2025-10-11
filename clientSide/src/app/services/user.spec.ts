import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { User } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let routerSpy = { navigate: jasmine.createSpy('navigate') };

  const mockUser: User = {
    id: '1',
    username: 'testUser',
    email: 'test@example.com',
    password: '123',
    groups: [1],
    role: ['GROUP_ADMIN'],
    profileImg: ' ',
    status: 'offline'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('#01 be created', () => {
    expect(service).toBeTruthy();
  });

  // STORAGE TESTS
  it('#02 save and load user from localStorage', () => {
    service.saveToStorage(mockUser);
    expect(service.getCurrentUser()).toEqual(mockUser);

    const service2 = TestBed.inject(UserService);
    expect(service2.getCurrentUser()).toEqual(mockUser);
  });

  it('#03 clear pending requests', () => {
    service['pendingRequests'] = [{ userId: '1', groupId: 1, username: 'testUser' }];
    service.clearPendingRequests();
    expect(service['pendingRequests'].length).toBe(0);
  });

  // CHANNEL ID
  it('#04 set and get channelId', () => {
    service.setChannelId(42);
    expect(service.getChannelId()).toBe(42);
  });

  // ROLE HELPERS
  it('#05 correctly identify SUPER_ADMIN and GROUP_ADMIN', () => {
    const superUser: User = { ...mockUser, role: ['SUPER_ADMIN'] };
    expect(service.isSuperAdmin(superUser)).toBeTrue();
    expect(service.isGroupAdmin(mockUser)).toBeTrue();
  });

  it('#06 determine if user can manage group', () => {
    const admin: User = { ...mockUser };
    expect(service.canManageGroup(admin, 1)).toBeTrue();
    expect(service.canManageGroup(admin, 999)).toBeFalse();
  });

  // PROMOTE USER
  it('#07 promote user to SUPER_ADMIN', () => {
    const currentUser: User = { ...mockUser, role: ['SUPER_ADMIN'] };
    service.setCurrentUser(currentUser);
    const newUser: User = { ...mockUser, role: [] };
    const promoted = service.promoteUser(newUser, 'SUPER_ADMIN');
    expect(promoted).toBeTrue();
    expect(newUser.role).toContain('SUPER_ADMIN');
  });

  it('#08 promote user to GROUP_ADMIN', () => {
    const currentUser: User = { ...mockUser, role: ['SUPER_ADMIN'] };
    service.setCurrentUser(currentUser);
    const newUser: User = { ...mockUser, role: [] };
    const promoted = service.promoteUser(newUser, 'GROUP_ADMIN', 1);
    expect(promoted).toBeTrue();
    expect(newUser.role).toContain('GROUP_ADMIN');
    expect(newUser.groups).toContain(1);
  });

  // API CALLS
  it('#09 get all users', () => {
    service.getAllUsers().subscribe(users => {
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('testUser');
    });

    const req = httpMock.expectOne('http://localhost:3000/api/users');
    expect(req.request.method).toBe('GET');
    req.flush([mockUser]);
  });

  it('#10 get user by ID', () => {
    service.getUserById('1').subscribe(user => {
      expect(user.username).toBe('testUser');
    });

    const req = httpMock.expectOne('http://localhost:3000/api/users/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  // LEAVE GROUP
  it('#11 remove group from user when leaving group', () => {
    const user = { ...mockUser, groups: [1, 2] };
    service.setCurrentUser(user);
    service.leaveGroup(user, 1);
    expect(user.groups).not.toContain(1);
    expect(service.getCurrentUser()?.groups).not.toContain(1);
  });

});
