// src/controllers/product.controller.js
const Product = require('../models/Product');

const FRONT = (process.env.FRONT_URL || 'http://localhost:4200').replace(/\/$/, '');

// Convierte 'assets/img/...' → 'https://tu-front.vercel.app/assets/img/...'
function absUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${FRONT}/${String(path).replace(/^\//, '')}`;
}

// Normaliza un producto para respuesta pública
function serialize(p) {
  return {
    _id: String(p._id),
    name: p.name,
    price: p.price,
    tag: p.tag,
    images: Array.isArray(p.images) ? p.images.map(absUrl) : [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * GET /api/products
 * Query:
 *  - tag: new|best|sale|drop
 *  - page: number (>=1)
 *  - limit: number (1..100)
 *  - sort: recent|price_asc|price_desc
 */
exports.list = async (req, res, next) => {
  try {
    const { tag, page = 1, limit = 24, sort = 'recent' } = req.query;

    const q = {};
    if (tag && ['new', 'best', 'sale', 'drop'].includes(String(tag))) q.tag = tag;

    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const skip = (pg - 1) * lim;

    let sortBy = { createdAt: -1, _id: -1 };
    if (sort === 'price_asc') sortBy = { price: 1, _id: 1 };
    else if (sort === 'price_desc') sortBy = { price: -1, _id: -1 };

    const [items, total] = await Promise.all([
      Product.find(q).sort(sortBy).skip(skip).limit(lim).lean(),
      Product.countDocuments(q)
    ]);

    // Cache amable para listados (ajusta a tu gusto)
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.set('Vary', 'Origin');

    res.json({
      page: pg,
      limit: lim,
      total,
      items: items.map(serialize),
    });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/products/:id
 */
exports.getOne = async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(400).json({ error: 'bad_id' });

    const doc = await Product.findById(id).lean();
    if (!doc) return res.status(404).json({ error: 'not_found' });

    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.json(serialize(doc));
  } catch (e) {
    next(e);
  }
};
