import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ChannelList } from './channel-list';
import { ActivatedRoute, Router } from '@angular/router';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import { SocketService } from '../../services/socket.service';
import { HttpClient } from '@angular/common/http';

describe('ChannelList Component', () => {
  let component: ChannelList;
  let fixture: ComponentFixture<ChannelList>;

  let mockChannelService: any;
  let mockUserService: any;
  let mockGroupService: any;
  let mockSocketService: any;
  let mockHttp: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockChannelService = {
      getAllChannels: jasmine.createSpy().and.returnValue(of([
        { id: 1, name: 'General', groupId: 1, bannedUsers: [] }
      ])),
      loadChannels: jasmine.createSpy(),
      createChannel: jasmine.createSpy().and.returnValue(of({ id: 2, name: 'New', groupId: 1 })),
      deleteChannel: jasmine.createSpy().and.returnValue(of({})),
      addLocalChannel: jasmine.createSpy(),
      removeLocalChannel: jasmine.createSpy(),
      banUserFromChannel: jasmine.createSpy()
    };

    mockUserService = {
      getCurrentUser: jasmine.createSpy().and.returnValue({ id: 'u1', role: ['USER'], groups: [1] }),
      getAllUsers: jasmine.createSpy().and.returnValue(of([])),
      getUsersByGroup: jasmine.createSpy().and.returnValue(of([])),
      removeUserFromGroup: jasmine.createSpy().and.returnValue(of({}))
    };

    mockGroupService = { addGroup: jasmine.createSpy() };
    mockSocketService = { emit: jasmine.createSpy(), on: jasmine.createSpy() };

    mockHttp = {
      get: jasmine.createSpy().and.returnValue(of([])),
      post: jasmine.createSpy().and.returnValue(of({}))
    };

    mockRouter = { navigate: jasmine.createSpy() };
    mockActivatedRoute = { snapshot: { paramMap: { get: () => '1' } } };

    await TestBed.configureTestingModule({
      imports: [ChannelList],
      providers: [
        { provide: ChannelService, useValue: mockChannelService },
        { provide: UserService, useValue: mockUserService },
        { provide: GroupService, useValue: mockGroupService },
        { provide: SocketService, useValue: mockSocketService },
        { provide: HttpClient, useValue: mockHttp },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelList);
    component = fixture.componentInstance;

    spyOn(window, 'alert');
  });

  it('#01 create the component', () => {
    expect(component).toBeTruthy();
  });

  it('#02 initialize currentUser and join socket room on init', () => {
    component.ngOnInit();
    expect(component.currentUser?.id).toBe('u1');
    expect(mockChannelService.loadChannels).toHaveBeenCalledWith(1);
    expect(mockSocketService.emit).toHaveBeenCalledWith('joinGroup', { groupId: 1, userId: 'u1' });
    expect(mockSocketService.emit).toHaveBeenCalledWith('updateStatus', { userId: 'u1', status: 'online' });
  });

  it('#03 updateUserStatus should call http.post and emit socket event', () => {
    component.currentUser = { id: 'u1',username: 'test', email: 'test@example.com', password: '123', role: ['USER'], groups: [1], profileImg:' ', status: 'offline' };
    // Spy on the injected HttpClient's post method
    spyOn(component['http'], 'post').and.callThrough();
    component.updateUserStatus();
    expect(component['http'].post).toHaveBeenCalledWith('http://localhost:3000/api/users/u1/status', { status: 'online' });
    expect(mockSocketService.emit).toHaveBeenCalledWith('updateStatus', { userId: 'u1', status: 'online' });
  });


  it('#04 canManageGroup returns true for SUPER_ADMIN', () => {
    component.currentUser = { id: 'u1',username: 'test', email: 'test@example.com', password: '123', role: ['SUPER_ADMIN'], groups: [1], profileImg:' ', status: 'offline' };
    expect(component.canManageGroup()).toBeTrue();
  });

  it('#05 banUser calls channelService.banUserFromChannel', () => {
    component.banUser(1, 'u2');
    expect(mockChannelService.banUserFromChannel).toHaveBeenCalledWith(1, 'u2');
  });

  it('#06 createChannel calls channelService.createChannel and clears input', () => {
    component.newChannelName = 'New Channel';
    component.groupId = 1;
    component.createChannel();
    expect(mockChannelService.createChannel).toHaveBeenCalledWith(1, 'New Channel');
    expect(component.newChannelName).toBe('');
  });

  it('#07 deleteChannel calls channelService.deleteChannel', () => {
    component.groupId = 1;
    component.deleteChannel(1);
    expect(mockChannelService.deleteChannel).toHaveBeenCalledWith(1, 1);
  }); 

  it('#08 openChannel navigates to channel if user is in group and not banned', () => {
    component.currentUser = { id: 'u1',username: 'test', email: 'test@example.com', password: '123', role: ['USER'], groups: [1], profileImg:' ', status: 'offline' };
    component.channelsInGroup = [{ id: 1, name: 'General', groupId: 1, members: [], bannedUsers: [] }];
    component.groupId = 1;

    component.openChannel(1);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/group/1/channel/1']);
  });

  it('#09 openChannel alerts if user is banned', () => {
    component.currentUser = { id: 'u1',username: 'test', email: 'test@example.com', password: '123', role: ['USER'], groups: [1], profileImg:' ', status: 'offline' };
    component.channelsInGroup = [{ id: 1, name: 'General', groupId: 1, members: [], bannedUsers: ['u1'] }];
    component.groupId = 1;

    component.openChannel(1);
    expect(window.alert).toHaveBeenCalledWith('You cannot access this channel because you have been banned !');
  });
});
