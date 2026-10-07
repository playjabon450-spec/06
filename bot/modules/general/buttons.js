module.exports = { ping: async (ix, _p, { tr }) => ix.reply({ content: tr('general.pong'), ephemeral: true }) };
