import { TestBed } from '@angular/core/testing';
import { SocketService } from './socket.service';
import { io, Socket } from 'socket.io-client';

describe('SocketService', () => {
  let service: SocketService;
  let mockSocket: jasmine.SpyObj<Socket>;

  beforeEach(() => {
    mockSocket = jasmine.createSpyObj('Socket', ['on', 'emit', 'disconnect', 'connected', 'off']);
    TestBed.configureTestingModule({
      providers: [SocketService]
    });

    service = TestBed.inject(SocketService);

    // Override the connect method to use the mock socket
    spyOn(service as any, 'connect').and.callFake(() => {
        (service as any).socket = mockSocket;
        return mockSocket;
      });
  });

  it('#01 be created', () => {
    expect(service).toBeTruthy();
  });

  it('#02 return socket on getSocket', () => {
    service.connect();
    expect(service.getSocket()).toBe(mockSocket);
  });

  it('#03 call emit on socket if connected', () => {
    service.connect();
    service.emit('testEvent', { data: 123 });
    expect(mockSocket.emit).toHaveBeenCalledWith('testEvent', { data: 123 });
  });

  it('#04 call disconnect', () => {
    service.connect();
    service.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(service.isConnected()).toBeFalse();
  });

  it('#05 subscribe to events using on', () => {
    service.connect();
    const callback = jasmine.createSpy('callback');
    service.on('event', callback);
    expect(mockSocket.on).toHaveBeenCalledWith('event', callback);
  });

  it('#06 unsubscribe from events using off', () => {
    service.connect();
    service.off('event');
    expect(mockSocket.off).toHaveBeenCalledWith('event');
  });
});
