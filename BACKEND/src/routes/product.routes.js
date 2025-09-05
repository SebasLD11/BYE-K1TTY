// GET /api/products -> lee de Atlas usando MONGO_URI
const { connectDB } = require('./_lib/db');
const Product = require('./_models/Product');

const USE_MOCK = process.env.USE_MOCK_PRODUCTS === 'true';

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

    if (USE_MOCK) {
      return res.status(200).json([]); // o tu mock temporal
    }

    await connectDB();
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(products);
  } catch (e) {
    console.error('[products]', e);
    res.status(500).json({ error: 'server_error' });
  }
};
