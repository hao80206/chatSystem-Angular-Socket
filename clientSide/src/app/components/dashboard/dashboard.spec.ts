import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Dashboard } from './dashboard';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { Group } from '../../models/group.model';
import { User } from '../../models/user.model';
import { fakeAsync, tick } from '@angular/core/testing';

describe('Dashboard Component', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  let mockUserService: any;
  let mockGroupService: any;
  let mockSocketService: any;
  let mockRouter: any;
  let mockHttp: any;
  let mockAuthService: any;

  beforeEach(async () => {
    mockUserService = {
      getAllUsers: jasmine.createSpy().and.returnValue(of([])),
      getCurrentUser: jasmine.createSpy(),
      leaveGroup: jasmine.createSpy(),
      pendingRequests: [],
      isGroupAdmin: (user: User) => user.role?.includes('GROUP_ADMIN'),
      isSuperAdmin: (user: User) => user.role?.includes('SUPER_ADMIN'),
      setChannelId: jasmine.createSpy()
    };

    mockGroupService = {
      getAllGroups: jasmine.createSpy().and.returnValue(of([])),
      createGroup: jasmine.createSpy(),
      deleteGroup: jasmine.createSpy(),
      modifyGroup: jasmine.createSpy(),
      addGroup: jasmine.createSpy()
    };

    mockSocketService = {
      emit: jasmine.createSpy(),
      on: jasmine.createSpy()
    };

    mockRouter = { navigate: jasmine.createSpy() };
    mockHttp = { get: jasmine.createSpy(), post: jasmine.createSpy(), delete: jasmine.createSpy() };
    mockAuthService = { getCurrentUser: jasmine.createSpy(), logout: jasmine.createSpy() };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: GroupService, useValue: mockGroupService },
        { provide: SocketService, useValue: mockSocketService },
        { provide: Router, useValue: mockRouter },
        { provide: HttpClient, useValue: mockHttp },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;

    spyOn(window, 'alert');
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'prompt').and.returnValue('Updated');
  });

  // ---------------- BASIC ----------------
  it('#01 create the component', () => {
    expect(component).toBeTruthy();
  });

  it('#02 call getAllUsers and connectSocket on init', () => {
    spyOn<any>(component, 'connectSocket');
    component.ngOnInit();
    expect(mockUserService.getAllUsers).toHaveBeenCalled();
    expect(component['connectSocket']).toHaveBeenCalled();
  });

  it('#03 unsubscribe on destroy', () => {
    const unsubscribeSpy = jasmine.createSpy();
    component['subs'] = [{ unsubscribe: unsubscribeSpy }] as any;
    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  // ---------------- SOCKET ----------------
  it('#04 emit joinGroup for each user group', () => {
    const user = { id: '1', groups: [10, 20] } as User;
    mockUserService.getCurrentUser.and.returnValue(user);
    component['connectSocket']();
    expect(mockSocketService.emit).toHaveBeenCalledWith('joinGroup', { groupId: 10, userId: '1' });
    expect(mockSocketService.emit).toHaveBeenCalledWith('joinGroup', { groupId: 20, userId: '1' });
  });

  // ---------------- GROUP LISTS ----------------
  it('#05 assign userGroups/otherGroups for GROUP_ADMIN', () => {
    const groups: Group[] = [
      { id: 1, name: 'A', createdBy: 'admin', channels: [] },
      { id: 2, name: 'B', createdBy: 'admin', channels: [] }
    ];
    const user: User = { id: 'u1', role: ['GROUP_ADMIN'], groups: [1] } as User;
    component['recomputeLists'](groups, user);
    expect(component.userGroups.length).toBe(1);
    expect(component.otherGroups.length).toBe(1);
  });

  it('#06 assign all groups to userGroups for SUPER_ADMIN', () => {
    const groups = [{ id: 1, name: 'G1' }, { id: 2, name: 'G2' }] as Group[];
    const user = { id: '1', role: ['SUPER_ADMIN'], groups: [10] } as User;
    component['recomputeLists'](groups, user);
    expect(component.userGroups.length).toBe(2);
    expect(component.otherGroups.length).toBe(0);
  });

    // ---------------- JOIN REQUEST ----------------
    it('#07 send join request if not already requested', fakeAsync(() => {
      const user = { id: 'u1', role: ['USER'] } as User;
      mockUserService.getCurrentUser.and.returnValue(user);
    
      spyOn(component['http'], 'get').and.returnValue(of([])); // no existing requests
      spyOn(component['http'], 'post').and.returnValue(of({ userId: 'u1', groupId: 10 }));
    
      component.requestJoinGroup(10);
      tick();
    
      expect(component['http'].get).toHaveBeenCalledWith(`${component.API_URL}/groups/10/join-requests`);
      expect(component['http'].post).toHaveBeenCalledWith(`${component.API_URL}/groups/10/join-requests`, { userId: 'u1', groupId: 10 });
      expect(component.pendingRequests).toEqual(jasmine.arrayContaining([{ userId: 'u1', groupId: 10 }]));
      expect(mockSocketService.emit).toHaveBeenCalledWith('requestJoinGroup', { userId: 'u1', groupId: 10 });
      expect(window.alert).toHaveBeenCalledWith('Request sent');
    }));
  
    it('#08 alert if join request already exists', fakeAsync(() => {
      const user = { id: 'u1', role: ['USER'] } as User;
      mockUserService.getCurrentUser.and.returnValue(user);
    
      spyOn(component['http'], 'get').and.returnValue(of([{ userId: 'u1', groupId: 10 }])); // existing request
      spyOn(component['http'], 'post');
    
      component.requestJoinGroup(10);
      tick();
    
      expect(component['http'].get).toHaveBeenCalledWith(`${component.API_URL}/groups/10/join-requests`);
      expect(component['http'].post).not.toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('You already sent request. Please wait for a moment');
    }));

  // ---------------- LEAVE GROUP ----------------
  it('#09 leave group and recompute lists', () => {
    const user = { id: '1' } as User;
    mockUserService.getCurrentUser.and.returnValue(user);
    mockGroupService.getAllGroups.and.returnValue(of([]));

    component.leaveGroup(99);

    expect(mockUserService.leaveGroup).toHaveBeenCalledWith(user, 99);
    expect(window.alert).toHaveBeenCalledWith('You left the group successfully');
  });

  // ---------------- CREATE GROUP ----------------
  it('#10 create group successfully', () => {
    component.newGroupName = 'New Group';
    mockGroupService.createGroup.and.returnValue(of({ id: 1, name: 'New Group' }));

    component.createGroup();

    expect(mockSocketService.emit).toHaveBeenCalledWith('groupCreated', { id: 1, name: 'New Group' });
    expect(window.alert).toHaveBeenCalledWith('Group created successfully!');
  });

  // ---------------- DELETE GROUP ----------------
  it('#11 delete account and logout', fakeAsync(() => {
    const user = { id: 'u1', role: ['USER'] } as User;
    mockUserService.getCurrentUser.and.returnValue(user);
  
    spyOn(component['http'], 'delete').and.returnValue(of({}));
  
    component.deleteAccount();
    tick();
  
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete your account?');
    expect(component['http'].delete).toHaveBeenCalledWith(`${component.API_URL}/users/u1`);
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  }));

  // ---------------- MODIFY GROUP ----------------
  it('#12 emit groupModified after update', () => {
    mockGroupService.modifyGroup.and.returnValue(of({ id: 1, name: 'Updated' }));
    const user = { id: '1', role: ['GROUP_ADMIN'] } as User;
    mockUserService.getCurrentUser.and.returnValue(user);

    component.onModifyGroup(1);

    expect(mockSocketService.emit).toHaveBeenCalledWith('groupModified', { id: 1, name: 'Updated' });
  });

});
