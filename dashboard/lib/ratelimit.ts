// In-memory fixed-window limiter (per serverless instance; enough for free tier).
const b = new Map<string, { n: number; reset: number }>();
export function limited(key: string, max: number, windowMs = 60000) {
  const now = Date.now(); let e = b.get(key);
  if (!e || e.reset < now) { e = { n: 0, reset: now + windowMs }; b.set(key, e); }
  if (b.size > 5000) for (const [k, v] of b) if (v.reset < now) b.delete(k);
  return ++e.n > max;
}
