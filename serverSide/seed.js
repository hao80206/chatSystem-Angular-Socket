const { connectDB, getDB } = require('./App/app');
const users = require('./App/user');
const groups = require('./App/group');
const channels = require('./App/channel');
const messages = require('./App/message');

async function seed() {
  await connectDB();
  const db = getDB();

  // UNIQUE function ensures integrity and avoids potential login issues or collisions

  try {
    // --- USERS ---
    await db.collection('users').deleteMany({});
    const userResult = await db.collection('users').insertMany(users);
    // Indexes
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log(`Inserted ${userResult.insertedCount} users`);

    // --- GROUPS ---
    await db.collection('groups').deleteMany({});
    const groupResult = await db.collection('groups').insertMany(groups);
    await db.collection('groups').createIndex({ id: 1 }, { unique: true });
    console.log(`Inserted ${groupResult.insertedCount} groups`);

    // --- CHANNELS ---
    await db.collection('channels').deleteMany({});
    const channelResult = await db.collection('channels').insertMany(channels);
    await db.collection('channels').createIndex({ id: 1 }, { unique: true });
    await db.collection('channels').createIndex({ groupId: 1 });
    console.log(`Inserted ${channelResult.insertedCount} channels`);

    // --- MESSAGES ---
    await db.collection('messages').deleteMany({});
    const formattedMessages = messages.map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
    }));

    const messageResult = await db.collection('messages').insertMany(formattedMessages, { ordered: false });
    await db.collection('messages').createIndex({ channelId: 1 });
    await db.collection('messages').createIndex({ senderId: 1 });
    await db.collection('messages').createIndex({ timestamp: 1 });
    console.log(`Inserted ${messageResult.insertedCount} messages`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}

seed().catch(err => console.error(err));
