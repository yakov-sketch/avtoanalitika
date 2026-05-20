'use client';

import Link from 'next/link';
import { TrendingUp, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils';
import { UniversalSearch } from '@/components/universal-search';

export function Header() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-5">
        <Link href="/" className="flex items-center gap-3 transition hover:opacity-80 sm:gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-card sm:h-12 sm:w-12">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="font-heading text-xl font-semibold text-foreground sm:text-3xl">Аналитика для Ровена</div>
            <div className="hidden text-sm text-muted sm:block">Поиск редких и недопредставленных автомобилей</div>
          </div>
        </Link>
        <div className="flex flex-1 items-center gap-2 sm:justify-end sm:gap-3">
          <div className="flex-1 sm:max-w-md">
            <UniversalSearch />
          </div>
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-foreground shadow-card transition hover:border-primary sm:text-sm"
            title="Избранное — помеченные машины"
          >
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Избранное</span>
          </Link>
          <div className="hidden rounded-lg border border-border bg-white px-3 py-2 text-right shadow-card md:block">
            <div className="font-mono text-xs uppercase tracking-wide text-muted">Обновлено</div>
            <div className="font-mono text-sm text-foreground" suppressHydrationWarning>
              {now ? formatDateTime(now) : '—'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
