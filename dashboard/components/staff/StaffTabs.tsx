'use client';
import { useState } from 'react';
import ActivityPanel from './ActivityPanel';
import StaffSettingsForm from './StaffSettingsForm';
import ApplicationsManager from './ApplicationsManager';
const TABS = [['act', 'النشاط والإحصاءات'], ['apps', 'التقديمات'], ['settings', 'التقارير والإعدادات']] as const;
export default function StaffTabs({ guildId }: { guildId: string }) {
  const [t, setT] = useState<string>('act');
  return <div className="space-y-4"><div className="flex flex-wrap gap-2 border-b">{TABS.map(([k, l]) => <button key={k} onClick={() => setT(k)} className={`px-4 py-2 -mb-px border-b-2 ${t === k ? 'border-sea font-bold' : 'border-transparent text-gray-600'}`}>{l}</button>)}</div>
    {t === 'act' && <ActivityPanel guildId={guildId} />}{t === 'apps' && <ApplicationsManager guildId={guildId} />}{t === 'settings' && <StaffSettingsForm guildId={guildId} />}</div>;
}
