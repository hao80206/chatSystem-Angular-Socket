import { TestBed } from '@angular/core/testing';
import { ChannelService } from './channel.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { SocketService } from './socket.service';
import { of } from 'rxjs';
import { Channel } from '../models/channel.model';

describe('ChannelService', () => {
  let service: ChannelService;
  let httpMock: HttpTestingController;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockSocketService: jasmine.SpyObj<SocketService>;

  beforeEach(() => {
    mockUserService = jasmine.createSpyObj('UserService', [
      'getCurrentUser', 'isSuperAdmin', 'isGroupAdmin', 'canManageGroup'
    ]);
    mockSocketService = jasmine.createSpyObj('SocketService', ['emit']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChannelService,
        { provide: UserService, useValue: mockUserService },
        { provide: SocketService, useValue: mockSocketService }
      ]
    });

    service = TestBed.inject(ChannelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('#01 be created', () => {
    expect(service).toBeTruthy();
  });

  it('#02 load channels for a group', () => {
    const mockChannels: Channel[] = [{ id: 1, name: 'General', groupId: 1, members: [], bannedUsers: [] }];
    service.loadChannels(1);

    const req = httpMock.expectOne('http://localhost:3000/api/groups/1/channels');
    expect(req.request.method).toBe('GET');
    req.flush(mockChannels);
  });

  it('#03 add local channel if it does not exist', () => {
    const channel: Channel = { id: 2, name: 'Random', groupId: 1, members: [], bannedUsers: [] };
    service.addLocalChannel(channel);
    service.getAllChannels().subscribe(ch => {
      expect(ch).toContain(channel);
    });
  });

  it('#04 join a channel if user belongs to group and is not banned', () => {
    const channel: Channel = { id: 3, name: 'Test', groupId: 1, members: [], bannedUsers: [] };
    service.addLocalChannel(channel);

    const user = { id: 'u1', groups: [1], role: ['USER'] } as any;
    
    const result = service.joinChannel(user, 3);
    expect(result).toBeTrue();
    expect(channel.members).toContain('u1');

    // 👇 Expect the HTTP PUT call made by updateChannelMembers
    const req = httpMock.expectOne('http://localhost:3000/api/3/members');   
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ members: ['u1'] });
    req.flush({}); // respond to the PUT call
  });

  it('#05 ban a user if current user is admin', () => {
    const channel: Channel = { id: 4, name: 'AdminTest', groupId: 1, members: ['u2'], bannedUsers: [] };
    service.addLocalChannel(channel);

    const admin = { id: 'admin', role: ['SUPER_ADMIN'], groups: [1] } as any;
    mockUserService.getCurrentUser.and.returnValue(admin);
    mockUserService.isSuperAdmin.and.returnValue(true);

    const result = service.banUserFromChannel(4, 'u2');
    expect(result).toBe(true);
    expect(channel.bannedUsers).toContain('u2');
    expect(channel.members).not.toContain('u2');
    expect(mockSocketService.emit).toHaveBeenCalledWith('banUser', { channelId: 4, userId: 'u2' });
  });

  it('#06 create a channel if user has permission', () => {
    const newChannel: Channel = { id: 5, name: 'NewChannel', groupId: 1, members: [], bannedUsers: [] };
    const user = { id: 'u1', role: ['GROUP_ADMIN'], groups: [1] } as any;
    mockUserService.getCurrentUser.and.returnValue(user);
    mockUserService.isSuperAdmin.and.returnValue(false);
    mockUserService.isGroupAdmin.and.returnValue(true);

    service.createChannel(1, 'NewChannel')?.subscribe(ch => {
      expect(ch).toEqual(newChannel);
    });

    const req = httpMock.expectOne('http://localhost:3000/api/groups/1/channels');
    expect(req.request.method).toBe('POST');
    req.flush(newChannel);
  });

  it('#07 delete channel if user can manage group', () => {
    const channel: Channel = { id: 6, name: 'DelChannel', groupId: 1, members: [], bannedUsers: [] };
    service.addLocalChannel(channel);
    const user = { id: 'u1', role: ['SUPER_ADMIN'], groups: [1] } as any;
    mockUserService.getCurrentUser.and.returnValue(user);
    mockUserService.canManageGroup.and.returnValue(true);

    service.deleteChannel(1, 6)?.subscribe(() => {
      service.getAllChannels().subscribe(chs => {
        expect(chs.find(c => c.id === 6)).toBeUndefined();
      });
    });

    const req = httpMock.expectOne('http://localhost:3000/api/groups/1/channels/6');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
