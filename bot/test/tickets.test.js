const test = require('node:test'); const assert = require('node:assert/strict');
const kb = require('../modules/tickets/lib/kb'); const sla = require('../modules/tickets/lib/sla');
const arts = [{ id: 'a', question: 'كيف أجدد اشتراكي؟', keywords: ['تجديد', 'جدد'], answer: 'x', active: true }, { id: 'b', question: 'طريقة الدفع بفودافون كاش', keywords: ['فودافون'], answer: 'y', active: true }];
test('kb: keyword hit with Arabic normalization', () => { assert.equal(kb.match('اريد تجديد الاشتراك', arts).article.id, 'a'); assert.equal(kb.match('الدفع عن طريق فودافون', arts).article.id, 'b'); });
test('kb: no match and inactive ignored', () => { assert.equal(kb.match('مرحبا', arts), null); assert.equal(kb.match('تجديد', [{ ...arts[0], active: false }]), null); });
test('kb: hit rate', () => assert.equal(kb.hitRate({ hits: 4, resolved: 3 }), 75));
const base = { openedAt: 0, pausedMs: 0, pausedAt: null, status: 'open', firstResponseAt: null };
const min = (n) => n * 60000;
test('sla: first response ratio and warn/breach flags', () => {
  const cat = { firstResponseMin: 10, resolutionMin: 100 }; let ev = sla.evaluate(base, cat, min(8)); assert.equal(ev.fr, 0.8); assert.deepEqual(sla.due(ev, {}), ['frWarn']);
  ev = sla.evaluate(base, cat, min(11)); assert.deepEqual(sla.due(ev, { frWarn: true }), ['frBreach']); assert.deepEqual(sla.due(ev, { frWarn: true, frBreach: true }), []);
});
test('sla: paused time is excluded', () => {
  const cat = { resolutionMin: 60 }; const t = { ...base, firstResponseAt: 1, pausedMs: min(30) }; assert.equal(sla.evaluate(t, cat, min(60)).res, 0.5);
  assert.equal(sla.evaluate({ ...t, pausedAt: min(40) }, cat, min(100)).res, (min(100) - min(30) - min(60)) / min(1) / 60);
});
test('sla: closed tickets and missing limits are ignored', () => { assert.deepEqual(sla.evaluate({ ...base, status: 'closed' }, { firstResponseMin: 1 }, min(99)), { fr: null, res: null }); assert.deepEqual(sla.evaluate(base, {}, min(99)), { fr: null, res: null }); });
