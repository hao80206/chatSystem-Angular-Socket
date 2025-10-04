const { getDB } = require('./app');

class MessageService {
  constructor() {
    this.collectionName = 'messages';
  }

  async createMessage(message) {
    const db = getDB();
    const result = await db.collection(this.collectionName).insertOne(message);
    return result.ops[0];
  }

  async getMessagesByChannel(channelId) {
    const db = getDB();
    return await db.collection(this.collectionName)
      .find({ channelId: Number(channelId) })
      .sort({ timestamp: 1 }) // oldest first
      .toArray();
  }

  async deleteMessage(messageId) {
    const db = getDB();
    await db.collection(this.collectionName).deleteOne({ id: Number(messageId) });
  }
}

module.exports = new MessageService();

// Dummy messages for seeding
module.exports = [
  { id: 1, channelId: 101, senderId: '1', senderName: 'Alice', content: 'Hello everyone!', timestamp: new Date() },
  { id: 2, channelId: 101, senderId: '2', senderName: 'Bob', content: 'Hi Alice!', timestamp: new Date() },
  { id: 3, channelId: 102, senderId: '3', senderName: 'Kevin', content: 'Anyone here?', timestamp: new Date() },
  { id: 4, channelId: 103, senderId: '4', senderName: 'Taylor', content: 'Good morning!', timestamp: new Date() },
  { id: 5, channelId: 101, senderId: '5', senderName: 'Stella', content: 'Welcome to the chat!', timestamp: new Date() }
];
