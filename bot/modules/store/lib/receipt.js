const crypto = require('crypto');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
async function hashImage(url, { maxBytes = 10 * 1024 * 1024, fetchImpl = fetch } = {}) {
  const r = await fetchImpl(url); if (!r.ok) throw new Error('download failed ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > maxBytes) throw new Error('image too large'); return sha256(buf);
}
// receiptHash is UNIQUE across all orders, so the same image can never be used twice.
async function registerReceipt(db, { orderId, methodId, amount, url, hash }) {
  try { return { ok: true, payment: await db.payment.create({ data: { orderId, methodId, amount, receiptUrl: url, receiptHash: hash, status: 'pending' } }) }; }
  catch (e) { if (e.code === 'P2002') return { ok: false, duplicate: true }; throw e; }
}
module.exports = { sha256, hashImage, registerReceipt };
