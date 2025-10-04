const { getDB } = require('./app');

class GroupService {
  constructor() {
    this.collectionName = 'groups';
  }

  async createGroup(group) {
    const db = getDB();
    const result = await db.collection(this.collectionName).insertOne(group);
    return result.ops[0];
  }

  async getGroupById(groupId) {
    const db = getDB();
    return await db.collection(this.collectionName).findOne({ id: Number(groupId) });
  }

  async getAllGroups() {
    const db = getDB();
    return await db.collection(this.collectionName).find({}).toArray();
  }

  async updateGroup(groupId, update) {
    const db = getDB();
    await db.collection(this.collectionName).updateOne(
      { id: Number(groupId) },
      { $set: update }
    );
    return this.getGroupById(groupId);
  }

  async deleteGroup(groupId) {
    const db = getDB();
    await db.collection(this.collectionName).deleteOne({ id: Number(groupId) });
  }
}

module.exports = new GroupService();
module.exports = [
    { id: 1, name: 'Group1 - Tulip', createdBy: 'Super', channels: [101,102,103,104,105,106,107] },
    { id: 2, name: 'Group2 - Calendula', createdBy: 'Super', channels: [201,202,203,204,205,206] },
    { id: 3, name: 'Group3 - Lavender', createdBy: 'Super', channels: [301,302,303,304,305] },
    { id: 4, name: 'Group4 - Lily', createdBy: 'Super', channels: [401,402,403,404,405] },
    { id: 5, name: 'Group5 - Marigold', createdBy: 'Super', channels: [501,502,503,504,505] },
    { id: 6, name: 'Group6 - Rose', createdBy: 'Super', channels: [601,602,603,604,605] },
    { id: 7, name: 'Group7 - Jasmine', createdBy: 'Super', channels: [701,702,703,704,705] }
  ];