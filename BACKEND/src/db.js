const mongoose = require('mongoose');

function mask(uri='') {
  try {
    const u = new URL(uri); if (u.password) u.password = 'VGS_bk_admin'; return u.toString();
  } catch { return uri.slice(0, 40) + '...'; }
}

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  console.log('[Mongo] connecting to', mask(uri));
  await mongoose.connect(uri, { maxPoolSize: 10 });
  console.log('[Mongo] connected');
  return mongoose.connection;
}
module.exports = { connectDB };
