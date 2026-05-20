'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { formatInt, formatRubles, type RegionAnalytics } from '@/lib/api';

const PINNED = ['Москва', 'Москва и Московская область', 'Санкт-Петербург'];

export function RegionsGridCollapsible({ regions }: { regions: RegionAnalytics[] }) {
  const [open, setOpen] = useState(false);

  const { pinned, rest } = useMemo(() => {
    const isPinned = (id: string) => PINNED.some((p) => id === p || id.startsWith(p));
    const p: RegionAnalytics[] = [];
    const r: RegionAnalytics[] = [];
    for (const region of regions) (isPinned(region.id) ? p : r).push(region);
    p.sort((a, b) => b.totalListings - a.totalListings);
    return { pinned: p, rest: r };
  }, [regions]);

  const shown = open ? [...pinned, ...rest] : pinned;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((region) => (
          <RegionCard key={region.id} region={region} />
        ))}
      </div>

      {rest.length > 0 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-medium text-foreground shadow-card transition hover:border-primary hover:shadow-cardHover"
        >
          {open ? (
            <>
              Свернуть остальные регионы <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Показать остальные регионы ({rest.length}) <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function RegionCard({ region }: { region: RegionAnalytics }) {
  return (
    <Link
      href={`/region/${encodeURIComponent(region.id)}`}
      className="card group p-5 hover:border-primary/30"
    >
      <div className="flex items-start justify-between">
        <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
          <MapPin className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-muted">
          {region.district ?? '—'}
        </span>
      </div>
      <div className="mt-5 font-heading text-lg font-semibold text-foreground group-hover:text-primary truncate" title={region.id}>
        {region.id}
      </div>
      <div className="mt-1 text-sm text-muted">{formatInt(region.totalListings)} объявлений</div>
      <div className="mt-3 text-sm text-muted">
        Средняя цена <span className="font-mono text-foreground">{formatRubles(region.avgPrice)}</span>
      </div>
    </Link>
  );
}
