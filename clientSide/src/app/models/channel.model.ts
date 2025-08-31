
export class Channel {
    id: number;
    groupId: number;
    name: string;
    members: string[] = [];   // user IDs
    bannedUsers: string[] = []; // user IDs

  constructor(id: number, groupId: number, name: string) {
    this.id = id;
    this.groupId = groupId;
    this.name = name;
  }
}
