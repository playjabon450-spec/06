import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guildRoute, bumpConfig, audit } from '@/lib/api';
export const GET = guildRoute(null, async ({ guildId }) => ({ overrides: Object.fromEntries((await prisma.messageOverride.findMany({ where: { guildId } })).map((r) => [r.key, r.value])) }));
export const PUT = guildRoute(z.object({ key: z.string().max(80), value: z.string().max(2000).nullable() }), async ({ guildId, uid, body }) => {
  if (body.value === null || body.value === '') await prisma.messageOverride.deleteMany({ where: { guildId, key: body.key } });
  else await prisma.messageOverride.upsert({ where: { guildId_key: { guildId, key: body.key } }, create: { guildId, key: body.key, value: body.value }, update: { value: body.value } });
  await bumpConfig(guildId); await audit(guildId, uid, 'message.edit', { key: body.key }); return { ok: true };
});
