const test = require('node:test'); const assert = require('node:assert/strict');
const tz = require('../modules/staff/lib/tz'); const apps = require('../modules/staff/lib/apps'); const S = require('../modules/staff/lib/stats');
test('tz: Cairo local parts (summer UTC+3 / winter UTC+2)', () => { assert.equal(tz.parts(new Date('2026-07-01T21:30:00Z'), 'Africa/Cairo').date, '2026-07-02'); assert.equal(tz.parts(new Date('2026-01-10T21:30:00Z'), 'Africa/Cairo').hour, 23); assert.equal(tz.parts(new Date('2026-07-01T10:00:00Z'), 'Bad/Zone').hour, 13); });
test('tz: weekly + monthly due logic', () => {
  const s = { weekly: { enabled: true, day: 6, hour: 9 }, monthly: { enabled: true, day: 1, hour: 9 } }; // Saturday 09:00, 1st 09:00
  assert.deepEqual(tz.due(s, new Date('2026-10-03T07:30:00Z'), 'Africa/Cairo'), [{ kind: 'weekly', key: 'weekly:2026-10-03' }]); assert.deepEqual(tz.due(s, new Date('2026-10-03T05:30:00Z'), 'Africa/Cairo'), []);
  assert.deepEqual(tz.due(s, new Date('2026-11-01T09:00:00Z'), 'Africa/Cairo').map((x) => x.kind), ['monthly']);
});
test('apps: chunk into modal-sized steps', () => assert.deepEqual(apps.chunk([1, 2, 3, 4, 5, 6, 7]).map((c) => c.length), [5, 2]));
test('apps: answer validation', () => { const q = (o) => ({ label: 'س', required: true, type: 'short', ...o }); assert.ok(apps.validateAnswer(q(), ' ').error); assert.equal(apps.validateAnswer(q({ required: false }), '').value, ''); assert.ok(apps.validateAnswer(q({ type: 'number' }), 'abc').error); assert.equal(apps.validateAnswer(q({ type: 'number' }), '12').value, '12'); assert.equal(apps.validateAnswer(q({ type: 'select', options: ['نعم', 'لا'] }), 'نعم').value, 'نعم'); assert.ok(apps.validateAnswer(q({ type: 'select', options: ['نعم', 'لا'] }), 'ربما').error); });
test('apps: minimum votes rule and tally', () => { const v = [{ vote: 'up' }, { vote: 'down' }]; assert.deepEqual([apps.canDecide(v, 3).ok, apps.canDecide(v, 3).needed], [false, 1]); assert.equal(apps.canDecide([...v, { vote: 'neutral' }], 3).ok, true); assert.equal(apps.tally(v).up, 1); });
test('apps: cooldown after rejection', () => { const now = Date.now(); assert.ok(apps.cooldownUntil(new Date(now - 2 * 86400000), 7, now)); assert.equal(apps.cooldownUntil(new Date(now - 8 * 86400000), 7, now), null); assert.equal(apps.cooldownUntil(null, 7, now), null); });
test('stats: points formula', () => assert.equal(S.points({ claimed: 2, closed: 1, orders: 1, mod: 3, messages: 50, avgRating: 5 }), 4 + 3 + 2 + 3 + 5 + 10));
function fakeDb(d) { const f = (rows) => ({ findMany: async () => rows }); return { ticket: { findMany: async ({ where }) => (where.status === 'closed' ? d.closed : d.claimed) }, staffEvent: f(d.fr), payment: f(d.pay), auditLog: f(d.mod), staffDaily: f(d.daily) }; }
test('stats: compute aggregates per staff and ignores bot confirmations', async () => {
  const t0 = new Date('2026-10-01T10:00:00Z'), t1 = new Date('2026-10-01T11:00:00Z');
  const r = await S.compute(fakeDb({ claimed: [{ claimedBy: 'a', rating: 5, openedAt: t0 }, { claimedBy: 'a', rating: null, openedAt: t0 }, { claimedBy: 'b', rating: null, openedAt: t0 }], closed: [{ claimedBy: 'a', closedBy: 'a', openedAt: t0, closedAt: t1, rating: 4 }],
    fr: [{ userId: 'a', value: 5 }, { userId: 'a', value: 15 }], pay: [{ confirmedBy: 'a' }, { confirmedBy: 'bot:auto' }, { confirmedBy: 'b' }], mod: [{ userId: 'b' }, { userId: 'system' }], daily: [{ userId: 'a', messages: 30 }] }), 'g', new Date(0));
  const a = r.rows.find((x) => x.userId === 'a'), b = r.rows.find((x) => x.userId === 'b');
  assert.deepEqual([a.claimed, a.closed, a.orders, a.messages, a.avgFirstResponse, a.avgResolution, a.avgRating], [2, 1, 1, 30, 10, 60, 4]); assert.deepEqual([b.claimed, b.orders, b.mod], [1, 1, 1]); assert.equal(r.rows.length, 2);
});
