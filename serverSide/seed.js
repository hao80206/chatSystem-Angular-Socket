const { connectDB, getDB } = require('./App/app');
const users = require('./App/user');
const groups = require('./App/group');
const channels = require('./App/channel');
const messages = require('./App/message');

async function seed() {
  await connectDB();
  const db = getDB();

  // Insert users
  const userResult = await db.collection('users').insertMany(users);
  console.log(`Inserted ${userResult.insertedCount} users`);

  
  // Insert groups
  const groupResult = await db.collection('groups').insertMany(groups);
  console.log(`Inserted ${groupResult.insertedCount} groups`);

  // Insert channels
  const channelResult = await db.collection('channels').insertMany(channels);
  console.log(`Inserted ${channelResult.insertedCount} channels`);

  // Insert messages
  const messageResult = await db.collection('messages').insertMany(messages);
  console.log(`Inserted ${messageResult.insertedCount} messages`);

  process.exit(0);
}

seed().catch(err => console.error(err));