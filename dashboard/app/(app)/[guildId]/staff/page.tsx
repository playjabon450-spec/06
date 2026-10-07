import StaffTabs from "@/components/staff/StaffTabs";
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">فريق العمل</h1><StaffTabs guildId={params.guildId} /></div>;
}
