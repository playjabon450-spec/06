// Pure matcher for transfer-confirmation messages (ProBot or a custom currency bot).
const DEFAULT_REGEX = '(?<sender><@!?\\d+>|\\S+),? has transferred `?\\$?(?<amount>[\\d,]+)`? to (?<recipient>.+)';
const normDigits = (s) => String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[,٬،\s]/g, '');
const messageText = (m) => [m.content, ...(m.embeds || []).flatMap((e) => [e.title, e.description, ...(e.fields || []).map((f) => f.value)])].filter(Boolean).join('\n');
function parseTransfer(text, regexSrc) {
  let re; try { re = new RegExp(regexSrc || DEFAULT_REGEX, 'is'); } catch { return null; }
  const m = re.exec(String(text).slice(0, 2000)); const g = m?.groups; if (!g?.amount) return null;
  const amount = Number(normDigits(g.amount)); if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, sender: g.sender || '', recipient: g.recipient || '' };
}
const idOf = (s) => (/<@!?(\d+)>/.exec(s || '') || [])[1] || (/^\d{15,25}$/.test(String(s || '').trim()) ? String(s).trim() : null);
const nm = (s) => String(s || '').toLowerCase().replace(/[*_`~@#<>]/g, '').trim();
const nameIn = (s, names) => !!nm(s) && names.some((n) => nm(n) && (nm(n) === nm(s) || nm(s).includes(nm(n))));
// msg: { authorId, content, embeds, mentionIds }. -> { status: ok|ignore|wrong_recipient|wrong_sender, amount? }
function matchTransfer(msg, { method, customerId, customerNames = [], recipientNames = [] }) {
  const c = method.config || {};
  if (!c.botId || msg.authorId !== c.botId) return { status: 'ignore', reason: 'not_bot' };
  const text = messageText(msg), p = parseTransfer(text, c.regex); if (!p) return { status: 'ignore', reason: 'no_match' };
  const men = msg.mentionIds || [], rid = idOf(p.recipient);
  const recOk = rid ? rid === c.recipientId : men.includes(c.recipientId) || nameIn(p.recipient, recipientNames);
  if (!recOk) return { status: 'wrong_recipient', amount: p.amount };
  const sid = idOf(p.sender);
  const sendOk = sid ? sid === customerId : p.sender ? nameIn(p.sender, customerNames) : men.includes(customerId) && customerId !== c.recipientId;
  if (!sendOk) return { status: 'wrong_sender', amount: p.amount };
  return { status: 'ok', amount: p.amount };
}
// Cumulative amount check. paid = confirmed partial total so far.
function evaluateAmount(paid, amount, expected) {
  const total = paid + amount;
  if (total < expected) return { status: 'under', total, remaining: expected - total };
  if (total > expected) return { status: 'over', total, extra: total - expected };
  return { status: 'exact', total };
}
module.exports = { DEFAULT_REGEX, parseTransfer, matchTransfer, evaluateAmount, messageText };
