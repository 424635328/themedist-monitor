'use client';

import { ReactNode } from 'react';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import { Languages } from 'lucide-react';
import ThemeDistTheme from './theme-dist-theme';

function Header() {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="border-b border-[#252530] bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">TP</div>
          <span className="font-semibold text-white text-sm">ThemeDist Pulse</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="hidden sm:inline">{t('nav.subtitle')}</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">{t('nav.platforms')}</span>
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1e1e28] hover:bg-[#2a2a35] border border-[#35354a] text-zinc-400 hover:text-zinc-200 transition-colors"
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
    <footer className="border-t border-[#252530] py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-600">
        {t('footer.text')}{' '}
        <a href="https://themedist.vercel.app" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2">ThemeDist</a>
      </div>
    </footer>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeDistTheme />
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <Footer />
    </LanguageProvider>
  );
}
