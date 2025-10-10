// src/utils/pdf.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const axios = require('axios');

async function bufferFromUrl(url){
  try{
    const r = await axios.get(url, { responseType:'arraybuffer', timeout: 10000 });
    return Buffer.from(r.data);
  }catch{ return null; }
}
function money(n){ return `€${Number(n||0).toFixed(2)}`; }

/**
 * Genera recibo A4 con márgenes y tabla estable
 */
async function generateReceiptPDF(order, { outDir, brandLogoUrl }){
  await fs.promises.mkdir(outDir, { recursive: true });

  const filename = `receipt_${order._id || Date.now()}.pdf`;
  const fullPath = path.join(outDir, filename);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, left: 40, right: 40, bottom: 40 }
  });
  const stream = fs.createWriteStream(fullPath);
  doc.pipe(stream);

  const startX = doc.page.margins.left;
  const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colGap = 16;

  // ===== Header =====
  const logo = await bufferFromUrl(brandLogoUrl);
  const headerH = 64;
  if (logo) doc.image(logo, startX, doc.y, { width: 120, height: headerH, fit:[120, headerH] });
  doc.fontSize(20).text('RECIBO', startX + usableW - 160, doc.page.margins.top, { width:160, align:'right' });

  // separador
  const sepY = doc.page.margins.top + headerH + 6;
  doc.moveTo(startX, sepY).lineTo(startX + usableW, sepY).lineWidth(0.5).strokeColor('#cccccc').stroke();
  doc.moveDown(1.2);

  // ===== Vendedor / Pedido =====
  const colW = (usableW - colGap) / 2;
  const yTop = sepY + 12;

  // Vendedor
  doc.fontSize(11).fillColor('#000').text('Vendedor', startX, yTop, { width: colW });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#111')
    .text('BYE K1TTY', { width: colW })
    .text('aharonbj96@gmail.com', { width: colW })
    .text('www.byek1tty.com', { width: colW });

  // Pedido (derecha)
  const rightX = startX + colW + colGap;
  doc.fontSize(11).fillColor('#000').text('Pedido', rightX, yTop, { width: colW });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#111')
    .text(`Nº: ${String(order._id || '').slice(-8)}`, rightX, doc.y, { width: colW })
    .text(`Fecha: ${new Date(order.createdAt || Date.now()).toLocaleDateString('es-ES')}`, rightX, doc.y, { width: colW });

  // Comprador / Envío
  const b = order.buyer || {};
  const blockTop = Math.max(doc.y + 8, yTop + 45);

  doc.fontSize(11).fillColor('#000').text('Comprador', startX, blockTop, { width: colW });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#111')
    .text(`${b.fullName || ''}`, { width: colW })
    .text(`${b.email || ''}`, { width: colW })
    .text(`${b.phone || ''}`, { width: colW });

  doc.fontSize(11).fillColor('#000').text('Envío', rightX, blockTop, { width: colW });
  doc.moveDown(0.2);
  const addr = [b.line1, b.line2, `${b.postalCode||''} ${b.city||''}`, `${b.province||''}`, `${b.country||''}`]
    .filter(Boolean).join('\n');
  doc.fontSize(10).fillColor('#111').text(addr, rightX, doc.y, { width: colW });

  doc.moveDown(0.8);
  doc.moveTo(startX, doc.y).lineTo(startX + usableW, doc.y).lineWidth(0.5).strokeColor('#cccccc').stroke();
  doc.moveDown(0.6);

  // ===== Items =====
  doc.fontSize(12).fillColor('#000').text('Artículos', startX, doc.y);
  doc.moveDown(0.4);

  const rowX = startX;
  const imgW = 40;
  const colNameW = usableW - imgW - 220;
  const colQtyW = 50;
  const colUnitW = 80;
  const colTotalW = 90;

  doc.fontSize(10).fillColor('#555');
  doc.text('Producto', rowX + imgW + 8, doc.y, { width: colNameW });
  doc.text('Cant.', rowX + imgW + 8 + colNameW, doc.y, { width: colQtyW, align:'right' });
  doc.text('Precio', rowX + imgW + 8 + colNameW + colQtyW, doc.y, { width: colUnitW, align:'right' });
  doc.text('Importe', rowX + imgW + 8 + colNameW + colQtyW + colUnitW, doc.y, { width: colTotalW, align:'right' });

  doc.moveDown(0.2);
  doc.moveTo(startX, doc.y).lineTo(startX + usableW, doc.y).lineWidth(0.5).strokeColor('#dddddd').stroke();

  let y = doc.y + 6;

  for (const it of (order.items || [])) {
    // salto de página si no cabe
    if (y > doc.page.height - doc.page.margins.bottom - 60) { doc.addPage(); y = doc.page.margins.top; }

    const name = it.name + (it.size ? ` — Talla ${it.size}` : '');
    // miniatura
    const buf = await bufferFromUrl(it.img);
    if (buf) doc.image(buf, rowX, y - 2, { width: imgW, height: imgW, fit:[imgW, imgW] });
    else doc.rect(rowX, y - 2, imgW, imgW).strokeColor('#eeeeee').lineWidth(0.5).stroke();

    // texto y números
    const qty = Number(it.qty||1);
    const unit = Number(it.price||0);
    const lineTotal = unit * qty;

    doc.fontSize(10).fillColor('#111')
      .text(name, rowX + imgW + 8, y, { width: colNameW });

    doc.text(String(qty), rowX + imgW + 8 + colNameW, y, { width: colQtyW, align:'right' });
    doc.text(money(unit), rowX + imgW + 8 + colNameW + colQtyW, y, { width: colUnitW, align:'right' });
    doc.text(money(lineTotal), rowX + imgW + 8 + colNameW + colQtyW + colUnitW, y, { width: colTotalW, align:'right' });

    const lineH = Math.max(
      doc.heightOfString(name, { width: colNameW }),
      imgW
    );
    y += lineH + 8;
    doc.y = y;
  }

  // ===== Totales (IVA ya incluido en precios) =====
  doc.moveDown(0.3);
  doc.moveTo(startX, doc.y).lineTo(startX + usableW, doc.y).lineWidth(0.5).strokeColor('#cccccc').stroke();
  doc.moveDown(0.4);

  const s = order;
  const baseGross = Number((s.subtotal - (s.discountAmount || 0)).toFixed(2));
  const shippingCost = Number(s.shipping?.cost || 0);
  const total = Number((baseGross + shippingCost).toFixed(2));

  const labelX = startX + usableW - (colUnitW + colTotalW);
  const valX   = startX + usableW - colTotalW;

  const line = (label, val, bold=false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold?11:10)
      .text(label, labelX - 40, doc.y, { width: 120, align:'right' });
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(money(val), valX, doc.y - 12, { width: colTotalW, align:'right' });
    doc.moveDown(0.2);
  };

  line('Subtotal (IVA incl.)', s.subtotal || 0);
  if (s.discountAmount) line('Descuento', -Math.abs(s.discountAmount));
  if (s.vatAmount != null) line('IVA (informativo)', s.vatAmount);
  line(`Envío${baseGross >= 100 ? ' (gratis)' : ''}`, shippingCost);

  doc.moveDown(0.2);
  doc.moveTo(startX + usableW - 220, doc.y).lineTo(startX + usableW, doc.y).lineWidth(0.5).strokeColor('#cccccc').stroke();
  doc.moveDown(0.2);
  line('Total', total, true);

  // Pie
  doc.moveDown(1);
  doc.fontSize(9).fillColor('#666').text('Gracias por tu compra. Cupón -10% para próxima compra: BK10', startX, doc.y, { width: usableW });

  doc.end();
  await new Promise((res, rej) => { stream.on('finish', res); stream.on('error', rej); });

  return { filename, fullPath };
}

module.exports = { generateReceiptPDF };
