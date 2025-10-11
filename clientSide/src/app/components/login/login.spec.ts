import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    // Mock dependencies
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockUserService = jasmine.createSpyObj('UserService', [
      'setCurrentUser',
      'clearPendingRequests'
    ]);
    mockAuthService = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [Login, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('#01 create', () => {
    expect(component).toBeTruthy();
  });

  it('#02 alert if username or password is missing on login', () => {
    spyOn(window, 'alert');
    component.login('', '');
    expect(window.alert).toHaveBeenCalledWith('Username and password are required!');
  });

  it('#03 call AuthService.login and navigate on successful login', () => {
    const mockUser = { id: '1', username: 'Alice', email: 'test@example.com', password: '123', groups: [], role: [], profileImg: '', status: 'offline'};
    mockAuthService.login.and.returnValue(of(mockUser));

    component.login('Alice', '123');

    expect(mockAuthService.login).toHaveBeenCalledWith('Alice', '123');
    expect(mockUserService.setCurrentUser).toHaveBeenCalledWith(mockUser);
    expect(mockUserService.clearPendingRequests).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('#04 alert if login fails', () => {
    spyOn(window, 'alert');
    const errorResponse = { error: { error: 'Invalid credentials' } };
    mockAuthService.login.and.returnValue(throwError(() => errorResponse));

    component.login('Alice', 'wrong');

    expect(window.alert).toHaveBeenCalledWith('Invalid credentials');
  });
});
