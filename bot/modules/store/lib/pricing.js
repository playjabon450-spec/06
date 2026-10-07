// Pure price logic (no Discord/DB). Amounts: subtotal/discount in EGP; base/fee/total in the payment method's own currency.
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const ceil6 = (n) => Math.ceil(Math.round(n * 1e6) / 1e6); // avoids 100.00000001 -> 101
function couponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  const d = coupon.kind === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  return r2(Math.min(Math.max(d, 0), subtotal));
}
// -> { ok, reason } reason: invalid|expired|maxUses|maxPerUser|product|minOrder
function validateCoupon(coupon, { subtotal, productId, now = new Date(), userUses = 0 }) {
  if (!coupon || !coupon.active) return { ok: false, reason: 'invalid' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return { ok: false, reason: 'expired' };
  if (coupon.maxUses != null && coupon.uses >= coupon.maxUses) return { ok: false, reason: 'maxUses' };
  if (coupon.maxPerUser != null && userUses >= coupon.maxPerUser) return { ok: false, reason: 'maxPerUser' };
  if (coupon.productIds?.length && !coupon.productIds.includes(productId)) return { ok: false, reason: 'product' };
  if (subtotal < (coupon.minOrder || 0)) return { ok: false, reason: 'minOrder' };
  return { ok: true };
}
// method: { id, kind: vodafone|probot|custom, config }. Per-package override is in the method's currency and gets the same coupon ratio.
function calculate({ pkg, coupon = null, method = null }) {
  const subtotal = r2(pkg.priceEgp), discount = couponDiscount(coupon, subtotal), after = r2(subtotal - discount);
  const ratio = subtotal > 0 ? after / subtotal : 0; const cfg = method?.config || {}; const kind = method?.kind || 'vodafone';
  const ov = method ? pkg.priceOverrides?.[method.id] : undefined;
  if (kind === 'vodafone') {
    const base = r2(ov != null ? ov * ratio : after), fee = r2((base * (cfg.feePercent || 0)) / 100);
    return { subtotal, discount, after, base, fee, total: r2(base + fee), currency: 'EGP' };
  }
  const base = ov != null ? ov * ratio : after * (cfg.rate || 1), tax = (cfg.taxPercent || 0) / 100;
  const total = base <= 0 ? 0 : ceil6(base / (1 - tax)); // ProBot tax compensation, rounded up
  return { subtotal, discount, after, base: r2(base), fee: r2(total - base), total, currency: cfg.currencyName || 'credits' };
}
module.exports = { calculate, validateCoupon, couponDiscount, r2 };
