const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); const { t } = require('../../core/i18n');
const hex = (s, d = 0x1f6f8b) => { const n = parseInt(String(s || '').replace('#', ''), 16); return Number.isFinite(n) ? n : d; };
// Store settings live in Guild.settings.store (edited in dashboard /store). The panel is read from cfg so a config bump refreshes it.
module.exports = {
  name: 'store', defaultEnabled: true, dmActions: ['renew'], // renewal button is pressed inside DMs
  panels: {
    order: (cfg) => {
      const s = cfg.guild.settings?.store || {};
      const e = new EmbedBuilder().setTitle(s.title || t(cfg, 'store.panel.title')).setDescription(s.description || t(cfg, 'store.panel.description')).setColor(hex(s.color, hex(cfg.guild.settings?.themeColor)));
      if (s.image) e.setImage(s.image);
      return { embeds: [e], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('store:order:0').setLabel(s.buttonLabel || t(cfg, 'store.panel.button')).setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('store:my:0').setLabel(t(cfg, 'store.panel.mine')).setStyle(ButtonStyle.Secondary))] };
    },
  },
};
