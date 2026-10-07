// Bot-token Discord REST with a 60s cache. Needs DISCORD_TOKEN in the dashboard env too.
const c = new Map<string, { at: number; data: any }>();
export async function bot(path: string) {
  const hit = c.get(path); if (hit && Date.now() - hit.at < 60000) return hit.data;
  const r = await fetch('https://discord.com/api/v10' + path, { headers: { Authorization: 'Bot ' + process.env.DISCORD_TOKEN } });
  if (!r.ok) throw new Error('discord ' + r.status);
  const data = await r.json(); c.set(path, { at: Date.now(), data }); return data;
}
