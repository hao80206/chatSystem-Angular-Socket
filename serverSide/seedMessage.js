const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'mydb';

const messages = [
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

(async function seedMessages() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Optional: clear existing messages
    await db.collection('messages').deleteMany({});

    // Insert messages
    const result = await db.collection('messages').insertMany(messages);

    // Optional: create indexes for efficiency
    await db.collection('messages').createIndex({ channelId: 1 });
    await db.collection('messages').createIndex({ senderId: 1 });
    await db.collection('messages').createIndex({ timestamp: 1 });

    console.log(`✅ Inserted ${result.insertedCount} messages successfully!`);
  } catch (err) {
    console.error('❌ Failed to seed messages:', err);
  } finally {
    await client.close();
  }
})();
