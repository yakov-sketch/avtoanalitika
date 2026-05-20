'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Sparkles, X } from 'lucide-react';
import { api, type UniversalSearchResponse } from '@/lib/api';

export function UniversalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<UniversalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api.universalSearch(q)
        .then((r) => { if (!cancelled) setResult(r); })
        .catch(() => { if (!cancelled) setResult(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const hasAny =
    result && (result.groups.length || result.brands.length || result.regions.length || result.platforms.length);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 transition focus-within:border-primary">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              router.push(`/rare-models?model=${encodeURIComponent(query.trim())}&premiumOnly=0`);
              setOpen(false);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Поиск: марка, модель, регион, площадка..."
          className="flex-1 text-sm outline-none placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResult(null);
            }}
            className="rounded p-0.5 text-muted hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full max-h-[420px] overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
          {loading && <div className="p-4 text-sm text-muted">Ищу…</div>}
          {!loading && !hasAny && (
            <div className="p-4 text-sm text-muted">Ничего не найдено.</div>
          )}
          {!loading && hasAny && (
            <>
              {result!.groups.length > 0 && (
                <Section title="Модели">
                  {result!.groups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/model/${g.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {g.isPremium && <Sparkles className="h-3.5 w-3.5 text-accent" />}
                        <span className="truncate">{g.fullName}</span>
                      </span>
                      <span className="font-mono text-xs text-muted">{g.activeCount}</span>
                    </Link>
                  ))}
                </Section>
              )}
              {result!.brands.length > 0 && (
                <Section title="Бренды">
                  {result!.brands.map((b) => (
                    <Link
                      key={b}
                      href={`/rare-models?brand=${encodeURIComponent(b)}`}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 text-sm transition hover:bg-slate-50"
                    >
                      {b}
                    </Link>
                  ))}
                </Section>
              )}
              {result!.regions.length > 0 && (
                <Section title="Регионы">
                  {result!.regions.map((r) => (
                    <Link
                      key={r}
                      href={`/region/${encodeURIComponent(r)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm transition hover:bg-slate-50"
                    >
                      <MapPin className="h-3.5 w-3.5 text-sky-700" />
                      {r}
                    </Link>
                  ))}
                </Section>
              )}
              {result!.platforms.length > 0 && (
                <Section title="Площадки">
                  {result!.platforms.map((p) => (
                    <Link
                      key={p}
                      href={`/platform/${encodeURIComponent(p)}`}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 text-sm transition hover:bg-slate-50"
                    >
                      {p}
                    </Link>
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">{title}</div>
      <div>{children}</div>
    </div>
  );
}
