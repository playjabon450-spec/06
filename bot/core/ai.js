// ai.generate(guildId, prompt, {system, maxTokens}) -> string | null. Free tier (Groq preferred, else Gemini).
// null when no key, disabled (settings.aiEnabled === false), quota exhausted, or any error.
const prisma = require('./db'); const config = require('./config'); const log = require('./logger');
const day = () => new Date().toISOString().slice(0, 10);
async function consume(guildId, quota) {
  const r = await prisma.aiUsage.upsert({ where: { guildId_day: { guildId, day: day() } }, create: { guildId, day: day(), count: 1 }, update: { count: { increment: 1 } } });
  return r.count <= quota;
}
async function generate(guildId, prompt, opts = {}) {
  try {
    const groq = process.env.GROQ_API_KEY, gem = process.env.GEMINI_API_KEY; if (!groq && !gem) return null;
    const s = (await config.get(guildId)).guild.settings || {};
    if (s.aiEnabled === false || !(await consume(guildId, s.aiDailyQuota ?? 30))) return null;
    const max = opts.maxTokens || 400, sys = opts.system || 'أجب بالعربية بإيجاز.';
    if (groq) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + groq, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: max, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] }) });
      if (!r.ok) return null; return (await r.json()).choices?.[0]?.message?.content?.trim() || null;
    }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gem}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: max } }) });
    if (!r.ok) return null; return (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (e) { log.warn('ai.generate failed', e.message); return null; }
}
module.exports = { generate };
