const cors = require('cors');

const allowed = [
process.env.FRONT_URL,
'http://localhost:4200',
'https://your-vercel-domain.vercel.app'
].filter(Boolean);

const corsOpts = {
origin(origin, cb) {
if (!origin) return cb(null, true); // Postman/cURL
return allowed.includes(origin) ? cb(null, true) : cb(new Error('CORS'));
},
credentials: true,
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
maxAge: 86400
};

module.exports = cors(corsOpts);