import { TestBed } from '@angular/core/testing';
import { GroupService } from './group.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { SocketService } from './socket.service';
import { Group } from '../models/group.model';
import { of } from 'rxjs';

describe('GroupService', () => {
  let service: GroupService;
  let httpMock: HttpTestingController;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockSocketService: jasmine.SpyObj<SocketService>;

  beforeEach(() => {
    mockUserService = jasmine.createSpyObj('UserService', ['getCurrentUser', 'isSuperAdmin', 'isGroupAdmin', 'setCurrentUser']);
    mockSocketService = jasmine.createSpyObj('SocketService', ['connect', 'disconnect', 'on', 'emit']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GroupService,
        { provide: UserService, useValue: mockUserService },
        { provide: SocketService, useValue: mockSocketService }
      ]
    });

    service = TestBed.inject(GroupService);
    httpMock = TestBed.inject(HttpTestingController);

    // flush initial GET request triggered by constructor
    const req = httpMock.expectOne('http://localhost:3000/api/groups');
    req.flush([]); // empty groups
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('#01 be created', () => {
    expect(service).toBeTruthy();
  });

  it('#02 load groups and update BehaviorSubject', (done) => {
    const mockGroups: Group[] = [{ id: 1, name: 'Test Group', createdBy: 'test', channels: [] }];
    service.loadGroups();

    const req = httpMock.expectOne('http://localhost:3000/api/groups');
    expect(req.request.method).toBe('GET');
    req.flush(mockGroups);

    service.getAllGroups().subscribe((groups: Group[]) => {
      expect(groups.length).toBe(1);
      expect(groups[0]).toEqual(mockGroups[0]);
      done();
    });
  });

  it('#03 add a new group', () => {
    const group: Group = { id: 1, name: 'New Group', createdBy: 'test', channels: [] };
    service.addGroup(group);
    service.getAllGroups().subscribe((groups: Group[]) => {
      expect(groups).toContain(group);
    });
  });

  it('#04 return null if user cannot create group', () => {
    const user = { id: 'u1', username: 'user', password: '123', email: 'user@example.com', role: ['USER'], groups: [], profileImg: ' ', status: 'offline' };
    mockUserService.getCurrentUser.and.returnValue(user);
    mockUserService.isSuperAdmin.and.returnValue(false);
    mockUserService.isGroupAdmin.and.returnValue(false);

    const result = service.createGroup('Forbidden');
    expect(result).toBeNull();
  });

  it('#05 create group if user is admin', (done) => {
    const user: any = { id: 'u1', username: 'admin', role: ['GROUP_ADMIN'], groups: [] };
    mockUserService.getCurrentUser.and.returnValue(user);
    mockUserService.isSuperAdmin.and.returnValue(false);
    mockUserService.isGroupAdmin.and.returnValue(true);
    mockUserService.setCurrentUser.and.callFake((u) => { Object.assign(user, u); });

    const newGroup: Group = { id: 1, name: 'Admin Group', createdBy: 'admin', channels: [] };

    service.createGroup('Admin Group')?.subscribe((group) => {
      expect(group).toEqual(newGroup);
      expect(user.groups).toContain(newGroup.id);
      done();
    });

    const req = httpMock.expectOne('http://localhost:3000/api/groups');
    expect(req.request.method).toBe('POST');
    req.flush(newGroup);
  });

  it('#06 modify group if user has permission', (done) => {
    const group: Group = { id: 1, name: 'Old Name', createdBy: 'admin', channels: [] };
    service['groups'] = [group];

    const user: any = { id: 'u1', username: 'admin', role: ['GROUP_ADMIN'], groups: [1] };
    mockUserService.getCurrentUser.and.returnValue(user);
    mockUserService.isSuperAdmin.and.returnValue(false);
    mockUserService.isGroupAdmin.and.returnValue(true);

    service.modifyGroup(1, 'New Name')?.subscribe((updated) => {
      expect(updated.name).toBe('New Name');
      expect(service.getGroups()[0].name).toBe('New Name');
      done();
    });

    const req = httpMock.expectOne('http://localhost:3000/api/groups/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ ...group, name: 'New Name' });
  });

  it('#07 delete group if user has permission', (done) => {
    const group: Group = { id: 1, name: 'Delete Me', createdBy: 'admin', channels: [] };
    service['groups'] = [group];

    const user: any = { id: 'u1', username: 'admin', role: ['SUPER_ADMIN'], groups: [1] };
    mockUserService.getCurrentUser.and.returnValue(user);
    mockUserService.isSuperAdmin.and.returnValue(true);

    service.deleteGroup(1)?.subscribe(() => {
      expect(service.getGroups().length).toBe(0);
      done();
    });

    const req = httpMock.expectOne('http://localhost:3000/api/groups/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
