const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'mydb';

const messages = [
  { channelId: 101, senderId: '1', senderName: 'Alice', content: 'Hello everyone!', timestamp: new Date() },
  { channelId: 101, senderId: '2', senderName: 'Bob', content: 'Hi Alice!', timestamp: new Date() },
  { channelId: 102, senderId: '3', senderName: 'Kevin', content: 'Anyone here?', timestamp: new Date() },
  { channelId: 103, senderId: '4', senderName: 'Taylor', content: 'Good morning!', timestamp: new Date() },
  { channelId: 101, senderId: '5', senderName: 'Stella', content: 'Welcome to the chat!', timestamp: new Date() }
];

(async function seedMessages() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Optional: clear existing messages if you want a fresh start
    await db.collection('messages').deleteMany({});

    // Insert messages
    await db.collection('messages').insertMany(messages);

    console.log('✅ Messages seeded successfully!');
  } catch (err) {
    console.error('❌ Failed to seed messages:', err);
  } finally {
    await client.close();
  }
})();
