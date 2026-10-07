// Usage: npm run seed:store -- <guildId>   (sample products, packages, payment methods, coupon)
require('dotenv').config({ path: '../.env' }); const prisma = require('./core/db');
(async () => {
  const guildId = process.argv[2]; if (!/^\d{5,25}$/.test(guildId || '')) { console.error('الاستخدام: npm run seed:store -- <guildId>'); process.exit(1); }
  await prisma.guild.upsert({ where: { id: guildId }, create: { id: guildId }, update: {} });
  if (await prisma.product.count({ where: { guildId } })) { console.log('يوجد منتجات بالفعل، تم التخطي.'); return; }
  await prisma.product.create({ data: { guildId, name: 'اشتراك VIP', description: 'رتبة VIP بمميزات حصرية', category: 'اشتراكات', deliveryType: 'role', sortOrder: 1, delivery: { roleId: '', temporary: true, durationDays: 30 },
    packages: { create: [{ name: 'شهري', priceEgp: 100, priceUsd: 2.5, durationDays: 30, sortOrder: 1 }, { name: '3 شهور', priceEgp: 270, durationDays: 90, badge: 'خصم 10%', sortOrder: 2 }, { name: 'دائم', priceEgp: 800, sortOrder: 3 }] },
    questions: { create: [{ label: 'اسم حسابك داخل اللعبة', type: 'short', required: true }] } } });
  const k = await prisma.product.create({ data: { guildId, name: 'مفتاح تفعيل', description: 'مفتاح يُسلَّم تلقائياً', category: 'مفاتيح', stockMode: 'keys', deliveryType: 'key', sortOrder: 2, delivery: { lowStockThreshold: 3 }, packages: { create: [{ name: 'مفتاح واحد', priceEgp: 50, sortOrder: 1 }] } } });
  await prisma.stockKey.createMany({ data: ['DEMO-AAAA-0001', 'DEMO-AAAA-0002', 'DEMO-AAAA-0003'].map((value) => ({ guildId, productId: k.id, value })) });
  await prisma.paymentMethod.createMany({ data: [
    { guildId, kind: 'vodafone', name: 'فودافون كاش', emoji: '📱', instructions: 'حوّل المبلغ بالضبط ثم اضغط «رفعت الإيصال».', sortOrder: 1, config: { numbers: ['01000000000'], feePercent: 0 } },
    { guildId, kind: 'probot', name: 'كريديت ديسكورد', emoji: '💰', instructions: 'حوّل الكريديت عبر ProBot إلى المستلم.', sortOrder: 2, config: { recipientId: '', botId: '282859044593598464', regex: '', taxPercent: 5, rate: 1, currencyName: 'كريديت', currencyEmoji: '💰', confirmMode: 'auto' }, active: false },
  ] });
  await prisma.coupon.create({ data: { guildId, code: 'WELCOME10', kind: 'percent', value: 10, maxPerUser: 1 } });
  console.log('✅ تم إنشاء بيانات تجريبية. عدّل رقم الرتبة/المستلم من لوحة التحكم.');
})().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
