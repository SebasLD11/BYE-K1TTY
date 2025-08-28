// src/routes/product.routes.js
const router = require('express').Router();
const Product = require('../models/Product');

// copia el mismo DATA del seed.js o impórtalo desde un módulo común
const USE_MOCK = process.env.USE_MOCK_PRODUCTS === 'true';
const DATA = [ /* ...tus objetos con images... */ ];

router.get('/', async (_req,res) => {
  if (USE_MOCK) return res.json(DATA);
  const products = await Product.find().lean();
  res.json(products);
});

module.exports = router;
