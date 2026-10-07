'use client';
import { useState } from 'react';
import OverviewPanel from './OverviewPanel';
import RetentionPanel from './RetentionPanel';
import BestTimePanel from './BestTimePanel';
import HealthPanel from './HealthPanel';
import InsightsSettings from './InsightsSettings';
const TABS = [['over', 'التحليلات'], ['ret', 'الاحتفاظ والتسرّب'], ['time', 'أفضل وقت للنشر'], ['health', 'صحة السيرفر'], ['settings', 'الإعدادات']] as const;
export default function InsightsTabs({ guildId }: { guildId: string }) {
  const [t, setT] = useState<string>('over');
  return <div className="space-y-4"><div className="flex flex-wrap gap-2 border-b">{TABS.map(([k, l]) => <button key={k} onClick={() => setT(k)} className={`px-4 py-2 -mb-px border-b-2 ${t === k ? 'border-sea font-bold' : 'border-transparent text-gray-600'}`}>{l}</button>)}</div>
    {t === 'over' && <OverviewPanel guildId={guildId} />}{t === 'ret' && <RetentionPanel guildId={guildId} />}{t === 'time' && <BestTimePanel guildId={guildId} />}{t === 'health' && <HealthPanel guildId={guildId} />}{t === 'settings' && <InsightsSettings guildId={guildId} />}</div>;
}
