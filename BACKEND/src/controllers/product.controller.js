// BACKEND/src/controllers/product.controller.js
const Product = require('../models/Product');
const FRONT = (process.env.FRONT_URL || 'http://localhost:4200').replace(/\/$/, '');
const abs = p => /^https?:\/\//i.test(p) ? p : `${FRONT}/${String(p||'').replace(/^\//,'')}`;

const serialize = p => ({
  _id: String(p._id),
  name: p.name,
  price: p.price,
  tag: p.tag,
  images: (Array.isArray(p.images)? p.images:[]).map(abs)
});

exports.list = async (_req, res, next) => {
  try {
    const docs = await Product.find({}).sort({createdAt:-1, _id:-1}).lean();
    return res.json(docs.map(serialize)); // array simple
  } catch (e) { next(e); }
};


// GET /api/products/:id
exports.getOne = async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(400).json({ error: 'bad_id' });

    const doc = await Product.findById(id).lean();
    if (!doc) return res.status(404).json({ error: 'not_found' });

    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.json(serialize(doc));
  } catch (e) { next(e); }
};
