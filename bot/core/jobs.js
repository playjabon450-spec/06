// Polls bot_jobs. type = "<module>:<jobName>". Atomic claim prevents double-run.
const prisma = require('./db'); const log = require('./logger'); const config = require('./config');
function start(ctx, ms) {
  let busy = false;
  setInterval(async () => {
    if (busy) return; busy = true;
    try {
      const pending = await prisma.botJob.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, take: 10 });
      for (const j of pending) {
        const got = await prisma.botJob.updateMany({ where: { id: j.id, status: 'pending' }, data: { status: 'running' } });
        if (!got.count) continue;
        try {
          const [mod, name] = j.type.split(':'); const fn = ctx.modules.get(mod)?.jobs?.[name];
          if (!fn) throw new Error('unknown job ' + j.type);
          const cfg = await config.get(j.guildId);
          await fn(ctx, { ...j, cfg });
          await prisma.botJob.update({ where: { id: j.id }, data: { status: 'done', doneAt: new Date() } });
        } catch (e) {
          log.error('job failed', j.type, e);
          await prisma.botJob.update({ where: { id: j.id }, data: { status: 'failed', error: String(e.message || e).slice(0, 300), doneAt: new Date() } });
        }
      }
    } catch (e) { log.warn('job poll failed', e.message); } finally { busy = false; }
  }, ms);
}
module.exports = { start };
