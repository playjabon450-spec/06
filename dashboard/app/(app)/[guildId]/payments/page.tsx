import PaymentsManager from "@/components/store/PaymentsManager";
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">المدفوعات</h1><PaymentsManager guildId={params.guildId} /></div>;
}
