import PublishPanel from '@/components/PublishPanel';
export default function Overview({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">نظرة عامة</h1><a href={`/${params.guildId}/setup`} className="block bg-white border rounded-lg p-3 mb-4 text-sm hover:bg-sand">🚀 أول مرة؟ ابدأ من <b>معالج الإعداد الأولي</b> وأكمل قائمة الخطوات ←</a><PublishPanel guildId={params.guildId} /></div>;
}
