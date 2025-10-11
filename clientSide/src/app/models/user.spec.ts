import { User } from './user.model';

describe('User Model', () => {
  it('should create a user instance', () => {
    const user = new User(
      '1',
      'Alice',
      'alice@example.com',
      'password123',
      ['USER'],
      [1, 2],
      'profile.png',
      'online'
    );

    expect(user).toBeTruthy();
    expect(user.username).toBe('Alice');
    expect(user.groups.length).toBe(2);
    expect(user.role).toContain('USER');
  });
});
