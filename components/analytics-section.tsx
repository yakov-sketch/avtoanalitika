'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { BrandCombobox } from '@/components/brand-combobox';
import { RareCarsTable } from '@/components/rare-cars-table';
import type { CarGroup } from '@/lib/api';

type SortKey = 'activeCount' | 'avgPrice' | 'deficit' | 'liquidity' | 'attractiveness';

const RARE_THRESHOLD = 10;

type Section = '' | 'NEW' | 'USED';

type Filters = {
  brand: string;
  district: string;
  section: Section;
  premiumOnly: boolean;
  rareOnly: boolean;
  sort: SortKey;
  dir: 'asc' | 'desc';
};

const DEFAULTS: Filters = {
  brand: '',
  district: '',
  section: '',
  premiumOnly: true,
  rareOnly: false,
  sort: 'activeCount',
  dir: 'desc',
};

function readFromUrl(): Filters {
  if (typeof window === 'undefined') return DEFAULTS;
  const sp = new URLSearchParams(window.location.search);
  return {
    brand: sp.get('brand') || '',
    district: sp.get('district') || '',
    section: (sp.get('section') as Section) || '',
    premiumOnly: sp.get('premiumOnly') !== '0',
    rareOnly: sp.get('rareOnly') === '1',
    sort: (sp.get('sort') as SortKey) || 'activeCount',
    dir: (sp.get('dir') as 'asc' | 'desc') || 'desc',
  };
}

function buildPath(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.brand) sp.set('brand', f.brand);
  if (f.district) sp.set('district', f.district);
  if (!f.premiumOnly) sp.set('premiumOnly', '0');
  if (f.rareOnly) sp.set('rareOnly', '1');
  if (f.section) sp.set('section', f.section);
  if (f.sort !== 'activeCount') sp.set('sort', f.sort);
  if (f.dir !== 'desc') sp.set('dir', f.dir);
  const qs = sp.toString();
  return window.location.pathname + (qs ? `?${qs}` : '');
}

export function AnalyticsSection({
  allCars,
  brands,
  districts,
}: {
  allCars: CarGroup[];
  brands: string[];
  districts: string[];
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const initialised = useRef(false);
  const pushedSnapshot = useRef(false);

  // Initialize from URL after mount (avoids SSR mismatch)
  useEffect(() => {
    setFilters(readFromUrl());
    initialised.current = true;
  }, []);

  // Persist to URL. First user-driven change after mount goes via pushState
  // (creates an entry in browser history → "back" from a model card returns
  // to the filtered list). Subsequent rapid changes use replaceState so we
  // don't pollute history with every keystroke.
  useEffect(() => {
    if (typeof window === 'undefined' || !initialised.current) return;
    const path = buildPath(filters);
    if (path === window.location.pathname + window.location.search) return;
    if (!pushedSnapshot.current) {
      window.history.pushState(null, '', path);
      pushedSnapshot.current = true;
    } else {
      window.history.replaceState(null, '', path);
    }
  }, [filters]);

  // Reset the "next change should push" flag when user navigates back here,
  // so the next filter change creates a fresh history entry.
  useEffect(() => {
    const onPop = () => {
      pushedSnapshot.current = false;
      setFilters(readFromUrl());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((p) => ({ ...p, [key]: value }));

  const reset = () => setFilters(DEFAULTS);

  // Pre-filter for everything except rareOnly so we can show the toggle's
  // effect as "X из Y".
  const baseFiltered = useMemo(() => {
    return allCars.filter((c) => {
      if (filters.brand && !c.mark.toLowerCase().includes(filters.brand.toLowerCase())) return false;
      if (filters.district && !c.districtsPresent.includes(filters.district)) return false;
      if (filters.section && !(c.sections ?? []).includes(filters.section)) return false;
      if (filters.premiumOnly && !c.isPremium) return false;
      return true;
    });
  }, [allCars, filters.brand, filters.district, filters.section, filters.premiumOnly]);

  const filtered = useMemo(() => {
    return filters.rareOnly
      ? baseFiltered.filter((c) => c.activeCount <= RARE_THRESHOLD)
      : baseFiltered;
  }, [baseFiltered, filters.rareOnly]);

  const rareCount = useMemo(
    () => baseFiltered.filter((c) => c.activeCount <= RARE_THRESHOLD).length,
    [baseFiltered],
  );

  return (
    <>
      <div className="card flex flex-wrap items-end gap-4 p-5">
        <div className="flex items-center gap-2 text-muted">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Аналитика по</span>
        </div>

        <FieldGroup label="Бренд" width={180}>
          <BrandCombobox
            value={filters.brand}
            onChange={(v) => update('brand', v)}
            options={brands}
          />
        </FieldGroup>

        <FieldGroup label="Федеральный округ" width={180}>
          <select
            value={filters.district}
            onChange={(e) => update('district', e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Все округа</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup label="Состояние" width={150}>
          <select
            value={filters.section}
            onChange={(e) => update('section', e.target.value as Section)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Все</option>
            <option value="NEW">Новые</option>
            <option value="USED">Б/У</option>
          </select>
        </FieldGroup>

        <FieldGroup label="Сортировка" width={180}>
          <select
            value={`${filters.sort}:${filters.dir}`}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split(':') as [SortKey, 'asc' | 'desc'];
              setFilters((p) => ({ ...p, sort, dir }));
            }}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="activeCount:desc">По активным ↓</option>
            <option value="attractiveness:desc">По привлекательности ↓</option>
            <option value="deficit:desc">По дефициту ↓</option>
            <option value="liquidity:desc">По ликвидности ↓</option>
            <option value="avgPrice:desc">По цене ↓</option>
            <option value="avgPrice:asc">По цене ↑</option>
          </select>
        </FieldGroup>

        <div className="ml-auto flex items-center gap-3">
          <Toggle
            label="Только премиум"
            checked={filters.premiumOnly}
            onChange={(v) => update('premiumOnly', v)}
            hint="Audi, BMW, Mercedes-Benz, Porsche, Lexus, Rolls-Royce, Bentley, Land Rover и подобные премиум-бренды. Без галки покажутся также массовые: Kia, Hyundai, LADA, Renault."
          />
          <Toggle
            label={`Только редкие (≤${RARE_THRESHOLD})`}
            checked={filters.rareOnly}
            onChange={(v) => update('rareOnly', v)}
            hint={`Группы с не более ${RARE_THRESHOLD} активных объявлений. После текущих фильтров: ${baseFiltered.length} групп → ${rareCount} редких.`}
          />
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted transition hover:border-primary hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Сброс
          </button>
        </div>
      </div>

      <div className="mt-1 text-sm text-muted">
        Найдено <span className="font-mono text-foreground">{filtered.length}</span> групп. Состояние сохраняется в URL — можно поделиться ссылкой.
      </div>

      <RareCarsTable
        key={`${filters.sort}-${filters.dir}`}
        cars={filtered}
        initialSort={filters.sort}
        initialDir={filters.dir}
        pageSize={25}
      />
    </>
  );
}

function FieldGroup({ label, width, children }: { label: string; width: number; children: React.ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-1 sm:w-auto" style={{ width: undefined }} data-width={width}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <div style={{ width: '100%', maxWidth: width }}>{children}</div>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm cursor-pointer transition hover:border-primary"
      title={hint}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
