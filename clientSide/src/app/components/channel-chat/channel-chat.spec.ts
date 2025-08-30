import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelChat } from './channel-chat';

describe('ChannelChat', () => {
  let component: ChannelChat;
  let fixture: ComponentFixture<ChannelChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChannelChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
