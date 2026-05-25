'use client';

import { useEffect, useRef, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const methodBadgeColors: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function TocNav({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const headingIds = items.map(i => i.id);
    const elements = headingIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    elements.forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <nav className="toc-nav relative max-h-[62vh] overflow-y-auto pr-1">
      {items.map((item) => {
        const isActive = activeId === item.id;
        const isH3 = item.level === 3;
        const isH1 = item.level === 1;

        const displayLabel = item.text.replace(/^(GET|POST|DELETE|PUT|PATCH)\s+/, '');
        const hasMethod = item.text.match(/^(GET|POST|DELETE|PUT|PATCH)/);
        const methodStr = hasMethod ? hasMethod[0] : '';

        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleClick(e, item.id)}
            className={`
              toc-item group relative flex items-center gap-2 py-2 pr-2.5 pl-4 rounded-r-lg
              transition-all duration-200 ease-out
              ${isH3 ? 'pl-8' : isH1 ? 'pl-3' : 'pl-5'}
              ${isActive
                ? 'text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
              }
              ${isH1
                ? 'text-[11px] font-semibold tracking-widest uppercase mt-5 first:mt-0 mb-1'
                : isH3
                  ? 'text-[11px] leading-snug'
                  : 'text-xs font-medium mt-0.5'
              }
            `}
          >
            {/* Active background gradient */}
            <span
              className={`
                absolute inset-y-0.5 left-0 right-0 rounded-r-lg
                bg-gradient-to-r from-indigo-500/10 via-indigo-500/4 to-transparent
                transition-opacity duration-300 ease-out
                ${isActive ? 'opacity-100' : 'opacity-0'}
              `}
            />

            {/* Active left bar */}
            <span
              className={`
                absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full
                bg-indigo-400 transition-all duration-300 ease-out
                ${isActive ? 'h-4 opacity-100' : 'h-0 opacity-0'}
              `}
            />

            {/* Label */}
            <span className="relative truncate flex-1">{displayLabel}</span>

            {/* Method badge */}
            {methodStr && (
              <span
                className={`
                  relative shrink-0 text-[9px] font-mono font-bold uppercase
                  px-1.5 py-0.5 rounded border transition-all duration-200
                  ${isActive
                    ? methodBadgeColors[methodStr] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
                    : 'text-zinc-600 bg-zinc-800/40 border-zinc-800/50 group-hover:text-zinc-400 group-hover:border-zinc-700/50'
                  }
                `}
              >
                {methodStr}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
