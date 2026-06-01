import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/providers';

export const metadata: Metadata = {
  title: 'ThemeDist Pulse — Service Monitor',
  description: 'Real-time monitoring dashboard for ThemeDist dual-platform deployment',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        {/* Blocking script: apply cached theme CSS vars before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem('td-theme-cache');if(c){var d=JSON.parse(c);if(d&&d.cssVars){var r=document.documentElement;var k=Object.keys(d.cssVars);for(var i=0;i<k.length;i++){r.style.setProperty(k[i],d.cssVars[k[i]])}if(d.customCss){var s=document.createElement('style');s.setAttribute('data-td-theme','1');s.textContent=d.customCss;document.head.appendChild(s)}window.__tdThemeCached=d}}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
