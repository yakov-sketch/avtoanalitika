import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Аналитика для Ровена',
  description: 'Личный аналитический кабинет для поиска редких и недопредставленных автомобилей.',
};

export const viewport: Viewport = {
  width: 1440,
  initialScale: 0.3,
  minimumScale: 0.1,
  maximumScale: 2,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
