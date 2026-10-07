import './globals.css';
import { Tajawal } from 'next/font/google';
const f = Tajawal({ subsets: ['arabic'], weight: ['400', '500', '700'] });
export const metadata = { title: 'لوحة تحكم المتجر' };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl"><body className={f.className}>{children}</body></html>;
}
