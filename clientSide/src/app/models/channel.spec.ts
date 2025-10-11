import { Channel } from './channel.model';

describe('Channel Model', () => {
  it('should create a channel instance', () => {
    const channel: Channel = {
      id: 101,
      name: 'general',
      groupId: 1,
      members: ['1', '2'],
      bannedUsers: []
    };

    expect(channel).toBeTruthy();
    expect(channel.name).toBe('general');
    expect(channel.groupId).toBe(1);
    expect(channel.members).toContain('1');
  });
});
