const Product = require('../models/Product');

exports.list = async (_req, res, next) => {
try {
const products = await Product.find().sort({ createdAt: -1 });
res.json(products);
} catch (e) { next(e); }
};