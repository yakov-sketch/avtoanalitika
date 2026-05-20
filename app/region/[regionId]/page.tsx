import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Search } from 'lucide-react';
import { Header } from '@/components/header';
import { BackButton } from '@/components/back-button';
import { CompetitionBadge } from '@/components/badges';
import { RareCarsTable } from '@/components/rare-cars-table';
import { api, formatInt, formatRubles } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function RegionPage({ params }: { params: { regionId: string } }) {
  const id = decodeURIComponent(params.regionId);
  let region, regionGroups;
  try {
    [region, regionGroups] = await Promise.all([
      api.region(id),
      api.search({ region: id, sort: 'prospect' }),
    ]);
  } catch {
    notFound();
  }

  const totalPlatforms = region.topPlatforms.reduce((s, p) => s + p.count, 0) || 1;
  const totalSections = region.sections.reduce((s, p) => s + p.count, 0) || 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                <MapPin className="h-3.5 w-3.5" /> Аналитика региона
              </div>
              <h1 className="mt-2 font-heading text-4xl font-semibold">{region.id}</h1>
              {region.district ? (
                <div className="mt-1 text-sm text-muted">{region.district} федеральный округ</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-5">
          <Stat label="Всего активных" value={formatInt(region.totalListings)} />
          <Stat label="Средняя цена" value={formatRubles(region.avgPrice)} mono />
          <Stat label="Средний год" value={region.avgYear ? String(region.avgYear) : '—'} mono />
          <Stat label="Средний пробег" value={region.avgKm ? `${formatInt(region.avgKm)} км` : '—'} mono />
          <div className="card p-5">
            <div className="text-sm text-muted">Конкуренция</div>
            <div className="mt-3"><CompetitionBadge value={region.competition} /></div>
            <div className="mt-2 text-xs text-muted">{region.district ?? '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-heading text-2xl font-semibold">Доля по платформам</h2>
            <div className="mt-5 space-y-3">
              {region.topPlatforms.length === 0 && <p className="text-sm text-muted">Нет данных.</p>}
              {region.topPlatforms.map((p) => (
                <Link
                  key={p.id}
                  href={`/platform/${encodeURIComponent(p.id)}`}
                  className="block rounded-xl border border-border bg-white p-3 transition hover:border-primary"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.id}</span>
                    <span className="font-mono text-muted">{formatInt(p.count)} · {Math.round((p.count / totalPlatforms) * 100)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-primary" style={{ width: `${(p.count / totalPlatforms) * 100}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-heading text-2xl font-semibold">Топ городов</h2>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {region.topCities.length === 0 && <p className="text-sm text-muted">Нет данных.</p>}
              {region.topCities.map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm">
                  <span className="truncate" title={c.name}>{c.name}</span>
                  <span className="font-mono text-muted">{c.count}</span>
                </div>
              ))}
            </div>
            {region.sections.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Распределение Новые / Б/У</h3>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {region.sections.map((s, i) => (
                    <div key={s.name} className={i === 0 ? 'bg-emerald-500' : 'bg-slate-400'} style={{ width: `${(s.count / totalSections) * 100}%` }} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                  {region.sections.map((s) => (
                    <span key={s.name}>
                      {s.name === 'NEW' ? 'Новые' : 'Б/У'}: <span className="font-mono text-foreground">{formatInt(s.count)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-heading text-2xl font-semibold">Популярные модели</h2>
            <div className="mt-5 space-y-3">
              {region.popularModels.length === 0 && <p className="text-sm text-muted">Нет данных.</p>}
              {region.popularModels.map((model, index) => (
                <div key={model} className="flex items-center justify-between rounded-xl border border-border bg-slate-50 px-4 py-3">
                  <span>{model}</span>
                  <span className="font-mono text-muted">#{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-heading text-2xl font-semibold">Модели в дефиците</h2>
            <div className="mt-5 space-y-3">
              {region.deficitModels.length === 0 && <p className="text-sm text-muted">Нет данных.</p>}
              {region.deficitModels.map((model) => (
                <div key={model} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                  <span>{model}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card border-sky-200 bg-sky-50 p-6">
          <h2 className="font-heading text-2xl font-semibold">Краткое описание</h2>
          <p className="mt-4 max-w-4xl text-[15px] leading-7 text-slate-700">{region.recommendation}</p>
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold">Все группы в регионе</h2>
              <p className="mt-1 text-sm text-muted">
                {regionGroups.total} групп с активными объявлениями в {region.id}. Сортируй, ищи, фильтруй.
              </p>
            </div>
            <Link
              href={`/rare-models?region=${encodeURIComponent(region.id)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:shadow-cardHover"
            >
              <Search className="h-4 w-4" /> Открыть в большом поиске
            </Link>
          </div>
          <RareCarsTable cars={regionGroups.items} initialSort="activeCount" initialDir="desc" pageSize={20} />
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-3 text-2xl font-semibold ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
