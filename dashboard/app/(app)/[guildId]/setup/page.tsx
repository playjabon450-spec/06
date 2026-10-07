import SetupWizard from "@/components/SetupWizard";
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">معالج الإعداد الأولي</h1><SetupWizard guildId={params.guildId} /></div>;
}
