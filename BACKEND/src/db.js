// src/db.js
const mongoose = require('mongoose');
async function connectDB(){
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'bye-k1tty', maxPoolSize: 10 });
}
module.exports = { connectDB };
