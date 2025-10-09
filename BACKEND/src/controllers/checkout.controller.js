const { z } = require('zod');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { quoteOptions } = require('../utils/shipping');
const path = require('path');
const { generateReceiptPDF } = require('../utils/pdf');

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
  if (['BK5','BYE5','DISCOUNT5'].includes(normalized)) return { discountCode:normalized, discountAmount:+(subtotal*0.05).toFixed(2) };
  return { discountCode:normalized, discountAmount:0 };
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

// === NUEVO finalize SIN SMTP NI TOKEN WA ===
exports.finalize = async (req, res, next) => {
  try {
    const input = summarySchema.parse(req.body);
    const s = await buildSummary(input);

    // crea/actualiza order
    const order = req.body.orderId
      ? await Order.findByIdAndUpdate(req.body.orderId, { ...s, status:'awaiting_payment' }, { new:true })
      : await Order.create({ ...s, status:'awaiting_payment' });

    // genera PDF
    const outDir = process.env.RECEIPTS_DIR || path.join(__dirname, '../../uploads/receipts');
    const { filename } = await generateReceiptPDF(order.toObject(), { outDir, brandLogoUrl: process.env.BRAND_LOGO_URL });

    // BASE_URL no existe: derivamos del request (trust proxy ya está en server.js)
    const base = `${req.protocol}://${req.get('host')}`;
    const receiptUrl = `${base}/receipts/${filename}`;
    await Order.findByIdAndUpdate(order._id, { receiptPath: filename });

    // enlaces de “compartir” sin credenciales
    const subject = 'Tu recibo — BYE K1TTY';
    const body = `¡Gracias por tu compra en BYE K1TTY!
    Total: €${s.total.toFixed(2)}
    Recibo PDF: ${receiptUrl}
    Cupón -5%: BK5`;

    const mailto = `mailto:${encodeURIComponent(order.buyer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const vendor = (process.env.VENDOR_WHATSAPP_NUMBER || '').replace(/^\+/, '');
    const wa = vendor
      ? `https://wa.me/${vendor}?text=${encodeURIComponent(`Nuevo pedido Bizum:
      Cliente: ${order.buyer.fullName} (${order.buyer.phone})
      Total: €${order.total.toFixed(2)}
      Recibo: ${receiptUrl}`)}`
      : null;

    // devolvemos receipt + enlaces para que el front los use
    return res.json({ ok:true, orderId: order._id, receiptUrl, share: { mailto, wa } });
  } catch (e) { next(e); }
};
