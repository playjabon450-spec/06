const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); const prisma = require('../../core/db'); const { t } = require('../../core/i18n'); const R = require('./lib/report');
const hex = (s, d = 0x5865f2) => { const n = parseInt(String(s || '').replace('#', ''), 16); return Number.isFinite(n) ? n : d; };
// Staff tools. Settings: Guild.settings.staff (lib/report.js DEFAULTS). Applications panel lists active forms (max 5 buttons).
module.exports = {
  name: 'staff', defaultEnabled: true, dmActions: ['ignore'],
  panels: {
    apply: async (cfg) => {
      const a = R.of(cfg).applications; const forms = await prisma.applicationForm.findMany({ where: { guildId: cfg.guild.id, active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 5 });
      const e = new EmbedBuilder().setTitle(a.title || t(cfg, 'staff.apply.title')).setDescription(a.description || t(cfg, 'staff.apply.description')).setColor(hex(a.color));
      if (!forms.length) return { embeds: [e.setDescription(t(cfg, 'staff.apply.none'))], components: [] };
      forms.forEach((f) => { if (f.description) e.addFields({ name: f.name.slice(0, 250), value: f.description.slice(0, 1000) }); });
      return { embeds: [e], components: [new ActionRowBuilder().addComponents(forms.map((f) => new ButtonBuilder().setCustomId(`staff:apply:${f.id}`).setLabel((forms.length > 1 ? f.name : f.buttonLabel || t(cfg, 'staff.apply.title')).slice(0, 80)).setStyle(ButtonStyle.Primary)))] };
    },
  },
};
