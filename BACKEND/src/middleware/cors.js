const cors = require('cors');
const norm = s => (s||'').replace(/\/+$/,''); // quita / final

const allowed = [
  process.env.FRONT_URL,         // e.g. https://bye-k1tty.vercel.app
  'https://bye-k1tty-vgs-distribution.vercel.app',
].filter(Boolean).map(norm);

module.exports = cors({
  origin(origin, cb){
    if (!origin) return cb(null,true);
    return allowed.includes(norm(origin)) ? cb(null,true) : cb(new Error('CORS'));
  },
  credentials:true,
  methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders:['Content-Type','Authorization','X-Requested-With'],
  maxAge:86400
});
