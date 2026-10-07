import Editor from '@/components/MessagesEditor';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaults: Record<string, string> = require('@/lib/ar.js');
export default function Page({ params }: { params: { guildId: string } }) {
  return <div><h1 className="text-2xl font-bold mb-4">الرسائل والنصوص</h1><Editor guildId={params.guildId} defaults={defaults} /></div>;
}
