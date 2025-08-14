const mongoose = require('mongoose');

let isConnected = false;

async function connectMongo(uri) {
  if (!uri) throw new Error('Missing MONGODB_URI');
  if (isConnected) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || 'extrahand',
  });
  isConnected = true;
  return mongoose.connection;
}

module.exports = { connectMongo };

