// server.js
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./src/db');
const corsMw = require('./src/middleware/cors');
const errorMw = require('./src/middleware/error');

const productRoutes = require('./src/routes/product.routes');
const checkoutRoutes = require('./src/routes/checkout.routes');

const PORT = process.env.PORT || 5000;

const app = express();
app.set('trust proxy', 1);

// Core middlewares
app.use(corsMw);
app.options('*', corsMw.options || corsMw); // <- IMPORTANTE: preflight universal
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(morgan('tiny'));

// Body parser (si algún día usas webhook de Stripe, móntalo ANTES de este json)
app.use(express.json({ limit: '1mb' }));

// Routes
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.use('/api/products', productRoutes);
app.use('/api/pay', checkoutRoutes);

// Errors
app.use(errorMw);

// Arranque único: conecto DB y luego listen
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
  } catch (err) {
    console.error('[DB] connect error:', err?.message || err);
    process.exit(1);
  }
}
start();

module.exports = app;
