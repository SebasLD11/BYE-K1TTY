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

const app = express();
connectDB();

app.set('trust proxy', 1);
app.use(corsMw);
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(morgan('tiny'));

// JSON para el resto
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.use('/api/products', productRoutes);
app.use('/api/pay', checkoutRoutes);

app.use(errorMw);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
