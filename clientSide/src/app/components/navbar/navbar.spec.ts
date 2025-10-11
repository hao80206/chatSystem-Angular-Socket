import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navbar } from './navbar';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { SocketService } from '../../services/socket.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockSocketService: jasmine.SpyObj<SocketService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockUserService = jasmine.createSpyObj('UserService', [
      'logout',
      'getCurrentUser',
      'getChannelId',
      'setChannelId'
    ]);
    mockSocketService = jasmine.createSpyObj('SocketService', ['emit']);

    await TestBed.configureTestingModule({
      imports: [Navbar, RouterTestingModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: UserService, useValue: mockUserService },
        { provide: SocketService, useValue: mockSocketService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('#01 create', () => {
    expect(component).toBeTruthy();
  });

  it('#02 logout and navigate to login', () => {
    // Act
    component.logout();

    // Assert
    expect(mockUserService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('#03 alert if no user when going to dashboard', () => {
    spyOn(window, 'alert');  // spy on alert
    mockUserService.getCurrentUser.and.returnValue(null);

    component.goToDashboard();

    expect(window.alert).toHaveBeenCalledWith('Login first');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('#04 navigate to dashboard if user is offline', () => {
    const user = { id: 'u1', status: 'offline' } as any;
    mockUserService.getCurrentUser.and.returnValue(user);

    component.goToDashboard();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('#05 emit leaveChannel and navigate if user is online and in channel', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const user = { id: 'u1', status: 'online' } as any;
    mockUserService.getCurrentUser.and.returnValue(user);
    mockUserService.getChannelId.and.returnValue(123);

    component.goToDashboard();

    expect(mockSocketService.emit).toHaveBeenCalledWith('leaveChannel', { channelId: 123, userId: 'u1' });
    expect(mockUserService.setChannelId).toHaveBeenCalledWith(null);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('#06 not navigate if user cancels leave confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const user = { id: 'u1', status: 'online' } as any;
    mockUserService.getCurrentUser.and.returnValue(user);
    mockUserService.getChannelId.and.returnValue(123);

    component.goToDashboard();

    expect(mockSocketService.emit).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalledWith(['/dashboard']);
  });
});
