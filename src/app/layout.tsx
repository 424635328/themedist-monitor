import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/providers';

export const metadata: Metadata = {
  title: 'ThemeDist Pulse — Service Monitor',
  description: 'Real-time monitoring dashboard for ThemeDist dual-platform deployment',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
