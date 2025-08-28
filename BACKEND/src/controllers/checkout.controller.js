// backend/src/controllers/checkout.controller.js (añade al final)
const Order = require('../models/Order');

exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // lo obtienes en 6.2
  let event;

  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejo de eventos relevantes
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Marca la orden como pagada por session.id
    await Order.findOneAndUpdate(
      { stripeSessionId: session.id },
      { status: 'paid' }
    );
  }

  res.json({ received: true });
};
