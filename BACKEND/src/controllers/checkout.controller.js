const { z } = require('zod');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { quoteOptions } = require('../utils/shipping');
const path = require('path');
const { generateReceiptPDF } = require('../utils/pdf');
const { sendMail, hasSMTP } = require('../utils/email');

// extrae email de 'Nombre <mail@dominio>'
const pickEmail = (s='') => {
  const m = String(s).match(/<([^>]+)>/);
  if (m) return m[1].trim();
  if (s.includes('@')) return s.trim();
  return '';
};

const itemSchema = z.object({ id: z.string(), qty: z.number().min(1), size: z.string().min(1).nullable().optional() });
const buyerSchema = z.object({
  fullName: z.string().min(2), email: z.string().email(), phone: z.string().min(6),
  line1: z.string().min(3), line2: z.string().optional().nullable(),
  city: z.string().min(2), province: z.string().min(2), postalCode: z.string().min(3),
  country: z.string().length(2).default('ES'),
});
const summarySchema = z.object({
  items: z.array(itemSchema).min(1), buyer: buyerSchema,
  discountCode: z.string().optional().nullable(),
  shipping: z.object({ carrier:z.string(), service:z.string(), zone:z.string(), cost:z.number().nonnegative() }).optional(),
});

function applyDiscount(subtotal, code) {
  const normalized = String(code||'').trim().toUpperCase();
  if (!normalized) return { discountCode:null, discountAmount:0 };
  if (['BK10','BYE10','DISCOUNT10'].includes(normalized)) return { discountCode:normalized, discountAmount:+(subtotal*0.09).toFixed(2) };
  return { discountCode:normalized, discountAmount:0 };
}

// WA robusto
function waLinkForVendor(number, order, receiptUrl){
  const digits = String(number || '').replace(/\D+/g,'');
  if (!digits) return null;
  const text = [
    'Nuevo pedido Bizum:',
    `Cliente: ${order?.buyer?.fullName || ''} (${order?.buyer?.phone || ''})`,
    `Total: €${(order?.total || 0).toFixed(2)}`,
    `Recibo: ${receiptUrl}`
  ].join('\n');
  const qs = new URLSearchParams({ text }).toString();
  return `https://wa.me/${digits}?${qs}`;
}

// Unifica mensajes de email/WA para NO duplicar lógica
function buildComms(order, receiptUrl){
  const total = (order?.total || 0).toFixed(2);

  const buyer = {
    subject: 'Tu recibo — BYE K1TTY',
    text:
    `¡Gracias por tu compra en BYE K1TTY!
    Adjuntamos tu recibo en PDF.
    Total: €${total}
    Si tienes cualquier duda, responde a este correo.`
  };

  const vendor = {
    subject: `Nuevo pedido BYE K1TTY — ${String(order?._id || '').slice(-8)}`,
    text:
    `Nuevo pedido recibido (pendiente de pago Bizum).
    Cliente: ${order?.buyer?.fullName} (${order?.buyer?.phone})
    Total: €${total}
    Adjuntamos el recibo PDF.`
  };

  const waVendor = waLinkForVendor(process.env.VENDOR_WHATSAPP_NUMBER, order, receiptUrl);
  return { buyer, vendor, waVendor };
}

async function buildSummary({ items, buyer, discountCode, shipping }) {
  const ids = items.map(i => i.id);
  const dbProducts = await Product.find({ _id: { $in: ids } }).lean();

  const lines = items.map(i => {
    const p = dbProducts.find(d => String(d._id) === String(i.id));
    if (!p) throw Object.assign(new Error('product_not_found'), { status:400 });
    if (Array.isArray(p.sizes) && p.sizes.length && (!i.size || !p.sizes.includes(String(i.size)))) {
      throw Object.assign(new Error('invalid_size'), { status:400 });
    }
    return {
      productId: p._id, name: p.name, price: Number(p.price),
      qty: Math.max(1, Number(i.qty||1)), size: i.size ?? null, img: p.images?.[0] || null
    };
  });
  

  const subtotal = lines.reduce((s,l)=>s + l.price * l.qty, 0);        // precios YA con IVA
  const { discountCode:disc, discountAmount } = applyDiscount(subtotal, discountCode);

  const vatRate = Number(process.env.DEFAULT_VAT_RATE || 0.21);
  const baseGross = +(subtotal - discountAmount).toFixed(2);           // bruto con IVA
  // IVA “incluido”: parte del bruto que es IVA, SOLO informativo
  const vatAmount = +((baseGross) - (baseGross / (1 + vatRate))).toFixed(2);

  // Envío gratis a partir de 100€ (configurable por env, por defecto 100)
  const FREE_SHIPPING = Number(process.env.FREE_SHIPPING_THRESHOLD || 100);
  let shippingOptions = [];
  let shippingSel = shipping || null;

  if (!shippingSel) {
    shippingOptions = quoteOptions(buyer);
  }
  if (baseGross >= FREE_SHIPPING) {
    shippingOptions = (shippingOptions || []).map(o => ({ ...o, cost: 0 }));
    if (shippingSel) shippingSel = { ...shippingSel, cost: 0 };
  }

  const shippingCost = shippingSel?.cost || 0;
  // TOTAL: como los precios ya incluyen IVA, NO sumamos IVA otra vez
  const total = +(baseGross + shippingCost).toFixed(2);

  return {
    items: lines, subtotal, discountCode: disc, discountAmount,
    vatRate, vatAmount, shipping: shippingSel, buyer, total, shippingOptions
  };
}

exports.summary = async (req, res, next) => {
  try {
    const input = summarySchema.omit({ shipping:true }).parse(req.body);
    const s = await buildSummary(input);
    const order = await Order.create({ ...s, status:'review' });
    return res.json({ orderId: order._id, ...s, shippingOptions: s.shippingOptions });
  } catch (e) { next(e); }
};

exports.finalize = async (req, res, next) => {
  try {
    const input = summarySchema.parse(req.body);
    const s = await buildSummary(input);

    const order = req.body.orderId
      ? await Order.findByIdAndUpdate(req.body.orderId, { ...s, status:'awaiting_payment' }, { new:true })
      : await Order.create({ ...s, status:'awaiting_payment' });

    const outDir = process.env.RECEIPTS_DIR || path.join(__dirname, '../../uploads/receipts');
    const { filename } = await generateReceiptPDF(order.toObject(), { outDir, brandLogoUrl: process.env.BRAND_LOGO_URL });

    const base = `${req.protocol}://${req.get('host')}`;
    const receiptUrl = `${base}/receipts/${filename}`;
    await Order.findByIdAndUpdate(order._id, { receiptPath: filename });

    // Un solo origen para mensajes/enlaces
    const { buyer, vendor, waVendor } = buildComms(order.toObject(), receiptUrl);

    // mailto Fallbacks (por si en Thanks falla el envío real)
    const buyerEmail  = order.buyer?.email || '';
    const vendorEmail = process.env.VENDOR_EMAIL || '';
    const mailtoBuyer  = buyerEmail  ? `mailto:${encodeURIComponent(buyerEmail)}?subject=${encodeURIComponent(buyer.subject)}&body=${encodeURIComponent(buyer.text)}`: null;
    const mailtoVendor = vendorEmail ? `mailto:${encodeURIComponent(vendorEmail)}?subject=${encodeURIComponent(vendor.subject)}&body=${encodeURIComponent(vendor.text)}`: null;

    return res.json({
      ok: true,
      orderId: order._id,
      receiptUrl,
      share: { mailtoBuyer, mailtoVendor, waVendor }
    });
  } catch (e) { next(e); }
};

exports.emailBuyer = async (req, res) => {
  try {
    if (!hasSMTP()) return res.status(400).json({ ok:false, code:'email_service_unconfigured' });
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ ok:false, code:'order_id_missing' });

    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ ok:false, code:'order_not_found' });

    const to = order.buyer?.email;
    if (!to) return res.status(400).json({ ok:false, code:'buyer_email_missing' });

    const base = `${req.protocol}://${req.get('host')}`;
    const filename = order.receiptPath ? path.basename(order.receiptPath) : null;
    const receiptUrl = order.receiptPath ? `${base}/receipts/${order.receiptPath}` : null;

    const subject = 'Tu recibo — BYE K1TTY';
    const text = [
      '¡Gracias por tu compra en BYE K1TTY!',
      `Total: €${Number(order.total).toFixed(2)}`,
      'Adjuntamos tu recibo en PDF.',
      'Si tienes cualquier duda, responde a este correo.'
    ].join('\n');

    await sendMail({
      to, subject, text,
      attachments: receiptUrl ? [{ filename, path: receiptUrl, contentType:'application/pdf' }] : []
    });

    return res.json({ ok:true });
  } catch (e) {
    if (e.code === 'email_service_unconfigured')
      return res.status(400).json({ ok:false, code:'email_service_unconfigured' });
    console.error('[emailBuyer]', e);
    return res.status(500).json({ ok:false, code:'email_send_failed' });
  }
};

exports.emailVendor = async (req, res) => {
  try {
    if (!hasSMTP()) return res.status(400).json({ ok:false, code:'email_service_unconfigured' });
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ ok:false, code:'order_id_missing' });

    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ ok:false, code:'order_not_found' });

    const vendorEmail = process.env.VENDOR_EMAIL || pickEmail(process.env.FROM_EMAIL || '');
    if (!vendorEmail) return res.status(400).json({ ok:false, code:'vendor_email_missing' });

    const base = `${req.protocol}://${req.get('host')}`;
    const filename = order.receiptPath ? path.basename(order.receiptPath) : null;
    const receiptUrl = order.receiptPath ? `${base}/receipts/${order.receiptPath}` : null;

    const subject = `Nuevo pedido Bizum — ${String(order._id).slice(-8)}`;
    const text = [
      `Pedido: ${order._id}`,
      `Comprador: ${order.buyer?.fullName} (${order.buyer?.phone})`,
      `Total: €${Number(order.total).toFixed(2)}`,
      'Adjuntamos recibo en PDF.'
    ].join('\n');

    await sendMail({
      to: vendorEmail, subject, text,
      attachments: receiptUrl ? [{ filename, path: receiptUrl, contentType:'application/pdf' }] : []
    });

    return res.json({ ok:true });
  } catch (e) {
    if (e.code === 'email_service_unconfigured')
      return res.status(400).json({ ok:false, code:'email_service_unconfigured' });
    console.error('[emailVendor]', e);
    return res.status(500).json({ ok:false, code:'email_send_failed' });
  }
};