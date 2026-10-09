import PublishPanel from '@/components/PublishPanel';
export default function Overview({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">نظرة عامة</h1><a href={`/${params.guildId}/setup`} className="setup-callout"><span><small>ابدأ هنا</small><b>أكمل إعداد خادمك</b><span>اضبط الأدوار والقنوات والميزات الأساسية.</span></span><b className="setup-callout-arrow" aria-hidden="true">←</b></a><PublishPanel guildId={params.guildId} /></div>;
}
