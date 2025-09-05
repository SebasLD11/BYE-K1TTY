const mongoose = require('mongoose');

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      dbName: 'bye-k1tty',
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    }).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectDB };
