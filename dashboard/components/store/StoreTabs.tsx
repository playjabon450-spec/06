'use client';
import { useState } from 'react';
import ProductsManager from './ProductsManager';
import CouponsManager from './CouponsManager';
import StorePanelForm from './StorePanelForm';
const TABS = [['products', 'المنتجات'], ['coupons', 'الكوبونات'], ['panel', 'لوحة المتجر والإعدادات']] as const;
export default function StoreTabs({ guildId }: { guildId: string }) {
  const [t, setT] = useState<string>('products');
  return <div className="space-y-4"><div className="flex gap-2 border-b">{TABS.map(([k, l]) => <button key={k} onClick={() => setT(k)} className={`px-4 py-2 -mb-px border-b-2 ${t === k ? 'border-sea font-bold' : 'border-transparent text-gray-600'}`}>{l}</button>)}</div>
    {t === 'products' && <ProductsManager guildId={guildId} />}{t === 'coupons' && <CouponsManager guildId={guildId} />}{t === 'panel' && <StorePanelForm guildId={guildId} />}</div>;
}
