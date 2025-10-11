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
  { 
    channelId: 101, 
    senderId: '1', 
    senderName: 'Alice', 
    content: 'Hello everyone!', 
    type: 'text',
    timestamp: new Date(),
    profileImg: '/assets/Icons/woman-img-1.png'
  },
  { 
    channelId: 101, 
    senderId: '2', 
    senderName: 'Bob', 
    content: 'Hi Alice!', 
    type: 'text',
    timestamp: new Date(),
    profileImg: '/assets/Icons/man-img-1.png'
  },
  { 
    channelId: 102, 
    senderId: '3', 
    senderName: 'Kevin', 
    content: 'Anyone here?', 
    type: 'text',
    timestamp: new Date(),
    profileImg: '/assets/Icons/man-img-2.png'
  },
  { 
    channelId: 103, 
    senderId: '4', 
    senderName: 'Taylor', 
    content: 'Good morning!', 
    type: 'text',
    timestamp: new Date(),
    profileImg: '/assets/Icons/woman-img-2.png'
  },
  { 
    channelId: 101, 
    senderId: '5', 
    senderName: 'Stella', 
    content: 'Welcome to the chat!', 
    type: 'text',
    timestamp: new Date(),
    profileImg: '/assets/Icons/woman-img-3.png'
  }
];
