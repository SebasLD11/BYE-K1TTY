const Order = require('../models/Order');
const Product = require('../models/Product');
const StripeSdk = require('stripe');
const stripe = new StripeSdk(process.env.STRIPE_SECRET_KEY);

// POST /api/pay/stripe/checkout
exports.createCheckout = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'no_items' });

    const ids = items.map(i => i.id);
    const dbProducts = await Product.find({ _id: { $in: ids } }).lean();

    const line_items = items.map(i => {
      const p = dbProducts.find(x => String(x._id) === String(i.id));
      if (!p) throw Object.assign(new Error('product_not_found'), { status: 400 });
      return {
        price_data: {
          currency: 'eur',
          product_data: { name: p.name, images: p.images?.length ? [p.images[0]] : [] },
          unit_amount: Math.round(p.price * 100),
        },
        quantity: Math.max(1, Number(i.qty) || 1),
      };
    });

    const order = await Order.create({
      items: dbProducts.map(p => {
        const q = items.find(i => String(i.id) === String(p._id))?.qty || 1;
        return { productId: p._id, name: p.name, price: p.price, qty: q };
      }),
      total: dbProducts.reduce((s, p) => s + p.price * (items.find(i => String(i.id) === String(p._id))?.qty || 1), 0),
      status: 'pending',
    });

    const FRONT = (process.env.FRONT_URL || 'http://localhost:4200').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url: `${FRONT}/?success=1&session_id={CHECKOUT_SESSION_ID}`, // 👈 importante
      cancel_url: `${FRONT}/?cancel=1`,
      metadata: { orderId: String(order._id) },
    });

    await Order.findByIdAndUpdate(order._id, { stripeSessionId: session.id });
    res.status(200).json({ url: session.url });
  } catch (e) { next(e); }
};
// GET /api/pay/stripe/confirm?session_id=cs_test_...
exports.confirm = async (req, res, next) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'missing_session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      await Order.findOneAndUpdate(
        { stripeSessionId: session.id },
        { status: 'paid' }
      );
      return res.json({ ok: true, paid: true });
    }

    res.json({ ok: true, paid: false, status: session.payment_status });
  } catch (e) { next(e); }
};