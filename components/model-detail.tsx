'use client';

import { useMemo, useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { BrandCombobox } from '@/components/brand-combobox';
import { ListingsTable } from '@/components/listings-row';
import { PriceHistogram, PriceVsYearChart } from '@/components/price-charts';
import { formatInt, formatRubles, type CarGroup, type Listing } from '@/lib/api';

type Filters = {
  yearFrom: number | null;
  yearTo: number | null;
  complectation: string;
};

export function ModelDetail({ group, listings }: { group: CarGroup; listings: Listing[] }) {
  // ---- Available year/complectation options based on listings ----
  const years = useMemo(() => listings.map((l) => l.year).filter((y): y is number => typeof y === 'number'), [listings]);
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;

  const complectations = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of listings) {
      if (!l.complectation) continue;
      m.set(l.complectation, (m.get(l.complectation) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [listings]);

  const DEFAULTS: Filters = { yearFrom: null, yearTo: null, complectation: '' };
  const [filters, setFilters] = useState<Filters>(DEFAULTS);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (filters.yearFrom !== null && (l.year ?? 0) < filters.yearFrom) return false;
      if (filters.yearTo !== null && (l.year ?? 9999) > filters.yearTo) return false;
      if (filters.complectation && l.complectation !== filters.complectation) return false;
      return true;
    });
  }, [listings, filters]);

  // ---- Aggregates over filtered ----
  const prices = filtered.map((l) => l.priceRub).filter((p): p is number => typeof p === 'number' && p > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const avgPrice = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null;

  const activeCount = filtered.filter((l) => l.status === 'active').length;
  const removedCount = filtered.filter((l) => l.status === 'removed').length;

  const countBy = (key: keyof Listing): [string, number][] => {
    const m = new Map<string, number>();
    for (const l of filtered) {
      const v = l[key];
      if (v === null || v === undefined || v === '') continue;
      const k = String(v);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };

  const modeOf = (key: keyof Listing): string | null => {
    const [first] = countBy(key);
    return first ? first[0] : null;
  };

  const heroImage = useMemo(() => {
    for (const l of filtered) {
      if (!l.imageUrls) continue;
      try {
        const arr = JSON.parse(l.imageUrls);
        if (Array.isArray(arr) && arr.length > 0) {
          const raw = typeof arr[0] === 'string' ? arr[0] : arr[0]?.url;
          if (typeof raw === 'string') return raw.startsWith('//') ? `https:${raw}` : raw;
        }
      } catch {}
    }
    return null;
  }, [filtered]);

  const techSpecs = {
    bodyType: modeOf('bodyType'),
    engineType: modeOf('engineType'),
    displacement: modeOf('displacement'),
    horsePower: modeOf('horsePower'),
    transmission: modeOf('transmission'),
    driveType: modeOf('driveType'),
    wheel: modeOf('wheel'),
  };

  const colorDist = countBy('color').slice(0, 8);
  const sectionDist = countBy('section');
  const sellerTypeDist = countBy('sellerType');
  const ptsDist = countBy('pts');
  const customDist = countBy('custom');

  const isFiltered = filters.yearFrom !== null || filters.yearTo !== null || filters.complectation !== '';
  const reset = () => setFilters(DEFAULTS);

  return (
    <>
      <div className="card flex flex-wrap items-end gap-4 p-5">
        <div className="flex items-center gap-2 text-muted">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Срез</span>
        </div>

        <FieldGroup label="Год от" width={110}>
          <input
            type="number"
            value={filters.yearFrom ?? ''}
            min={minYear ?? undefined}
            max={maxYear ?? undefined}
            placeholder={minYear?.toString() ?? '—'}
            onChange={(e) => setFilters((p) => ({ ...p, yearFrom: e.target.value ? Number(e.target.value) : null }))}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary"
          />
        </FieldGroup>

        <FieldGroup label="Год до" width={110}>
          <input
            type="number"
            value={filters.yearTo ?? ''}
            min={minYear ?? undefined}
            max={maxYear ?? undefined}
            placeholder={maxYear?.toString() ?? '—'}
            onChange={(e) => setFilters((p) => ({ ...p, yearTo: e.target.value ? Number(e.target.value) : null }))}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary"
          />
        </FieldGroup>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Быстро</span>
          <div className="flex gap-1">
            {[
              { label: 'Все', from: null, to: null },
              { label: 'до 2015', from: null, to: 2015 },
              { label: '2016–2020', from: 2016, to: 2020 },
              { label: '2021+', from: 2021, to: null },
            ].map((preset) => {
              const active = filters.yearFrom === preset.from && filters.yearTo === preset.to;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, yearFrom: preset.from, yearTo: preset.to }))}
                  className={`rounded px-2 py-1.5 text-xs font-medium transition ${
                    active ? 'bg-primary text-white' : 'border border-border bg-white text-muted hover:text-foreground'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <FieldGroup label="Комплектация" width={260}>
          <BrandCombobox
            value={filters.complectation}
            onChange={(v) => setFilters((p) => ({ ...p, complectation: v }))}
            options={complectations.map(([name]) => name)}
            placeholder={complectations.length ? 'Все комплектации' : 'Не указаны'}
          />
        </FieldGroup>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-sm text-muted">
            В срезе{' '}
            <span className="font-mono text-foreground">{filtered.length}</span>
            {' '}из{' '}
            <span className="font-mono text-foreground">{listings.length}</span>
            {' '}объявлений
          </div>
          <button
            onClick={reset}
            disabled={!isFiltered}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted transition hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Сброс
          </button>
        </div>
      </div>

      <section>
        <h2 className="mb-4 font-heading text-2xl font-semibold">О модели</h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-[280px_1fr]">
          <div className="card overflow-hidden">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt={`${group.mark} ${group.model}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center bg-slate-50 text-muted text-sm">
                Фото не приехало в выгрузке
              </div>
            )}
          </div>
          <div className="card p-6">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:gap-x-6 lg:grid-cols-3">
              <SpecRow label="Кузов" value={techSpecs.bodyType} />
              <SpecRow label="Двигатель" value={techSpecs.engineType} />
              <SpecRow label="Объём" value={techSpecs.displacement ? `${techSpecs.displacement} л` : null} />
              <SpecRow label="Мощность" value={techSpecs.horsePower ? `${techSpecs.horsePower} л.с.` : null} />
              <SpecRow label="Трансмиссия" value={techSpecs.transmission} />
              <SpecRow label="Привод" value={techSpecs.driveType} />
              <SpecRow label="Руль" value={techSpecs.wheel} />
              <SpecRow label="Активных в срезе" value={String(activeCount)} />
              <SpecRow label="Снятых в срезе" value={String(removedCount)} />
            </div>
            <div className="mt-4 text-xs text-muted">
              Модальные значения по {filtered.length} объявлениям. Если в срезе разные варианты — показано самое частое.
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-2xl font-semibold">Цены в срезе</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <Stat label="Минимум" value={formatRubles(minPrice)} />
          <Stat label="Среднее" value={formatRubles(avgPrice)} accent />
          <Stat label="Максимум" value={formatRubles(maxPrice)} />
          <Stat label="Размах" value={minPrice !== null && maxPrice !== null ? formatRubles(maxPrice - minPrice) : '—'} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold">Распределение цен</h3>
              <span className="text-xs text-muted">{filtered.length} объявлений</span>
            </div>
            <div className="mt-3"><PriceHistogram listings={filtered} /></div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold">Цена × год выпуска</h3>
              <span className="text-xs text-muted">точка = объявление</span>
            </div>
            <div className="mt-3"><PriceVsYearChart listings={filtered} /></div>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          История цен по дням (как меняется цена на протяжении недель) появится автоматически, когда накопится 7+
          ежедневных снимков. Сейчас snapshot один.
        </p>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-2xl font-semibold">Распределения</h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DistributionCard title="Цвета" entries={colorDist} total={filtered.length} />
          <DistributionCard
            title="Новые / Б/У"
            entries={sectionDist.map(([k, v]) => [k === 'NEW' ? 'Новые' : k === 'USED' ? 'Б/У' : k, v] as [string, number])}
            total={filtered.length}
          />
          <DistributionCard
            title="Тип продавца"
            entries={sellerTypeDist.map(
              ([k, v]) =>
                [
                  k === 'commercial' || k === 'Дилер' ? 'Дилер' : k === 'private' ? 'Частник' : k,
                  v,
                ] as [string, number],
            )}
            total={filtered.length}
          />
          <DistributionCard title="ПТС" entries={ptsDist} total={filtered.length} />
          <DistributionCard title="Таможня" entries={customDist} total={filtered.length} />
          <div className="card p-5">
            <div className="font-heading text-lg font-semibold">Топ комплектаций в срезе</div>
            <div className="mt-1 text-xs text-muted">
              По {filtered.length} объявлениям · указана у {Math.round((filtered.filter((l) => l.complectation).length / Math.max(filtered.length, 1)) * 100)}%
            </div>
            {complectations.length === 0 ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                В этой группе площадки не указали комплектацию.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {countBy('complectation').slice(0, 6).map(([name, count]) => (
                  <button
                    key={name}
                    onClick={() => setFilters((p) => ({ ...p, complectation: p.complectation === name ? '' : name }))}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                      filters.complectation === name
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-slate-50 hover:border-primary/40'
                    }`}
                  >
                    <span className="truncate" title={name}>{name}</span>
                    <span className="font-mono text-muted">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <div className="font-heading text-2xl font-semibold">Объявления в срезе</div>
          <div className="text-sm text-muted">
            {filtered.length} объявлений. Кликни стрелку слева — раскрывается фото, VIN, ПТС, опции, описание.
          </div>
        </div>
        <ListingsTable listings={filtered} />
      </section>
    </>
  );
}

function FieldGroup({ label, width, children }: { label: string; width: number; children: React.ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-1 sm:w-auto">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <div style={{ width: '100%', maxWidth: width }}>{children}</div>
    </label>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 font-mono text-xl font-semibold ${accent ? 'text-accent' : ''}`}>{value}</div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="font-mono text-foreground truncate max-w-[60%]" title={value ?? ''}>{value || '—'}</span>
    </div>
  );
}

function DistributionCard({
  title,
  entries,
  total,
}: {
  title: string;
  entries: [string, number][];
  total: number;
}) {
  return (
    <div className="card p-5">
      <div className="font-heading text-lg font-semibold">{title}</div>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Нет данных в срезе.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.map(([k, n]) => (
            <div key={k}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate" title={k}>{k}</span>
                <span className="font-mono text-muted">
                  {n} · {Math.round((n / Math.max(total, 1)) * 100)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-primary" style={{ width: `${(n / Math.max(total, 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
