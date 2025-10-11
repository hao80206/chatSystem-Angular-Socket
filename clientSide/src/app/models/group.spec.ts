import { Group } from './group.model';

describe('Group Model', () => {
  it('should create a group instance', () => {
    const group: Group = {
      id: 1,
      name: 'Test Group',
      createdBy: 'Alice',
      channels: ['101', '102']
    };

    expect(group).toBeTruthy();
    expect(group.name).toBe('Test Group');
  });
});
