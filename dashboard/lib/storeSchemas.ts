import { z } from 'zod';
export const snow = z.string().regex(/^\d{5,25}$/);
const money = z.number().min(0).max(10_000_000);
export const productSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(1).max(80), description: z.string().max(1000).default(''),
  image: z.string().url().max(500).nullable().optional().or(z.literal('').transform(() => null)),
  category: z.string().max(40).nullable().optional(), active: z.boolean(), sortOrder: z.number().int().min(0).max(9999),
  stockMode: z.enum(['unlimited', 'limited', 'keys']), stockCount: z.number().int().min(0).max(1_000_000),
  deliveryType: z.enum(['role', 'key', 'message', 'manual']),
  delivery: z.object({
    roleId: z.string().max(25).optional(), temporary: z.boolean().optional(), durationDays: z.number().int().min(1).max(3650).optional(),
    message: z.string().max(1800).optional(), lowStockThreshold: z.number().int().min(0).max(10000).optional(), alertChannelId: z.string().max(25).nullable().optional(),
  }),
  packages: z.array(z.object({ id: z.string().max(40).optional(), name: z.string().trim().min(1).max(60), priceEgp: money, priceUsd: money.nullable().optional(),
    durationDays: z.number().int().min(1).max(36500).nullable().optional(), badge: z.string().max(30).nullable().optional(), active: z.boolean(), sortOrder: z.number().int(),
    priceOverrides: z.record(z.string().max(40), money) })).max(25),
  questions: z.array(z.object({ id: z.string().max(40).optional(), label: z.string().trim().min(1).max(45), type: z.enum(['text', 'short', 'number', 'select']), required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(80)).max(25), sortOrder: z.number().int() })).max(5), // Discord modals allow max 5 inputs
}).superRefine((p, c) => {
  if (p.deliveryType === 'role' && !/^\d{5,25}$/.test(p.delivery.roleId || '')) c.addIssue({ code: 'custom', message: 'اختر الرتبة', path: ['delivery'] });
  if (p.deliveryType === 'role' && p.delivery.temporary && !p.delivery.durationDays) c.addIssue({ code: 'custom', message: 'حدد المدة', path: ['delivery'] });
  if (p.deliveryType === 'key' && p.stockMode !== 'keys') c.addIssue({ code: 'custom', message: 'التسليم بالمفاتيح يتطلب مخزون من المفاتيح', path: ['stockMode'] });
  p.questions.forEach((q, i) => { if (q.type === 'select' && q.options.length < 2) c.addIssue({ code: 'custom', message: 'قائمة الاختيار تحتاج خيارين على الأقل', path: ['questions', i] }); });
});
export const couponSchema = z.object({
  id: z.string().max(40).optional(), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/), kind: z.enum(['percent', 'fixed']), value: z.number().positive().max(10_000_000),
  minOrder: money, expiresAt: z.string().datetime().nullable().optional(), maxUses: z.number().int().min(1).nullable().optional(), maxPerUser: z.number().int().min(1).nullable().optional(),
  productIds: z.array(z.string().max(40)).max(100), active: z.boolean(),
}).refine((c) => c.kind !== 'percent' || c.value <= 100, { message: 'النسبة لا تزيد عن 100' });
const safeRegex = (s: string) => { try { new RegExp(s); return s.length <= 300; } catch { return false; } };
export const methodSchema = z.object({
  id: z.string().max(40).optional(), kind: z.enum(['vodafone', 'probot', 'custom']), name: z.string().trim().min(1).max(40), emoji: z.string().max(40).default('💳'),
  instructions: z.string().max(1500).default(''), active: z.boolean(), sortOrder: z.number().int().min(0).max(999),
  config: z.object({
    numbers: z.array(z.string().regex(/^[0-9+\s-]{8,20}$/)).max(10).optional(), feePercent: z.number().min(0).max(50).optional(),
    recipientId: z.string().max(25).optional(), botId: z.string().max(25).optional(), regex: z.string().max(300).optional(), taxPercent: z.number().min(0).max(50).optional(),
    rate: z.number().positive().max(1_000_000).optional(), currencyName: z.string().max(30).optional(), currencyEmoji: z.string().max(40).optional(), confirmMode: z.enum(['auto', 'staff']).optional(),
  }),
}).superRefine((m, c) => {
  const k = m.config;
  if (m.kind === 'vodafone') { if (!k.numbers?.length) c.addIssue({ code: 'custom', message: 'أضف رقم فودافون كاش واحداً على الأقل', path: ['config'] }); return; }
  if (m.active && !/^\d{5,25}$/.test(k.recipientId || '')) c.addIssue({ code: 'custom', message: 'معرّف المستلم غير صالح', path: ['config'] });
  if (m.active && k.confirmMode !== 'staff' && !/^\d{5,25}$/.test(k.botId || '')) c.addIssue({ code: 'custom', message: 'معرّف بوت التحويل غير صالح', path: ['config'] });
  if (k.regex) { if (!safeRegex(k.regex)) c.addIssue({ code: 'custom', message: 'التعبير النمطي (Regex) غير صالح', path: ['config'] }); else if (!k.regex.includes('(?<amount>')) c.addIssue({ code: 'custom', message: 'يجب أن يحتوي الـ Regex على مجموعة (?<amount>...)', path: ['config'] }); }
  if (!k.rate) c.addIssue({ code: 'custom', message: 'حدد سعر التحويل (كم عملة لكل 1 جنيه)', path: ['config'] });
});
export const storeSettingsSchema = z.object({
  channelId: snow.nullable(), title: z.string().max(256), description: z.string().max(2000), image: z.string().url().max(500).nullable().or(z.literal('').transform(() => null)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/), buttonLabel: z.string().trim().min(1).max(80),
  ticketCategoryId: snow.nullable(), maxOpenOrders: z.number().int().min(1).max(20), cooldownSeconds: z.number().int().min(0).max(3600),
  expireMinutes: z.number().int().min(5).max(10080), autoCloseMinutes: z.number().int().min(1).max(10080), reminderDays: z.number().int().min(1).max(30),
});
export const defaultStoreSettings = { channelId: null, title: '🛒 المتجر', description: 'اختر منتجك واضغط على «اطلب الآن» لفتح طلب خاص بك.', image: null, color: '#1f6f8b', buttonLabel: 'اطلب الآن', ticketCategoryId: null, maxOpenOrders: 2, cooldownSeconds: 30, expireMinutes: 60, autoCloseMinutes: 10, reminderDays: 2 };
export const DEFAULT_PROBOT_REGEX = '(?<sender><@!?\\d+>|\\S+),? has transferred `?\\$?(?<amount>[\\d,]+)`? to (?<recipient>.+)';
