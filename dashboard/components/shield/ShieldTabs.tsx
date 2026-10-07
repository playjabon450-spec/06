'use client';
import { useState } from 'react';
import IncidentsList from './IncidentsList';
import AppealsReview from './AppealsReview';
import Dossier from './Dossier';
import ShieldSettingsForm from './ShieldSettingsForm';
const TABS = [['inc', 'الحوادث'], ['appeals', 'الاستئنافات'], ['dossier', 'ملف العضو'], ['settings', 'الإعدادات']] as const;
export default function ShieldTabs({ guildId }: { guildId: string }) {
  const [t, setT] = useState<string>('inc'); const [user, setUser] = useState<string>(''); const open = (id: string) => { setUser(id); setT('dossier'); };
  return <div className="space-y-4"><div className="flex flex-wrap gap-2 border-b">{TABS.map(([k, l]) => <button key={k} onClick={() => setT(k)} className={`px-4 py-2 -mb-px border-b-2 ${t === k ? 'border-sea font-bold' : 'border-transparent text-gray-600'}`}>{l}</button>)}</div>
    {t === 'inc' && <IncidentsList guildId={guildId} onUser={open} />}{t === 'appeals' && <AppealsReview guildId={guildId} onUser={open} />}{t === 'dossier' && <Dossier guildId={guildId} initial={user} />}{t === 'settings' && <ShieldSettingsForm guildId={guildId} />}</div>;
}
