'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { BrandCombobox } from '@/components/brand-combobox';

type Props = {
  triggerLabel?: string;
  platforms: string[];
  brands: string[];
  districts: string[];
  bodyTypes: string[];
};

const SORT_LABEL_TO_VALUE: Record<string, string> = {
  'По перспективности': 'prospect',
  'По дефициту': 'deficit',
  'По ликвидности': 'liquidity',
  'По спросу': 'demand',
  'По цене (возрастание)': 'price_asc',
  'По цене (убывание)': 'price_desc',
};

export function SearchPanel({
  triggerLabel = 'Задать параметры',
  platforms,
  brands,
  districts,
  bodyTypes,
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaultState = useMemo(
    () => ({
      platform: 'Все платформы',
      priceFrom: '',
      priceTo: '',
      brand: '',
      model: '',
      bodyType: '',
      district: '',
      region: '',
      section: '',
      yearFrom: '',
      yearTo: '',
      listingsFrom: '',
      listingsTo: '',
      rareOnly: false,
      premiumOnly: true,
      sort: 'По перспективности',
    }),
    [],
  );

  const [formState, setFormState] = useState(defaultState);

  const updateField = (field: keyof typeof defaultState, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const apply = () => {
    const parseNum = (s: string): number | undefined => {
      const cleaned = s.replace(/\s+/g, '');
      if (!cleaned) return undefined;
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : undefined;
    };

    const sp = new URLSearchParams();
    if (formState.platform && formState.platform !== 'Все платформы') sp.set('platform', formState.platform);
    if (formState.brand) sp.set('brand', formState.brand);
    if (formState.model) sp.set('model', formState.model);
    if (formState.bodyType) sp.set('bodyType', formState.bodyType);
    if (formState.district) sp.set('district', formState.district);
    if (formState.region) sp.set('region', formState.region);
    if (formState.section) sp.set('section', formState.section);
    const pf = parseNum(formState.priceFrom);
    if (pf !== undefined) sp.set('priceFrom', String(pf));
    const pt = parseNum(formState.priceTo);
    if (pt !== undefined) sp.set('priceTo', String(pt));
    const yf = parseNum(formState.yearFrom);
    if (yf !== undefined) sp.set('yearFrom', String(yf));
    const yt = parseNum(formState.yearTo);
    if (yt !== undefined) sp.set('yearTo', String(yt));
    const lf = parseNum(formState.listingsFrom);
    if (lf !== undefined) sp.set('listingsFrom', String(lf));
    const lt = parseNum(formState.listingsTo);
    if (lt !== undefined) sp.set('listingsTo', String(lt));
    if (formState.rareOnly) sp.set('rareOnly', '1');
    if (!formState.premiumOnly) sp.set('premiumOnly', '0');
    sp.set('sort', SORT_LABEL_TO_VALUE[formState.sort] ?? 'prospect');

    router.push(`/rare-models?${sp.toString()}`);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-card transition hover:shadow-cardHover active:scale-[0.98]"
      >
        <Search className="h-4 w-4" />
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
          <button aria-label="Закрыть панель" className="h-full flex-1 cursor-default" onClick={() => setOpen(false)} />

          <aside className="flex h-full w-full max-w-full flex-col border-l border-border bg-white shadow-2xl sm:w-[600px]">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-foreground">Параметры поиска</h2>
                <p className="mt-1 text-sm text-muted">Фильтры для анализа рынка</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border p-2 text-muted transition hover:border-primary hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <Field label="Платформа">
                <Select value={formState.platform} onChange={(v) => updateField('platform', v)} options={['Все платформы', ...platforms]} />
              </Field>

              <Grid2>
                <Field label="Цена от, ₽">
                  <Input value={formState.priceFrom} onChange={(v) => updateField('priceFrom', v)} placeholder="500000" />
                </Field>
                <Field label="Цена до, ₽">
                  <Input value={formState.priceTo} onChange={(v) => updateField('priceTo', v)} placeholder="10000000" />
                </Field>
              </Grid2>

              <Grid2>
                <Field label="Бренд (печатный)">
                  <BrandCombobox
                    value={formState.brand}
                    onChange={(v) => updateField('brand', v)}
                    options={brands}
                    placeholder="Audi, Hongqi, Chery..."
                  />
                </Field>
                <Field label="Модель">
                  <Input value={formState.model} onChange={(v) => updateField('model', v)} placeholder="Например, X5" />
                </Field>
              </Grid2>

              <Grid2>
                <Field label="Федеральный округ">
                  <Select value={formState.district} onChange={(v) => updateField('district', v)} options={['', ...districts]} placeholderOption="Все округа" />
                </Field>
                <Field label="Регион (текстом)">
                  <Input value={formState.region} onChange={(v) => updateField('region', v)} placeholder="Москва" />
                </Field>
              </Grid2>

              <Grid2>
                <Field label="Кузов">
                  <Select value={formState.bodyType} onChange={(v) => updateField('bodyType', v)} options={['', ...bodyTypes]} placeholderOption="Все типы" />
                </Field>
                <Field label="Состояние">
                  <select
                    value={formState.section}
                    onChange={(e) => updateField('section', e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
                  >
                    <option value="">Все</option>
                    <option value="NEW">Новые</option>
                    <option value="USED">Б/У</option>
                  </select>
                </Field>
              </Grid2>

              <Grid2>
                <Field label="Год от"><Input value={formState.yearFrom} onChange={(v) => updateField('yearFrom', v)} placeholder="2015" /></Field>
                <Field label="Год до"><Input value={formState.yearTo} onChange={(v) => updateField('yearTo', v)} placeholder="2026" /></Field>
              </Grid2>

              <Grid2>
                <Field label="Объявлений от"><Input value={formState.listingsFrom} onChange={(v) => updateField('listingsFrom', v)} placeholder="1" /></Field>
                <Field label="Объявлений до"><Input value={formState.listingsTo} onChange={(v) => updateField('listingsTo', v)} placeholder="10" /></Field>
              </Grid2>

              <div className="space-y-3 rounded-xl border border-border bg-slate-50 p-4">
                <CheckRow label="Только редкие (≤10 объявлений)" checked={formState.rareOnly} onChange={(c) => updateField('rareOnly', c)} />
                <CheckRow label="Только премиум-бренды" checked={formState.premiumOnly} onChange={(c) => updateField('premiumOnly', c)} />
              </div>

              <Field label="Сортировка">
                <Select value={formState.sort} onChange={(v) => updateField('sort', v)} options={Object.keys(SORT_LABEL_TO_VALUE)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border px-6 py-5">
              <button
                onClick={() => setFormState(defaultState)}
                className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary hover:bg-white"
              >
                Сбросить
              </button>
              <button
                onClick={apply}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition hover:shadow-cardHover active:scale-[0.98]"
              >
                <Search className="h-4 w-4" />
                Применить
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary"
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholderOption,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholderOption?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
    >
      {options.map((opt) =>
        opt === '' ? (
          <option key="_empty" value="">{placeholderOption ?? '—'}</option>
        ) : (
          <option key={opt} value={opt}>{opt}</option>
        ),
      )}
    </select>
  );
}

function Combobox({
  value,
  onChange,
  options,
  placeholder,
  listId,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  listId: string;
}) {
  return (
    <div className="relative">
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-foreground">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}
