module.exports = { guildCreate: async ({ prisma }, g) => { await prisma.guild.upsert({ where: { id: g.id }, create: { id: g.id }, update: {} }); } };
