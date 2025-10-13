const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function bufferFromUrl(url){ const r = await axios.get(url,{responseType:'arraybuffer'}); return Buffer.from(r.data); }

async function generateReceiptPDF(order, { outDir, brandLogoUrl }) {
  const filename = `receipt_${String(order._id).slice(-8)}_${Date.now()}.pdf`;
  const fullPath = path.join(outDir, filename);
  await fs.promises.mkdir(outDir, { recursive: true });

  const doc = new PDFDocument({ size:'A4', margin:40 });
  const stream = fs.createWriteStream(fullPath);
  doc.pipe(stream);

  // Encabezado
  if (brandLogoUrl) { try { doc.image(await bufferFromUrl(brandLogoUrl), 40, 40, { width: 120 }); } catch {} }
  doc.font('Helvetica-Bold').fontSize(18).text('RECIBO', { align: 'right' });
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').fontSize(11).text('Vendedor:');
  doc.font('Helvetica').fontSize(10)
     .text('BYE K1TTY — NIF/CIF: 48273903P')
     .text('C/Ripollès 87, La mora. Tarragona, 43008')
     .text('Email: aharonbj96@gmail.com · Tel: +34 634 183 862');
  doc.moveDown(0.7);

  doc.font('Helvetica-Bold').fontSize(11).text('Comprador:');
  const b = order.buyer || {};
  doc.font('Helvetica').fontSize(10)
     .text(`${b.fullName || ''} — ${b.email || ''} — ${b.phone || ''}`)
     .text(`${b.line1 || ''} ${b.line2 || ''}`)
     .text(`${b.postalCode || ''} ${b.city || ''}, ${b.province || ''} (${b.country || 'ES'})`);
  doc.moveDown(0.7);

  // Envío (opcional)
  if (order.shipping) {
    doc.font('Helvetica-Bold').fontSize(11).text('Envío');
    doc.font('Helvetica').fontSize(10)
       .text(`${order.shipping.carrier} — ${order.shipping.service}`);
    doc.moveDown(0.7);
  }

  // Tabla de artículos
  doc.font('Helvetica-Bold').fontSize(11).text('Artículos');
  doc.moveDown(0.4);

  const left = doc.x;          // margen izquierdo actual
  const colName = left;        // producto (ancho flexible)
  const colQty  = 380;         // Cant.
  const colUnit = 430;         // Precio
  const colAmt  = 500;         // Importe
  const rowH    = 18;
  let y = doc.y + 4;

  // Cabecera
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Producto', colName, y);
  doc.text('Cant.',    colQty,  y, { width:40, align:'right' });
  doc.text('Precio',   colUnit, y, { width:60, align:'right' });
  doc.text('Importe',  colAmt,  y, { width:60, align:'right' });

  y += rowH;
  doc.moveTo(left, y - 6).lineTo(555, y - 6).strokeColor('#cccccc').lineWidth(0.5).stroke();

  // Filas
  doc.font('Helvetica').fontSize(10);
  for (const it of order.items || []) {
    const name = it.size ? `${it.name} — Talla ${it.size}` : it.name;

    doc.text(String(name || ''), colName, y, { width: (colQty - colName - 10), continued: false });
    doc.text(String(it.qty || 0), colQty, y, { width:40, align:'right' });
    doc.text(`€${Number(it.price || 0).toFixed(2)}`, colUnit, y, { width:60, align:'right' });

    const amount = (Number(it.price || 0) * Number(it.qty || 0));
    doc.text(`€${amount.toFixed(2)}`, colAmt, y, { width:60, align:'right' });

    y += rowH;

    // salto de página si hace falta
    if (y > doc.page.height - 140) {
      doc.addPage();
      y = doc.y;
    }
  }

  y += 6;
  doc.moveTo(left, y).lineTo(555, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
  y += 10;

  // Resumen (precios con IVA incluido)
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discountAmount || 0);
  const shipCost = order.shipping ? Number(order.shipping.cost || 0) : 0;
  const vatIncl  = Number(order.vatAmount || 0);
  const total    = Number(order.total || 0);

  const labelW = 120;
  function row(label, value, bold=false){
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(bold ? 12 : 10)
       .text(label, colUnit, y, { width:labelW, align:'right' })
       .text(value, colAmt, y, { width:60, align:'right' });
    y += rowH;
  }

  row('Subtotal (IVA incl.)', `€${subtotal.toFixed(2)}`);
  if (discount > 0) row('Descuento', `-€${discount.toFixed(2)}`);
  row('IVA (informativo)', `€${vatIncl.toFixed(2)}`);
  if (order.shipping) row('Envío', `€${shipCost.toFixed(2)}`);
  doc.moveTo(colUnit, y - 8).lineTo(555, y - 8).strokeColor('#000').lineWidth(0.8).stroke();
  row('Total', `€${total.toFixed(2)}`, true);

  doc.moveDown(1);
  doc.font('Helvetica').fontSize(9)
     .text('Método de pago: Bizum (pendiente de confirmación por el vendedor).')
     .text('Gracias por tu compra. Usa el cupón BK5 en tu próxima compra para -5%.');

  doc.end();
  await new Promise(r => stream.on('finish', r));
  return { filename, fullPath };
}

module.exports = { generateReceiptPDF };
