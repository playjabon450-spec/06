import TicketsTabs from "@/components/tickets/TicketsTabs";
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">التذاكر والدعم</h1><TicketsTabs guildId={params.guildId} /></div>;
}
