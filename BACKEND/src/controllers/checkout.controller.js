const Order = require('../models/Order');
const Product = require('../models/Product');
const StripeSdk = require('stripe');
const stripe = new StripeSdk(process.env.STRIPE_SECRET_KEY);

// Convierte rutas relativas (assets/...) en URLs absolutas (Stripe exige https)
function absUrl(maybeUrl, frontBase) {
  if (!maybeUrl) return undefined;
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  return `${frontBase}/${String(maybeUrl).replace(/^\//, '')}`;
}

// POST /api/pay/stripe/checkout
exports.createCheckout = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'no_items' });

    const ids = items.map(i => i.id);
    const dbProducts = await Product.find({ _id: { $in: ids } }).lean();

    const FRONT = (process.env.FRONT_URL || 'http://localhost:4200').replace(/\/$/, '');

    const line_items = items.map(i => {
      const p = dbProducts.find(x => String(x._id) === i.id);
      if (!p) throw new Error('product_not_found');
      const img = absUrl(p.images?.[0], FRONT);
      return {
        price_data: {
          currency: 'eur',
          product_data: { name: p.name, ...(img ? { images: [img] } : {}) },
          unit_amount: Math.round(p.price * 100),
        },
        quantity: Math.max(1, Number(i.qty) || 1),
      };
    });

    const order = await Order.create({
      items: dbProducts.map(p => {
        const q = items.find(i => i.id === String(p._id))?.qty || 1;
        return { productId: p._id, name: p.name, price: p.price, qty: q };
      }),
      total: dbProducts.reduce((s, p) => s + p.price * (items.find(i => i.id === String(p._id))?.qty || 1), 0),
      status: 'pending',
    });

    // Importante: añade session_id para confirmación sin webhook
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url: `${FRONT}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONT}/?cancel=1`,
      metadata: { orderId: String(order._id) },
    });

    await Order.findByIdAndUpdate(order._id, { stripeSessionId: session.id });
    res.status(200).json({ url: session.url });
  } catch (e) {
    next(e);
  }
};

// MODO A (recomendado en prod) — Webhook Stripe
// POST /api/pay/stripe/webhook  (express.raw en la ruta)
exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // whsec_...
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await Order.findOneAndUpdate({ stripeSessionId: session.id }, { status: 'paid' });
  }
  res.json({ received: true });
};

// MODO B (sin webhook) — Confirmación manual tras volver de Stripe
// GET /api/pay/stripe/confirm?session_id=cs_test_...
exports.confirm = async (req, res, next) => {
  try {
    const id = req.query.session_id;
    if (!id) return res.status(400).json({ error: 'missing_session' });
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.payment_status === 'paid') {
      await Order.findOneAndUpdate({ stripeSessionId: id }, { status: 'paid' });
    }
    res.json({ ok: true, payment_status: session.payment_status });
  } catch (e) { next(e); }
};
