import OrdersTable from "@/components/store/OrdersTable";
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">الطلبات</h1><OrdersTable guildId={params.guildId} /></div>;
}
