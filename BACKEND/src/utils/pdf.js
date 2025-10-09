const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function bufferFromUrl(url){ const r=await axios.get(url,{responseType:'arraybuffer'}); return Buffer.from(r.data); }

async function generateReceiptPDF(order, { outDir, brandLogoUrl }) {
  const filename = `${order._id}-${Date.now()}.pdf`;
  const fullPath = path.join(outDir, filename);
  await fs.promises.mkdir(outDir, { recursive: true });
  const doc = new PDFDocument({ size:'A4', margin:40 });
  const stream = fs.createWriteStream(fullPath); doc.pipe(stream);

  if (brandLogoUrl) { try { doc.image(await bufferFromUrl(brandLogoUrl), 40, 40, { width: 120 }); } catch {} }
  doc.fontSize(18).text('Recibo de compra — BYE K1TTY', 200, 40).moveDown();

  doc.fontSize(10).text('Vendedor:', { underline:true });
  doc.text('BYE K1TTY — NIF/CIF: 48273903P');
  doc.text('C/Ripollès 87, La mora. Tarragona, 43008');
  doc.text('Email: aharonbj96@gmail.com · Tel: +34 634 183 862').moveDown();

  const b = order.buyer||{};
  doc.text('Comprador:', { underline:true });
  doc.text(`${b.fullName||''} — ${b.email||''} — ${b.phone||''}`);
  doc.text(`${b.line1||''} ${b.line2||''}`);
  doc.text(`${b.postalCode||''} ${b.city||''}, ${b.province||''} (${b.country||'ES'})`).moveDown();

  doc.fontSize(11).text('Artículos:', { underline:true }).moveDown(0.5);
  for (const it of order.items) {
    if (it.img) { try { doc.image(await bufferFromUrl(it.img), { width: 48, height: 48 }); } catch {} }
    const name = it.size ? `${it.name} — Talla ${it.size}` : it.name;
    doc.text(`${name}  x${it.qty}`); doc.text(`Precio: €${it.price.toFixed(2)}`).moveDown(0.4);
  }
  doc.moveDown().text('Resumen:', { underline:true });
  doc.text(`Subtotal: €${order.subtotal.toFixed(2)}`);
  if (order.discountAmount>0) doc.text(`Descuento (${order.discountCode||''}): -€${order.discountAmount.toFixed(2)}`);
  doc.text(`IVA (${Math.round(order.vatRate*100)}%): €${order.vatAmount.toFixed(2)}`);
  if (order.shipping) doc.text(`Envío (${order.shipping.carrier} ${order.shipping.service}): €${order.shipping.cost.toFixed(2)}`);
  doc.fontSize(12).text(`TOTAL: €${order.total.toFixed(2)}`, { align: 'right' }).moveDown();
  doc.fontSize(10).text('Método de pago: Bizum (pendiente de confirmación por el vendedor).');
  doc.text('Gracias por tu compra. Usa el cupón BK5 en tu próxima compra para -5%.');
  doc.end(); await new Promise(r => stream.on('finish', r));
  return { filename, fullPath };
}
module.exports = { generateReceiptPDF };
