const { getDB } = require('./app');

class ChannelService {
  constructor() {
    this.collectionName = 'channels';
  }

  async createChannel(channel) {
    const db = getDB();
    const result = await db.collection(this.collectionName).insertOne(channel);
    return result.ops[0];
  }

  async getChannelById(channelId) {
    const db = getDB();
    return await db.collection(this.collectionName).findOne({ id: Number(channelId) });
  }

  async getChannelsByGroupId(groupId) {
    const db = getDB();
    return await db.collection(this.collectionName).find({ groupId: Number(groupId) }).toArray();
  }

  async updateChannel(channelId, update) {
    const db = getDB();
    await db.collection(this.collectionName).updateOne(
      { id: Number(channelId) },
      { $set: update }
    );
    return this.getChannelById(channelId);
  }

  async deleteChannel(channelId) {
    const db = getDB();
    await db.collection(this.collectionName).deleteOne({ id: Number(channelId) });
  }
}

module.exports = new ChannelService();
module.exports = [
    { id: 101, groupId: 1, name: 'General', members: [], bannedUsers: [] },
    { id: 102, groupId: 1, name: 'News', members: [], bannedUsers: [] },
    { id: 103, groupId: 1, name: 'Trip', members: [], bannedUsers: [] },
    { id: 104, groupId: 1, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 105, groupId: 1, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 106, groupId: 1, name: 'Cooking', members: [], bannedUsers: [] },
    { id: 107, groupId: 1, name: 'Exercise', members: [], bannedUsers: [] },
    { id: 201, groupId: 2, name: 'News', members: [], bannedUsers: [] },
    { id: 202, groupId: 2, name: 'Games', members: [], bannedUsers: [] },
    { id: 203, groupId: 2, name: 'Trip', members: [], bannedUsers: [] },
    { id: 204, groupId: 2, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 205, groupId: 2, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 206, groupId: 2, name: 'Cooking', members: [], bannedUsers: [] },
    { id: 301, groupId: 3, name: 'News', members: [], bannedUsers: [] },
    { id: 302, groupId: 3, name: 'General', members: [], bannedUsers: [] },
    { id: 303, groupId: 3, name: 'Trip', members: [], bannedUsers: [] },
    { id: 304, groupId: 3, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 305, groupId: 3, name: 'Games', members: [], bannedUsers: [] },
    { id: 401, groupId: 4, name: 'General', members: [], bannedUsers: [] },
    { id: 402, groupId: 4, name: 'WorldHeritage', members: [], bannedUsers: [] },
    { id: 403, groupId: 4, name: 'Cosmetics', members: [], bannedUsers: [] },
    { id: 404, groupId: 4, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 405, groupId: 4, name: 'Mystery', members: [], bannedUsers: [] },
    { id: 501, groupId: 5, name: 'News', members: [], bannedUsers: [] },
    { id: 502, groupId: 5, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 503, groupId: 5, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 504, groupId: 5, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 505, groupId: 5, name: 'Games', members: [], bannedUsers: [] },
    { id: 601, groupId: 6, name: 'News', members: [], bannedUsers: [] },
    { id: 602, groupId: 6, name: 'Comedy', members: [], bannedUsers: [] },
    { id: 603, groupId: 6, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 604, groupId: 6, name: 'Beauty', members: [], bannedUsers: [] },
    { id: 605, groupId: 6, name: 'Cooking', members: [], bannedUsers: [] },
    { id: 701, groupId: 7, name: 'General', members: [], bannedUsers: [] },
    { id: 702, groupId: 7, name: 'Vlog', members: [], bannedUsers: [] },
    { id: 703, groupId: 7, name: 'WorldHeritage', members: [], bannedUsers: [] },
    { id: 704, groupId: 7, name: 'Trip', members: [], bannedUsers: [] },
    { id: 705, groupId: 7, name: 'Mystery', members: [], bannedUsers: [] }
  ];