const { getDB } = require('./app');

class UserService {
  constructor() {
    this.collectionName = 'users';
  }

  async createUser(user) {
    const db = getDB();
    const result = await db.collection(this.collectionName).insertOne(user);
    return result.ops[0];
  }

  async getUserById(userId) {
    const db = getDB();
    return await db.collection(this.collectionName).findOne({ id: String(userId) });
  }

  async getUserByUsername(username) {
    const db = getDB();
    return await db.collection(this.collectionName).findOne({ username });
  }

  async getAllUsers() {
    const db = getDB();
    return await db.collection(this.collectionName).find({}).toArray();
  }

  async updateUser(userId, update) {
    const db = getDB();
    await db.collection(this.collectionName).updateOne(
      { id: String(userId) },
      { $set: update }
    );
    return this.getUserById(userId);
  }

  async deleteUser(userId) {
    const db = getDB();
    await db.collection(this.collectionName).deleteOne({ id: String(userId) });
  }
}

module.exports = new UserService();
  module.exports = [
    { id: '1', username: 'Alice', email: 'alice@mail.com', password: '123', role: ['USER'], groups: [1,2,5,7], profileImg: '/assets/Icons/woman-img-1.png', status: 'offline' },
    { id: '2', username: 'Bob', email: 'bob@mail.com', password: '123', role: ['USER'], groups: [2,3,6,7], profileImg: '/assets/Icons/man-img-1.png', status: 'offline' },
    { id: '3', username: 'Kevin', email: 'kevin@mail.com', password: '123', role: ['USER'], groups: [1,4,6,7], profileImg: '/assets/Icons/man-img-2.png', status: 'offline' },
    { id: '4', username: 'Taylor', email: 'taylor@mail.com', password: '123', role: ['USER'], groups: [1,2,3,4], profileImg: '/assets/Icons/woman-img-2.png', status: 'offline' },
    { id: '5', username: 'Stella', email: 'stella@mail.com', password: '123', role: ['GROUP_ADMIN'], groups: [1,3,4], profileImg: '/assets/Icons/woman-img-3.png', status: 'offline' },
    { id: '6', username: 'Super', email: 'super@mail.com', password: '123', role: ['SUPER_ADMIN'], groups: [1,2,3,4,5,6,7], profileImg: '/assets/Icons/man-img-3.png', status: 'offline' },
    { id: '7', username: 'Hao', email: 'hao@example.com', password: '123', role: ['USER'], groups: [], profileImg: '/assets/Icons/woman-img-4.png', status: 'offline' }
  ];
  