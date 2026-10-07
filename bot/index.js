const env = require('./core/env'); const log = require('./core/logger');
process.on('unhandledRejection', (e) => log.error('unhandledRejection', e));
process.on('uncaughtException', (e) => log.error('uncaughtException', e));
if (env.missing.length) { console.error('\n❌ إعدادات ناقصة في ملف .env:\n - ' + env.missing.join('\n - ') + '\n'); process.exit(1); }
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const prisma = require('./core/db'); const config = require('./core/config');
const { loadModules } = require('./core/loader'); const jobs = require('./core/jobs');

(async () => {
  try { await prisma.$queryRaw`SELECT 1`; } catch (e) { console.error('❌ تعذر الاتصال بقاعدة البيانات: ' + e.message + '\nتأكد من DATABASE_URL ثم شغّل: npm run db:push'); process.exit(1); }
  // Sharding: set SHARDING=true and run via a ShardingManager (disabled by default).
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], partials: [Partials.Channel, Partials.Message] });
  log.init(client);
  const modules = loadModules(); const ctx = { client, prisma, modules };
  client.on('interactionCreate', require('./core/interactions')(ctx));
  for (const m of modules.values()) for (const [ev, fn] of Object.entries(m.events))
    client.on(ev, (...a) => Promise.resolve(fn(ctx, ...a)).catch((e) => log.error(`event ${m.name}.${ev}`, e)));
  client.on('error', (e) => log.error('client error', e));
  client.once('ready', () => { log.info('logged in as', client.user.tag); config.startPolling(env.pollConfig); jobs.start(ctx, env.pollJobs); });
  require('./core/health')(client, env.port);
  await client.login(process.env.DISCORD_TOKEN).catch((e) => { console.error('❌ فشل تسجيل الدخول، تحقق من DISCORD_TOKEN: ' + e.message); process.exit(1); });
})();
