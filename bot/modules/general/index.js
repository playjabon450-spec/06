const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); const { t } = require('../../core/i18n');
module.exports = {
  name: 'general', defaultEnabled: true,
  // panels[key](cfg) -> message payload. Dashboard "publish" jobs reference these keys.
  panels: { welcome: (cfg) => ({ embeds: [new EmbedBuilder().setTitle(t(cfg, 'general.welcome.title')).setDescription(t(cfg, 'general.welcome.body')).setColor(0x2b6cb0)],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('general:ping:0').setLabel(t(cfg, 'general.welcome.button')).setStyle(ButtonStyle.Primary))] }) },
};
