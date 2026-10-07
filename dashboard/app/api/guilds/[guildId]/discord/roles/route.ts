import { guildRoute } from '@/lib/api';
import { bot } from '@/lib/discord';
export const GET = guildRoute(null, async ({ guildId }) => ({
  roles: (await bot(`/guilds/${guildId}/roles`)).filter((r: any) => r.name !== '@everyone').map((r: any) => ({ id: r.id, name: r.name, color: r.color })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
}));
