import InsightsTabs from "@/components/insights/InsightsTabs";
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">التحليلات والاحتفاظ</h1><InsightsTabs guildId={params.guildId} /></div>;
}
