import { z } from 'zod';
const snow = z.string().regex(/^\d{5,25}$/);
export const categorySchema = z.object({
  id: z.string().max(40).optional(), name: z.string().trim().min(1).max(60), emoji: z.string().max(40).default('🎫'), staffRoleIds: z.array(snow).max(20), parentId: snow.nullable().optional(),
  questions: z.array(z.object({ label: z.string().trim().min(1).max(45), required: z.boolean(), long: z.boolean() })).max(5), defaultPriority: z.enum(['low', 'normal', 'high', 'urgent']),
  greeting: z.string().max(1500).default(''), firstResponseMin: z.number().int().min(1).max(100000).nullable().optional(), resolutionMin: z.number().int().min(1).max(1000000).nullable().optional(),
  escalationRoleId: snow.nullable().optional(), sortOrder: z.number().int().min(0).max(999), active: z.boolean(),
});
export const ticketSettingsSchema = z.object({
  channelId: snow.nullable(), style: z.enum(['select', 'buttons']), title: z.string().max(256), description: z.string().max(2000), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  maxOpen: z.number().int().min(1).max(20), closeDeleteHours: z.number().int().min(1).max(720), unclaimedMin: z.number().int().min(0).max(1440), escalationRoleId: snow.nullable(),
  kbEnabled: z.boolean(), aiRouting: z.boolean(), aiSummary: z.boolean(), dmTranscript: z.boolean(),
});
export const defaultTicketSettings = { channelId: null, style: 'select', title: '🎫 مركز الدعم', description: 'اختر القسم المناسب لفتح تذكرة، وسيتواصل معك فريقنا في أقرب وقت.', color: '#5865f2', maxOpen: 3, closeDeleteHours: 24, unclaimedMin: 15, escalationRoleId: null, kbEnabled: true, aiRouting: false, aiSummary: false, dmTranscript: true };
export const kbSchema = z.object({ id: z.string().max(40).optional(), question: z.string().trim().min(3).max(200), keywords: z.array(z.string().trim().min(1).max(60)).max(30), answer: z.string().trim().min(1).max(3500),
  attachments: z.array(z.string().url().max(500)).max(5), active: z.boolean() });
