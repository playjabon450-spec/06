import { z } from 'zod';
const snow = z.string().regex(/^\d{5,25}$/);
const domain = z.string().trim().toLowerCase().regex(/^[a-z0-9]([a-z0-9.-]{0,120}[a-z0-9])?\.[a-z0-9-]{2,}$/, 'نطاق غير صالح');
export const shieldSettingsSchema = z.object({
  linkBlock: z.object({ enabled: z.boolean(), action: z.enum(['delete', 'timeout', 'quarantine']), timeoutMinutes: z.number().int().min(1).max(40320), exemptRoleIds: z.array(snow).max(30), customDomains: z.array(domain).max(500), allowDomains: z.array(domain).max(500) }),
  compromised: z.object({ enabled: z.boolean(), sensitivity: z.enum(['low', 'medium', 'high']), cooldownMin: z.number().int().min(1).max(1440), quarantineRoleId: snow.nullable() }),
  raid: z.object({ enabled: z.boolean(), joins: z.number().int().min(2).max(200), seconds: z.number().int().min(5).max(600), newAccountDays: z.number().int().min(1).max(365), lockdownChannelIds: z.array(snow).max(50), autoEndMinutes: z.number().int().min(0).max(1440), gateDays: z.number().int().min(0).max(365), gateAction: z.enum(['kick', 'timeout']) }),
  appeals: z.object({ enabled: z.boolean(), intro: z.string().max(1000) }),
});
export const defaultShield = {
  linkBlock: { enabled: true, action: 'delete', timeoutMinutes: 60, exemptRoleIds: [], customDomains: [], allowDomains: [] },
  compromised: { enabled: true, sensitivity: 'medium', cooldownMin: 10, quarantineRoleId: null },
  raid: { enabled: false, joins: 8, seconds: 30, newAccountDays: 30, lockdownChannelIds: [], autoEndMinutes: 30, gateDays: 0, gateAction: 'timeout' },
  appeals: { enabled: false, intro: '' },
};
export const appealSchema = z.object({ whyBanned: z.string().trim().min(10, 'اشرح سبب الحظر (10 أحرف على الأقل)').max(1000), whyUnban: z.string().trim().min(10, 'اشرح لماذا يجب رفع الحظر (10 أحرف على الأقل)').max(1500), extra: z.string().trim().max(1000).optional() });
