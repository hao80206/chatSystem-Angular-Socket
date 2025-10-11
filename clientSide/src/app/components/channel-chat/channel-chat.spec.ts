import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ChannelChat } from './channel-chat';
import { HttpClient } from '@angular/common/http';
import { SocketService } from '../../services/socket.service';
import { UserService } from '../../services/user.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ChannelChat Component', () => {
  let component: ChannelChat;
  let fixture: ComponentFixture<ChannelChat>;

  let mockHttp: any;
  let mockSocketService: any;
  let mockUserService: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockHttp = {
      get: jasmine.createSpy().and.returnValue(of([])),
      post: jasmine.createSpy().and.returnValue(of({}))
    };

    mockSocketService = {
      emit: jasmine.createSpy(),
      on: jasmine.createSpy(),
      connect: jasmine.createSpy(),
      off: jasmine.createSpy()
    };

    mockUserService = {
      getCurrentUser: jasmine.createSpy().and.returnValue({
        id: 'u1',
        username: 'test',
        profileImg: 'img.png',
        role: ['USER'],
        groups: [1],
        status: 'offline'
      }),
      setChannelId: jasmine.createSpy(),
      getUsersByGroup: jasmine.createSpy().and.returnValue(of([])),
      isSuperAdmin: jasmine.createSpy().and.returnValue(false),
      isGroupAdmin: jasmine.createSpy().and.returnValue(false)
    };

    mockRouter = { navigate: jasmine.createSpy() };
    mockActivatedRoute = { snapshot: { paramMap: { get: () => '1' } }, paramMap: of(new Map()) };

    await TestBed.configureTestingModule({
      imports: [ChannelChat],
      providers: [
        { provide: HttpClient, useValue: mockHttp },
        { provide: SocketService, useValue: mockSocketService },
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelChat);
    component = fixture.componentInstance;

    mockHttp.post.and.callThrough();
    mockUserService.isSuperAdmin.and.callThrough();
    mockUserService.isGroupAdmin.and.callThrough();
  });

  it('#01 create the component', () => {
    expect(component).toBeTruthy();
  });

  it('#02 initialize currentUser on ngOnInit', () => {
    component.ngOnInit();
    expect(component.currentUser).toBeTruthy();
    expect(mockUserService.getCurrentUser).toHaveBeenCalled();
    expect(mockSocketService.connect).toHaveBeenCalled();
  });

  it('#03 updateUserStatus should call http.post and update status', () => {
    component.currentUser = {
      id: 'u1',
      username: 'test',
      email: 'test@example.com',
      password: '123',
      profileImg: 'img.png',
      role: ['USER'],
      groups: [1],
      status: 'offline'
    };

    mockHttp.post.and.returnValue(of({}));
    component.updateUserStatus('online');

    expect(component.currentUser.status).toBe('online');
    expect(component['http'].post).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/u1/status',
      { status: 'online' }
    );
  });

  it('#04 1sendMessage should post text message via http', () => {
    component.currentUser = {
      id: 'u1',
      username: 'test',
      email:'text@example.com',
      password: '123',
      profileImg: 'img.png',
      role: ['USER'],
      groups: [1],
      status: 'online'
    };
    component.channelId = 1;
    component.newMessage = 'Hello';

    mockHttp.post.and.returnValue(of({ success: true }));
    component.sendMessage();

    expect(component['http'].post).toHaveBeenCalled();
    expect(component.newMessage).toBe('');
  });

  it('#05 banUser should call socket emit and remove user from usersInGroup', () => {
    component.currentUser = { id: 'u1', username: 'test', email: 'test@example.com', password: '123', profileImg: 'img.png', role: ['SUPER_ADMIN'], groups: [1], status: 'online' };
    component.usersInGroup = [
      { id: 'u2', username: 'other', password: '123', email: 'test@example.com', role: ['USER'], groups: [1], profileImg: 'img.png', status: 'online' }
    ];
    component.channelId = 1;
    component.groupId = 1;

    mockUserService.isSuperAdmin.and.returnValue(true);
    component.banUser('u2');

    expect(mockSocketService.emit).toHaveBeenCalledWith('banUser', { channelId: 1, userId: 'u2', groupId: 1 });
    expect(component.usersInGroup.length).toBe(0);
  });

  it('#06 leaveChannel should emit leaveChannel and navigate back', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.currentUser = { id: 'u1', username: 'test', email: 'test@example.com', password: '123', profileImg: 'img.png', role: ['USER'], groups: [1], status: 'online' };
    component.channelId = 1;
    component.groupId = 1;

    mockHttp.post.and.returnValue(of({}));
    component.leaveChannel();

    expect(mockSocketService.emit).toHaveBeenCalledWith('leaveChannel', { channelId: 1, userId: 'u1' });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/group/1/channels']);
  });

  it('#07 canBan returns false for self or admin users', () => {
    component.currentUser = { id: 'u1', username: 'test', email: 'test@example.com', password: '123', profileImg: 'img.png', role: ['USER'], groups: [1], status: 'online' };
    const user = { id: 'u1', username: 'test', email: 'test@example.com', password: '123', profileImg: 'img.png', role: ['USER'], groups: [1], status: 'online' };
    expect(component.canBan(user)).toBeFalse();
    expect(component.canBan({ id: 'u2', username: 'test', email: 'test@example.com', password: '123', profileImg: 'img.png', role: ['SUPER_ADMIN'], groups: [1], status: 'online' })).toBeFalse();
  });

  it('#08 ngOnDestroy should emit leaveChannel and cleanup video', () => {
    component.currentUser = { id: 'u1', username: 'test', email: 'test@example.com', password: '123', profileImg: 'img.png', role: ['USER'], groups: [1], status: 'online' };
    component.channelId = 1;
    component.peer = { destroy: jasmine.createSpy() } as any;
    component.ngOnDestroy();

    expect(mockSocketService.emit).toHaveBeenCalledWith('leaveChannel', { channelId: 1, userId: 'u1' });
    expect(component.peer.destroy).toHaveBeenCalled();
    expect(mockSocketService.off).toHaveBeenCalledWith('peerIdReady');
  });
});
