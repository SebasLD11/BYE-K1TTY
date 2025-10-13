// utils/pdf.js
const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function bufferFromUrl(url){ const r=await axios.get(url,{responseType:'arraybuffer'}); return Buffer.from(r.data); }

async function generateReceiptPDF(order, { outDir, brandLogoUrl }) {
  const filename = `receipt_${String(order._id).slice(-8)}_${Date.now()}.pdf`;
  const fullPath = path.join(outDir, filename);
  await fs.promises.mkdir(outDir, { recursive: true });

  const doc = new PDFDocument({ size:'A4', margin:40 });
  const stream = fs.createWriteStream(fullPath);
  doc.pipe(stream);

  // Helpers
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const L = doc.page.margins.left;         // x inicio
  const R = L + pageWidth;                  // x final
  const Y = (val) => { doc.y = val; return val; };
  const line = (y) => { doc.moveTo(L, y).lineTo(R, y).strokeColor('#ddd').lineWidth(1).stroke(); };
  const textRight = (txt, x, y, w) => doc.text(txt, x, y, { width:w, align:'right' });
  const textCenter= (txt, x, y, w) => doc.text(txt, x, y, { width:w, align:'center' });

  // Cabecera
  if (brandLogoUrl) { try { doc.image(await bufferFromUrl(brandLogoUrl), L, Y(40), { width: 120 }); } catch {} }
  doc.fontSize(18).text('RECIBO', R-120, 40, { width:120, align:'right' });

  // Bloque datos
  doc.fontSize(10);
  const yTop = 80;

  // Vendedor
  doc.font('Helvetica-Bold').text('Vendedor:', L, Y(yTop));
  doc.font('Helvetica').text('BYE K1TTY — NIF/CIF: 48273903P');
  doc.text('C/Ripollès 87, La mora. Tarragona, 43008');
  doc.text('Email: aharonbj96@gmail.com · Tel: +34 634 183 862');

  // Pedido
  const yVendEnd = doc.y;
  const col2x = L + pageWidth * 0.45;
  doc.font('Helvetica-Bold').text('Pedido', col2x, yTop);
  doc.font('Helvetica').text(`Nº: ${order._id}`, col2x);
  doc.text(`Fecha: ${new Date(order.createdAt || Date.now()).toLocaleDateString('es-ES')}`, col2x);

  // Comprador
  const yPedEnd = doc.y;
  const col3x = L + pageWidth * 0.65;
  doc.font('Helvetica-Bold').text('Comprador', col3x, yTop);
  const b = order.buyer || {};
  doc.font('Helvetica').text(`${b.fullName || ''}`, col3x);
  doc.text(`${b.email || ''} — ${b.phone || ''}`, col3x);
  doc.text(`${b.line1 || ''} ${b.line2 || ''}`, col3x);
  doc.text(`${b.postalCode || ''} ${b.city || ''} (${b.province || ''})`, col3x);

  // Envío
  const yCompEnd = doc.y;
  const yBlocksEnd = Math.max(yVendEnd, yPedEnd, yCompEnd);
  Y(yBlocksEnd + 16);
  doc.font('Helvetica-Bold').text('Envío');
  doc.font('Helvetica').text(`${order.shipping?.carrier || '—'} — ${order.shipping?.service || '—'}`);
  doc.text(order.shipping?.zone ? `Zona: ${order.shipping.zone}` : '');

  // Tabla artículos
  Y(doc.y + 12);
  line(doc.y); Y(doc.y + 8);

  const xProd = L;
  const wProd = pageWidth * 0.52;
  const xQty  = L + pageWidth * 0.57;
  const wQty  = pageWidth * 0.08;
  const xPrice= L + pageWidth * 0.67;
  const wPrice= pageWidth * 0.13;
  const xAmt  = L + pageWidth * 0.82;
  const wAmt  = pageWidth * 0.18;

  doc.font('Helvetica-Bold');
  doc.text('Producto', xProd, doc.y, { width:wProd });
  textCenter('Cant.', xQty, doc.y, wQty);
  textRight('Precio', xPrice, doc.y, wPrice);
  textRight('Importe', xAmt, doc.y, wAmt);

  Y(doc.y + 12);
  line(doc.y); Y(doc.y + 6);
  doc.font('Helvetica');

  for (const it of order.items || []) {
    const name = it.size ? `${it.name} — Talla ${it.size}` : it.name;
    doc.text(name, xProd, doc.y, { width:wProd });
    textCenter(String(it.qty), xQty, doc.y, wQty);
    textRight(`€${Number(it.price).toFixed(2)}`, xPrice, doc.y, wPrice);
    textRight(`€${(Number(it.price)*Number(it.qty)).toFixed(2)}`, xAmt, doc.y, wAmt);
    Y(doc.y + 6);
  }

  Y(doc.y + 4);
  line(doc.y);
  Y(doc.y + 10);

  // Resumen (alineado a la derecha, sin solaparse)
  const colW = 160;
  const colX = R - colW;

  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discountAmount || 0);
  const vatAmt   = Number(order.vatAmount || 0); // informativo (IVA incluido)
  const shipCost = Number(order.shipping?.cost || 0);
  const total    = Number(order.total || (subtotal - discount + shipCost));

  doc.font('Helvetica');
  doc.text('Subtotal (IVA incl.)', colX, doc.y, { width: colW/2 }); textRight(`€${subtotal.toFixed(2)}`, colX, doc.y, colW);
  if (discount > 0) {
    Y(doc.y + 12);
    doc.text(`Descuento ${order.discountCode ? `(${order.discountCode})` : ''}`, colX, doc.y, { width: colW/2 });
    textRight(`-€${discount.toFixed(2)}`, colX, doc.y, colW);
  }
  Y(doc.y + 12);
  doc.text('IVA (informativo)', colX, doc.y, { width: colW/2 }); textRight(`€${vatAmt.toFixed(2)}`, colX, doc.y, colW);
  if (order.shipping) {
    Y(doc.y + 12);
    doc.text(`Envío`, colX, doc.y, { width: colW/2 }); textRight(`€${shipCost.toFixed(2)}`, colX, doc.y, colW);
  }

  // Total (negrita)
  Y(doc.y + 14);
  doc.font('Helvetica-Bold');
  doc.text('Total', colX, doc.y, { width: colW/2 });
  textRight(`€${total.toFixed(2)}`, colX, doc.y, colW);

  // Nota de pago
  Y(doc.y + 18);
  line(doc.y); Y(doc.y + 10);
  doc.font('Helvetica').fontSize(9).text(
    'Método de pago: Bizum pendiente de confirmación por el vendedor.\nGracias por tu compra. Cupón -10% para próxima compra: BK10',
    L, doc.y, { width: pageWidth }
  );

  doc.end();
  await new Promise(r => stream.on('finish', r));
  return { filename, fullPath };
}
module.exports = { generateReceiptPDF };
