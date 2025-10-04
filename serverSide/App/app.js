const { MongoClient } = require('mongodb');

const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);

let db;

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    db = client.db('mydb');
    return db;
  } catch (err) {
    console.error('MongoDB connection error', err);
    throw err;
  }
}

function getDB() {
  if (!db) throw new Error('Database not connected');
  return db;
}

module.exports = { connectDB, getDB };
