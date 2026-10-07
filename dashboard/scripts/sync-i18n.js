// Copies shared files so the dashboard can deploy standalone (Vercel root = dashboard/).
const fs = require('fs'), p = require('path');
const root = p.join(__dirname, '../..');
fs.mkdirSync(p.join(__dirname, '../prisma'), { recursive: true });
if (fs.existsSync(p.join(root, 'bot/i18n/ar.js'))) {
  fs.copyFileSync(p.join(root, 'bot/i18n/ar.js'), p.join(__dirname, '../lib/ar.js'));
  fs.copyFileSync(p.join(root, 'prisma/schema.prisma'), p.join(__dirname, '../prisma/schema.prisma'));
}
