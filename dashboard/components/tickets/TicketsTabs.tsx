'use client';
import { useState } from 'react';
import TicketsList from './TicketsList';
import CategoriesManager from './CategoriesManager';
import KbManager from './KbManager';
import SlaReport from './SlaReport';
import TicketSettingsForm from './TicketSettingsForm';
const TABS = [['list', 'التذاكر'], ['cats', 'الأقسام'], ['kb', 'قاعدة المعرفة'], ['sla', 'تقرير SLA'], ['panel', 'اللوحة والإعدادات']] as const;
export default function TicketsTabs({ guildId }: { guildId: string }) {
  const [t, setT] = useState<string>('list');
  return <div className="space-y-4"><div className="flex flex-wrap gap-2 border-b">{TABS.map(([k, l]) => <button key={k} onClick={() => setT(k)} className={`px-4 py-2 -mb-px border-b-2 ${t === k ? 'border-sea font-bold' : 'border-transparent text-gray-600'}`}>{l}</button>)}</div>
    {t === 'list' && <TicketsList guildId={guildId} />}{t === 'cats' && <CategoriesManager guildId={guildId} />}{t === 'kb' && <KbManager guildId={guildId} />}{t === 'sla' && <SlaReport guildId={guildId} />}{t === 'panel' && <TicketSettingsForm guildId={guildId} />}</div>;
}
