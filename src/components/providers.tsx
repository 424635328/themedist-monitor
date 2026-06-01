'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import { Languages, Monitor, FileText } from 'lucide-react';
import ThemeDistTheme from './theme-dist-theme';

function Header() {
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();

  const navLinkClass = (href: string) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
      pathname === href
        ? 'bg-[#2a2a35] text-zinc-200 border border-[#45455a]'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1e1e28] border border-transparent'
    }`;

  return (
    <header className="border-b border-[var(--color-border,#252530)] bg-[var(--color-bg,#0a0a0f)]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_14px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.45)] transition-shadow">TP</div>
            <span className="font-semibold text-[var(--color-text,#fff)] text-sm hidden sm:inline">ThemeDist Pulse</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <ThemeDistTheme />
          <span className="hidden lg:inline text-zinc-700">|</span>
          <Link href="/demo" className={navLinkClass('/demo')}>
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">Demo</span>
          </Link>
          <Link href="/api-docs" className={navLinkClass('/api-docs')}>
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">Docs</span>
          </Link>
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1e1e28] hover:bg-[#2a2a35] border border-[#35354a] text-zinc-400 hover:text-zinc-200 transition-all"
            title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <Languages className="w-3 h-3" />
            <span className="text-[11px] font-medium">{lang === 'zh' ? 'EN' : '中文'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-[#252530] py-8 mt-12 relative z-[1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-600">
        {t('footer.text')}{' '}
        <a href="https://themedist.vercel.app" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2 transition-colors">ThemeDist</a>
      </div>
    </footer>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-[1]">
        {children}
      </main>
      <Footer />
    </LanguageProvider>
  );
}
