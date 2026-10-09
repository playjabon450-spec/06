import './globals.css';
export const metadata = { title: 'لوحة تحكم المتجر' };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
