import SettingsForm from '@/components/SettingsForm';
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">الإعدادات</h1><SettingsForm guildId={params.guildId} /></div>;
}
