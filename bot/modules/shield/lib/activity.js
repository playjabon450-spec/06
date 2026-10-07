// Pure scoring for compromised-account detection and raid detection.
const WINDOW = 10 * 60000; const THRESH = { low: 80, medium: 60, high: 45 };
// events: [{ ts, channelId, hash, links, mentions, everyone, invites }]
function scoreActivity(events, { memberAgeDays = 0, sensitivity = 'medium', now = Date.now() } = {}) {
  const ev = events.filter((e) => now - e.ts <= WINDOW); const reasons = []; let score = 0;
  const linkEv = ev.filter((e) => e.links > 0); const linkCh = new Set(linkEv.map((e) => e.channelId)).size;
  if (linkCh >= 2) { score += 30; reasons.push('links_multi_channel'); if (memberAgeDays >= 7) { score += 20; reasons.push('old_member_sudden_links'); } } else if (linkEv.length && memberAgeDays >= 7) { score += 10; reasons.push('old_member_link'); }
  if (ev.some((e) => e.mentions >= 5)) { score += 30; reasons.push('mass_mentions'); } if (ev.some((e) => e.everyone)) { score += 25; reasons.push('everyone_ping'); }
  const byHash = new Map(); for (const e of ev) if (e.hash) { if (!byHash.has(e.hash)) byHash.set(e.hash, new Set()); byHash.get(e.hash).add(e.channelId); }
  const dup = Math.max(0, ...[...byHash.values()].map((s) => s.size)); if (dup >= 3) { score += 40; reasons.push('identical_multi_channel'); } else if (dup === 2) { score += 20; reasons.push('identical_two_channels'); }
  if (ev.reduce((a, e) => a + (e.invites || 0), 0) >= 2) { score += 25; reasons.push('invite_spam'); }
  const threshold = THRESH[sensitivity] || THRESH.medium; return { score, reasons, threshold, triggered: score >= threshold };
}
// Sliding window of joins. check() returns the matching "new account" joins when >= n within `seconds`.
class RaidTracker {
  constructor() { this.joins = []; }
  add(userId, ts, ageDays) { this.joins.push({ userId, ts, ageDays }); if (this.joins.length > 500) this.joins.shift(); }
  check(n, seconds, newDays, now = Date.now()) { const m = this.joins.filter((j) => now - j.ts <= seconds * 1000 && j.ageDays <= newDays); return m.length >= n ? m : null; }
}
module.exports = { scoreActivity, RaidTracker, WINDOW, THRESH };
