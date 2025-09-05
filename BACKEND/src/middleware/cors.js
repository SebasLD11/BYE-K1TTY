const cors = require('cors');

const normalize = (u) => (u || '').replace(/\/$/, '');

const allowed = [
  process.env.FRONT_URL,        // ej: https://tu-front.vercel.app  (sin barra)
  'http://localhost:4200'
].filter(Boolean).map(normalize);

const corsOpts = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/Postman
    const o = normalize(origin);
    return allowed.includes(o) ? cb(null, true) : cb(new Error('CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  maxAge: 86400
};

module.exports = cors(corsOpts);
