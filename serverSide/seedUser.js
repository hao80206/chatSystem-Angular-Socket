const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'mydb';

const users = [
  { id: '1', username: 'Alice', email: 'alice@mail.com', password: '123', role: ['USER'], groups: [1,2,5,7] },
  { id: '2', username: 'Bob', email: 'bob@mail.com', password: '123', role: ['USER'], groups: [2,3,6,7] },
  { id: '3', username: 'Kevin', email: 'kevin@mail.com', password: '123', role: ['USER'], groups: [1,4,6,7] },
  { id: '4', username: 'Taylor', email: 'taylor@mail.com', password: '123', role: ['USER'], groups: [1,2,3,4] },
  { id: '5', username: 'Stella', email: 'stella@mail.com', password: '123', role: ['GROUP_ADMIN'], groups: [1,3,4] },
  { id: '6', username: 'Super', email: 'super@mail.com', password: '123', role: ['SUPER_ADMIN'], groups: [1,2,3,4,5,6,7] }
];

const profileImgs = [
  '/assets/Icons/woman-img-1.png',
  '/assets/Icons/woman-img-2.png',
  '/assets/Icons/woman-img-3.png',
  '/assets/Icons/woman-img-4.png',
  '/assets/Icons/man-img-1.png',
  '/assets/Icons/man-img-2.png',
  '/assets/Icons/man-img-3.png'
];

(async function seedUsers() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Delete old users
    await db.collection('users').deleteMany({});

    // Add profileImg + status
    const formattedUsers = users.map((user, i) => ({
      ...user,
      profileImg: profileImgs[i % profileImgs.length],
      status: 'offline'
    }));

    // Insert users
    const result = await db.collection('users').insertMany(formattedUsers);

    // Create indexes
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });

    console.log(`✅ Inserted ${result.insertedCount} users with plaintext passwords`);
  } catch (err) {
    console.error('❌ Error seeding users:', err);
  } finally {
    await client.close();
  }
})();
