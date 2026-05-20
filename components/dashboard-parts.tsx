import Link from 'next/link';
import { ArrowRight, CarFront, CircleAlert, Database, MapPin, Sparkles, TrendingUp } from 'lucide-react';
import { formatInt, formatRubles, type MarketTotals, type PlatformAnalytics, type RegionAnalytics } from '@/lib/api';

export function DashboardTopBar({ totals, snapshotDate }: { totals: MarketTotals; snapshotDate: string | null }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <h1 className="section-title">Обзор рынка</h1>
        <p className="section-subtitle mt-1">
          Анализ {formatInt(totals.totalListings)} активных объявлений • Найдено{' '}
          {formatInt(totals.rareModels)} редких групп
          {snapshotDate ? ` • Снимок ${snapshotDate}` : ''}
        </p>
      </div>
    </div>
  );
}

export function RareInfoBanner({ totals }: { totals: MarketTotals }) {
  const sharePct =
    totals.totalGroups > 0 ? ((totals.rareModels / totals.totalGroups) * 100).toFixed(1) : '—';
  return (
    <div className="card bg-rare-gradient p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-[15px] text-foreground">
          <span className="font-mono text-lg font-semibold text-accent">{formatInt(totals.rareModels)}</span> редких групп из{' '}
          <span className="font-mono text-lg font-semibold">{formatInt(totals.totalGroups)}</span> всего ({sharePct}%) ·{' '}
          <span className="font-mono text-lg font-semibold">{formatInt(totals.totalListings)}</span> активных объявлений
        </div>
      </div>
    </div>
  );
}

export function KpiGrid({ totals }: { totals: MarketTotals }) {
  const items = [
    { label: 'Всего активных', value: formatInt(totals.totalListings), icon: Database, color: 'bg-slate-100 text-primary', href: '/rare-models?premiumOnly=0' },
    { label: 'Новые автомобили', value: formatInt(totals.newCars), icon: CarFront, color: 'bg-emerald-50 text-success', href: '/rare-models?premiumOnly=0&section=NEW' },
    { label: 'Авто до 1 года', value: formatInt(totals.underOneYear), icon: TrendingUp, color: 'bg-sky-50 text-sky-700', href: '/rare-models?premiumOnly=0&yearFrom=2025' },
    { label: 'Редких групп', value: formatInt(totals.rareModels), icon: Sparkles, color: 'bg-yellow-50 text-accent', href: '/rare-models?rareOnly=1' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {items.map((item) => (
        <Link key={item.label} href={item.href} className="card group p-5 hover:border-primary/30">
          <div className="flex items-start justify-between">
            <div className={`rounded-xl p-3 ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 metric-value group-hover:text-primary">{item.value}</div>
          <div className="mt-1 text-sm text-muted">{item.label}</div>
        </Link>
      ))}
    </div>
  );
}

export function PlatformsGrid({ platforms }: { platforms: PlatformAnalytics[] }) {
  const totalAll = platforms.reduce((s, p) => s + p.totalListings, 0) || 1;
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
      {platforms.map((platform) => {
        const share = (platform.totalListings / totalAll) * 100;
        const newPct = platform.totalListings > 0 ? (platform.newCars / platform.totalListings) * 100 : 0;
        const rarePct = platform.totalListings > 0 ? (platform.rareModels / platform.totalListings) * 100 : 0;
        return (
          <Link key={platform.id} href={`/platform/${encodeURIComponent(platform.id)}`} className="card group p-5 hover:border-primary/30">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-heading text-2xl font-semibold text-foreground group-hover:text-primary">{platform.id}</div>
                <div className="mt-1 text-sm text-muted">{share.toFixed(0)}% всех объявлений</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-mono text-muted">
                {formatInt(platform.totalListings)}
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <MetricRow label="Активные объявления" value={formatInt(platform.totalListings)} />
              <MetricRow label="Из них новые" value={`${formatInt(platform.newCars)} · ${newPct.toFixed(1)}%`} />
              <MetricRow label="Редкие группы" value={`${formatInt(platform.rareModels)} · ${rarePct.toFixed(1)}%`} emphasized />
              <MetricRow label="Средняя цена" value={formatRubles(platform.avgPrice)} />
              {platform.topBrands.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="text-xs uppercase tracking-wide text-muted">Топ-5 брендов</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {platform.topBrands.map((b) => (
                      <span key={b} className="rounded-full border border-border bg-slate-50 px-2 py-0.5 font-mono text-xs text-foreground/80">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-muted opacity-0 transition group-hover:opacity-100">
              открыть детали →
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function RegionsGrid({ regions, max = 12 }: { regions: RegionAnalytics[]; max?: number }) {
  const top = regions.slice(0, max);
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {top.map((region) => (
        <Link
          key={region.id}
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
      ))}
    </div>
  );
}

export function RareModelsBanner({ totalGroups, activeListings }: { totalGroups: number; activeListings: number }) {
  return (
    <div className="card border-yellow-200 bg-rare-gradient p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-accent">
          <CircleAlert className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="font-heading text-3xl font-semibold">Найдено {formatInt(totalGroups)} групп</div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-foreground/80">
            По текущим фильтрам показано <span className="font-mono font-semibold text-accent">{formatInt(totalGroups)}</span> групп
            из <span className="font-mono font-semibold">{formatInt(activeListings)}</span> активных объявлений.
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegionCards({
  present,
  missing,
  knownRegions,
}: {
  present: string[];
  missing: string[];
  knownRegions: Set<string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-2">
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-success">
          <TrendingUp className="h-5 w-5" />
          <div className="font-heading text-2xl font-semibold text-foreground">Регионы присутствия</div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-mono text-success">{present.length}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {present.map((region) =>
            knownRegions.has(region) ? (
              <Link
                key={region}
                href={`/region/${encodeURIComponent(region)}`}
                className="badge-base border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
              >
                {region}
              </Link>
            ) : (
              <span key={region} className="badge-base border-emerald-200 bg-emerald-50 text-emerald-700">
                {region}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-warning">
          <ArrowRight className="h-5 w-5 rotate-180" />
          <div className="font-heading text-2xl font-semibold text-foreground">Федеральные округа отсутствия</div>
          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-mono text-warning">{missing.length}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {missing.map((d) => (
            <span key={d} className="badge-base border-amber-200 bg-amber-50 text-amber-700">
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${emphasized ? 'text-accent' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
