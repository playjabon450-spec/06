import StoreTabs from "@/components/store/StoreTabs";
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">المتجر</h1><StoreTabs guildId={params.guildId} /></div>;
}
