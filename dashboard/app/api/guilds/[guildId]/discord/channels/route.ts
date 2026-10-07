import { guildRoute } from '@/lib/api';
import { bot } from '@/lib/discord';
export const GET = guildRoute(null, async ({ guildId }) => {
  const list = await bot(`/guilds/${guildId}/channels`);
  const names = new Map(list.map((c: any) => [c.id, c.name]));
  return { channels: list.filter((c: any) => [0, 4, 5].includes(c.type)).map((c: any) => ({ id: c.id, name: c.name, type: c.type, parent: names.get(c.parent_id) || null })).sort((a: any, b: any) => a.name.localeCompare(b.name)) };
});
