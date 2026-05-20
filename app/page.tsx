import { Header } from '@/components/header';
import { SearchPanel } from '@/components/search-panel';
import { RegionsGridCollapsible } from '@/components/regions-grid';
import { AnalyticsSection } from '@/components/analytics-section';
import {
  DashboardTopBar,
  KpiGrid,
  PlatformsGrid,
} from '@/components/dashboard-parts';
import { MetricsGlossary } from '@/components/metrics-glossary';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [overview, regions, metadata, allGroups] = await Promise.all([
    api.overview(),
    api.regions(),
    api.metadata(),
    // Полный набор групп без premium-фильтра — клиент сам отфильтрует
    api.search({ premiumOnly: false, sort: 'attractiveness' }),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
          <DashboardTopBar totals={overview.totals} snapshotDate={overview.snapshotDate} />
          <div className="flex items-center gap-2 sm:gap-3">
            <SearchPanel
              brands={metadata.brands}
              districts={metadata.districts}
              platforms={metadata.platforms}
              bodyTypes={metadata.bodyTypes}
            />
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Общая статистика</h2>
          <KpiGrid totals={overview.totals} />
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Источники данных</h2>
          <PlatformsGrid platforms={overview.platforms} />
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Регионы</h2>
          <RegionsGridCollapsible regions={regions} />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold">Аналитика по группам</h2>
            <p className="mt-1 text-sm text-muted">
              {allGroups.total} групп всего. Меняй фильтры — обновляется мгновенно, без перезагрузки.
            </p>
          </div>
          <AnalyticsSection
            allCars={allGroups.items}
            brands={metadata.brands}
            districts={metadata.districts}
          />
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Что значат метрики и типы возможностей</h2>
          <MetricsGlossary />
        </section>
      </main>
    </div>
  );
}
