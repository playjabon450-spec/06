const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js'); const { t } = require('../../core/i18n'); const prisma = require('../../core/db');
const hex = (s, d = 0x5865f2) => { const n = parseInt(String(s || '').replace('#', ''), 16); return Number.isFinite(n) ? n : d; };
module.exports = {
  name: 'tickets', defaultEnabled: true, dmActions: ['rate', 'ratecomment', 'ratemodal'],
  panels: {
    // Async: reads categories from the DB at publish time. Settings in Guild.settings.tickets.
    main: async (cfg) => {
      const s = cfg.guild.settings?.tickets || {}; const cats = await prisma.ticketCategory.findMany({ where: { guildId: cfg.guild.id, active: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 25 });
      const e = new EmbedBuilder().setTitle(s.title || t(cfg, 'tickets.panel.title')).setDescription(s.description || t(cfg, 'tickets.panel.description')).setColor(hex(s.color));
      if (!cats.length) return { embeds: [e.setDescription(t(cfg, 'tickets.panel.none'))], components: [] };
      if (s.style === 'buttons') { const rows = []; for (let i = 0; i < Math.min(cats.length, 20); i += 5) rows.push(new ActionRowBuilder().addComponents(cats.slice(i, i + 5).map((c) => new ButtonBuilder().setCustomId(`tickets:open:${c.id}`).setLabel(c.name.slice(0, 80)).setEmoji(c.emoji || '🎫').setStyle(ButtonStyle.Primary)))); return { embeds: [e], components: rows }; }
      const menu = new StringSelectMenuBuilder().setCustomId('tickets:opensel:0').setPlaceholder(t(cfg, 'tickets.panel.placeholder')).addOptions(cats.map((c) => ({ label: c.name.slice(0, 100), value: c.id, emoji: c.emoji || '🎫' })));
      return { embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] };
    },
  },
};
