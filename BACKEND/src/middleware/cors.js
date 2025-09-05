const cors = require('cors');

function norm(s=''){ return s.replace(/\/+$/,''); }

const allowed = [
  process.env.FRONT_URL,                 // p.ej. https://bye-k1tty.vercel.app
  'http://localhost:4200',
  'http://127.0.0.1:4200'
].filter(Boolean).map(norm);

const corsOpts = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/Postman
    const o = norm(origin);
    return allowed.includes(o) ? cb(null, true) : cb(new Error('CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  maxAge: 86400
};

module.exports = cors(corsOpts);
