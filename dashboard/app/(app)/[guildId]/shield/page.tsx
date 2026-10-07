import ShieldTabs from "@/components/shield/ShieldTabs";
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">الحماية</h1><ShieldTabs guildId={params.guildId} /></div>;
}
