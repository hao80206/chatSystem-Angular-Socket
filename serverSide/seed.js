const { connectDB, getDB } = require('./App/app');
const users = require('./App/user');
const groups = require('./App/group');
const channels = require('./App/channel');
const messages = require('./App/message');
const bcrypt = require('bcrypt');

async function seed() {
  await connectDB();
  const db = getDB();

  try {
    // --- USERS with hashed passwords ---
    const saltRounds = 10;

    const usersWithHashedPasswords = await Promise.all(
      users.map(async user => ({
        ...user,
        password: await bcrypt.hash(user.password, saltRounds) // hash each user's password
      }))
    );

  // Insert users
  const userResult = await db.collection('users').insertMany(users);
  await db.collection('users').createIndex({ id: 1 }, { unique: true }); // userId unique
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  console.log(`Inserted ${userResult.insertedCount} users`);

  
  // Insert groups
  const groupResult = await db.collection('groups').insertMany(groups);
  await db.collection('groups').createIndex({ id: 1 }, { unique: true });
  await db.collection('channels').createIndex({ id: 1 }, { unique: true });
  await db.collection('channels').createIndex({ groupId: 1 }); // lookup channels by group
  console.log(`Inserted ${groupResult.insertedCount} groups`);

  // Insert channels
  const channelResult = await db.collection('channels').insertMany(channels);
  await db.collection('messages').createIndex({ channelId: 1 }); // get messages by channel
  await db.collection('messages').createIndex({ senderId: 1 }); // search messages by user
  await db.collection('messages').createIndex({ timestamp: 1 }); // sort messages by time
  console.log(`Inserted ${channelResult.insertedCount} channels`);

  // Insert messages with proper timestamps
  const formattedMessages = messages.map(m => ({
    ...m,
    timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
  }));

  const messageResult = await db.collection('messages').insertMany(formattedMessages, { ordered: false });
  await db.collection('messages').createIndex({ channelId: 1 });
  await db.collection('messages').createIndex({ senderId: 1 });
  await db.collection('messages').createIndex({ timestamp: 1 });
  console.log(`Inserted ${messageResult.insertedCount} messages`);

} catch(error) {
  console.error('Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}
seed().catch(err => console.error(err));