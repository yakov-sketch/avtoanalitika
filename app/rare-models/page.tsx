import { Sparkles } from 'lucide-react';
import { Header } from '@/components/header';
import { BackButton } from '@/components/back-button';
import { RareModelsBanner } from '@/components/dashboard-parts';
import { MetricsGlossary } from '@/components/metrics-glossary';
import { RareCarsTable } from '@/components/rare-cars-table';
import { api, type SearchFilters } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function RareModelsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const response = await api.search(filters);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-8 py-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Поиск по группам
              </div>
              <h1 className="mt-2 font-heading text-4xl font-semibold">Редкие модели</h1>
              <div className="mt-1 text-sm text-muted">Найдено групп: {response.total}</div>
            </div>
          </div>
        </div>

        <RareModelsBanner totalGroups={response.total} activeListings={response.items.reduce((s, g) => s + g.activeCount, 0)} />
        <RareCarsTable cars={response.items} pageSize={30} />
        <MetricsGlossary />
      </main>
    </div>
  );
}

function parseFilters(sp: Record<string, string | string[] | undefined>): SearchFilters {
  const pick = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined));
  const num = (k: string) => {
    const v = pick(k);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const bool = (k: string) => {
    const v = pick(k);
    return v === '1' || v === 'true';
  };
  return {
    platform: pick('platform'),
    brand: pick('brand'),
    model: pick('model'),
    bodyType: pick('bodyType'),
    region: pick('region'),
    district: pick('district'),
    section: pick('section') as SearchFilters['section'],
    priceFrom: num('priceFrom'),
    priceTo: num('priceTo'),
    yearFrom: num('yearFrom'),
    yearTo: num('yearTo'),
    listingsFrom: num('listingsFrom'),
    listingsTo: num('listingsTo'),
    rareOnly: bool('rareOnly') || undefined,
    // premium default = true; снимается явным premiumOnly=0
    // ИЛИ автоматически отключается если пользователь явно фильтрует по бренду,
    // чтобы выборка ?brand=Kia не была пустой.
    premiumOnly:
      pick('premiumOnly') === '0' ? false : pick('premiumOnly') === '1' ? true : !pick('brand'),
    sort: (pick('sort') as SearchFilters['sort']) ?? 'attractiveness',
  };
}
