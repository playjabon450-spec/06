import { prisma } from '@/lib/prisma';
import { guildRoute } from '@/lib/api';
export const GET = guildRoute(null, async ({ guildId, req }) => {
  const status = new URL(req.url).searchParams.get('status') || ''; const [apps, forms] = await Promise.all([prisma.application.findMany({ where: { guildId, ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' }, take: 100, include: { votes: true } }), prisma.applicationForm.findMany({ where: { guildId }, select: { id: true, name: true } })]);
  return { applications: apps.map((a) => ({ id: a.id, userId: a.userId, form: forms.find((f) => f.id === a.formId)?.name || '—', status: a.status, answers: a.answers, reviewedBy: a.reviewedBy, reviewReason: a.reviewReason, createdAt: a.createdAt, decidedAt: a.decidedAt, up: a.votes.filter((v) => v.vote === 'up').length, down: a.votes.filter((v) => v.vote === 'down').length, neutral: a.votes.filter((v) => v.vote === 'neutral').length })) };
});
