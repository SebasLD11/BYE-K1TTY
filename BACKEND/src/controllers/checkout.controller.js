// src/controllers/checkout.controller.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const StripeSdk = require('stripe');
const stripe = new StripeSdk(process.env.STRIPE_SECRET_KEY);

// POST /api/pay/stripe/checkout
exports.createCheckout = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'no_items' });

    // Carga productos y crea line_items
    const ids = items.map(i => i.id);
    const dbProducts = await Product.find({ _id: { $in: ids } }).lean();

    const line_items = items.map(i => {
      const p = dbProducts.find(x => String(x._id) === i.id);
      if (!p) throw new Error('product_not_found');
      return {
        price_data: {
          currency: 'eur',
          product_data: { name: p.name, images: p.images?.length ? [p.images[0]] : [] },
          unit_amount: Math.round(p.price * 100),
        },
        quantity: Math.max(1, Number(i.qty) || 1),
      };
    });

    // Crea Order preliminar
    const order = await Order.create({
      items: dbProducts.map(p => {
        const q = items.find(i => i.id === String(p._id))?.qty || 1;
        return { productId: p._id, name: p.name, price: p.price, qty: q };
      }),
      total: dbProducts.reduce((s, p) => s + p.price * (items.find(i => i.id === String(p._id))?.qty || 1), 0),
      status: 'pending',
    });

    const FRONT = (process.env.FRONT_URL || 'http://localhost:4200').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url: `${FRONT}/?success=1`,
      cancel_url: `${FRONT}/?cancel=1`,
      metadata: { orderId: String(order._id) },
    });

    await Order.findByIdAndUpdate(order._id, { stripeSessionId: session.id });
    res.status(200).json({ url: session.url });
  } catch (e) {
    next(e);
  }
};

// POST /api/pay/stripe/webhook  (montado en server.js con express.raw)
exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await Order.findOneAndUpdate(
      { stripeSessionId: session.id },
      { status: 'paid' }
    );
  }
  res.json({ received: true });
};
