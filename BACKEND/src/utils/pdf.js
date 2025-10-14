// utils/pdf.js
const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function bufferFromUrl(url){
  const r = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(r.data);
}

async function generateReceiptPDF(order, { outDir, brandLogoUrl }) {
  const filename = `receipt_${String(order._id).slice(-8)}_${Date.now()}.pdf`;
  const fullPath = path.join(outDir, filename);
  await fs.promises.mkdir(outDir, { recursive: true });

  const doc = new PDFDocument({ size: 'A4', margin: 48 }); // margen algo mayor
  const stream = fs.createWriteStream(fullPath);
  doc.pipe(stream);

  // === Helpers ===
  const L = doc.page.margins.left;
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const R = L + W;
  const gutter = 14;

  const line = (y) => {
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  };

  // === Cabecera ===
  let y = 48;
  if (brandLogoUrl) {
    try { doc.image(await bufferFromUrl(brandLogoUrl), L, y, { width: 120 }); } catch {}
  }
  doc.font('Helvetica-Bold').fontSize(18).text('RECIBO', R - 140, y, { width: 140, align: 'right' });

  // === Bloques superiores en 3 columnas (sin solapes) ===
  y += 36;
  const colW = (W - gutter * 2) / 3;
  const yTop = y;

  // Vendedor
  let y1 = yTop;
  doc.font('Helvetica-Bold').fontSize(10).text('Vendedor:', L, y1, { width: colW });
  doc.font('Helvetica').fontSize(10);
  y1 = doc.text('BYE K1TTY — NIF/CIF: 48273903P', L, doc.y, { width: colW }).y;
  y1 = doc.text('C/ Ripollès 87, La Mora, Tarragona, 43008', L, y1, { width: colW }).y;
  y1 = doc.text('Email: aharonbj96@gmail.com · Tel: +34 634 183 862', L, y1, { width: colW }).y;

  // Pedido
  let y2 = yTop;
  const x2 = L + colW + gutter;
  doc.font('Helvetica-Bold').fontSize(10).text('Pedido', x2, y2, { width: colW });
  doc.font('Helvetica').fontSize(10);
  y2 = doc.text(`Nº: ${order._id}`, x2, doc.y, { width: colW }).y;
  const created = new Date(order.createdAt || Date.now());
  y2 = doc.text(`Fecha: ${created.toLocaleDateString('es-ES')}`, x2, y2, { width: colW }).y;

  // Comprador
  let y3 = yTop;
  const x3 = x2 + colW + gutter;
  doc.font('Helvetica-Bold').fontSize(10).text('Comprador', x3, y3, { width: colW });
  doc.font('Helvetica').fontSize(10);
  const b = order.buyer || {};
  y3 = doc.text(`${b.fullName || ''}`, x3, doc.y, { width: colW }).y;
  y3 = doc.text(`${b.email || ''} — ${b.phone || ''}`, x3, y3, { width: colW }).y;
  y3 = doc.text(`${b.line1 || ''} ${b.line2 || ''}`, x3, y3, { width: colW }).y;
  y3 = doc.text(`${b.postalCode || ''} ${b.city || ''} (${b.province || ''})`, x3, y3, { width: colW }).y;

  y = Math.max(y1, y2, y3) + 14;

  // Envío
  doc.font('Helvetica-Bold').fontSize(10).text('Envío', L, y);
  doc.font('Helvetica').fontSize(10);
  y = doc.text(`${order.shipping?.carrier || '—'} — ${order.shipping?.service || '—'}`, L, doc.y, { width: W }).y;
  if (order.shipping?.zone) y = doc.text(`Zona: ${order.shipping.zone}`, L, y, { width: W }).y;

  // === Tabla de artículos ===
  y += 10; line(y); y += 8;

  // Columnas (sumar 1.00)
  const wProd  = W * 0.54;
  const wQty   = W * 0.10;
  const wPrice = W * 0.16;
  const wAmt   = W * 0.20;
  const xProd = L, xQty = xProd + wProd, xPrice = xQty + wQty, xAmt = xPrice + wPrice;

  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Producto', xProd, y, { width: wProd });
  doc.text('Cant.',   xQty,  y, { width: wQty, align: 'center' });
  doc.text('Precio',  xPrice,y, { width: wPrice, align: 'right' });
  doc.text('Importe', xAmt,  y, { width: wAmt, align: 'right' });

  y += 12; line(y); y += 6; doc.font('Helvetica').fontSize(10);

  const rowGap = 6;
  for (const it of order.items || []) {
    const name = it.size ? `${it.name} — Talla ${it.size}` : it.name;

    // altura de la celda por el texto del producto
    const hName = doc.heightOfString(name, { width: wProd, align: 'left' });
    const rowH = Math.max(hName, doc.currentLineHeight());

    doc.text(name, xProd, y, { width: wProd });
    doc.text(String(it.qty), xQty, y, { width: wQty, align: 'center' });
    doc.text(`€${Number(it.price).toFixed(2)}`, xPrice, y, { width: wPrice, align: 'right' });
    doc.text(`€${(Number(it.price) * Number(it.qty)).toFixed(2)}`, xAmt, y, { width: wAmt, align: 'right' });

    y += rowH + rowGap;
  }

  y += 4; line(y); y += 10;

  // Resumen (alineado derecha)
  const colW = 180;
  const colX = R - colW;

  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discountAmount || 0);
  const vatAmt   = Number(order.vatAmount || 0); // informativo (IVA incl.)
  const shipCost = Number(order.shipping?.cost || 0);
  const total    = Number(order.total || (subtotal - discount + shipCost));

  doc.font('Helvetica').fontSize(10);
  doc.text('Subtotal (IVA incl.)', colX, y, { width: colW/2 });
  doc.text(`€${subtotal.toFixed(2)}`, colX, y, { width: colW, align: 'right' });

  if (discount > 0) {
    y += 12;
    doc.text(`Descuento${order.discountCode ? ` (${order.discountCode})` : ''}`, colX, y, { width: colW/2 });
    doc.text(`-€${discount.toFixed(2)}`, colX, y, { width: colW, align: 'right' });
  }

  y += 12;
  doc.text('IVA (informativo)', colX, y, { width: colW/2 });
  doc.text(`€${vatAmt.toFixed(2)}`, colX, y, { width: colW, align: 'right' });

  if (order.shipping) {
    y += 12;
    doc.text('Envío', colX, y, { width: colW/2 });
    doc.text(`€${shipCost.toFixed(2)}`, colX, y, { width: colW, align: 'right' });
  }

  y += 14;
  doc.font('Helvetica-Bold').text('Total', colX, y, { width: colW/2 });
  doc.text(`€${total.toFixed(2)}`, colX, y, { width: colW, align: 'right' });

  // Nota
  y += 18; line(y); y += 10;
  doc.font('Helvetica').fontSize(9).text(
    'Método de pago: Bizum pendiente de confirmación por el vendedor.\nGracias por tu compra. Cupón -10% para próxima compra: BK10',
    L, y, { width: W }
  );

  doc.end();
  await new Promise(r => stream.on('finish', r));
  return { filename, fullPath };
}

module.exports = { generateReceiptPDF };
