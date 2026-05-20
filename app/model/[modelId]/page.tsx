import { notFound } from 'next/navigation';
import { Header } from '@/components/header';
import { BackButton } from '@/components/back-button';
import { RegionCards } from '@/components/dashboard-parts';
import { ModelDetail } from '@/components/model-detail';
import { PipelineButton } from '@/components/pipeline-button';
import { api, formatRubles } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ModelDetailsPage({ params }: { params: { modelId: string } }) {
  let group, listings, regions;
  try {
    [group, listings, regions] = await Promise.all([
      api.group(params.modelId),
      api.groupListings(params.modelId, 200),
      api.regions(),
    ]);
  } catch {
    notFound();
  }

  const knownRegions = new Set(regions.map((r) => r.id));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="flex items-start gap-4">
            <BackButton />
            <div>
              <div className="text-sm text-muted">
                Группа {[group.generation, group.configuration].filter(Boolean).join(' · ') || '—'}
              </div>
              <h1 className="mt-1 font-heading text-4xl font-semibold">{group.mark} {group.model}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {group.platforms.map((p) => (
                  <span key={p} className="rounded-full border border-border bg-slate-50 px-2 py-1 text-muted">
                    {p}
                  </span>
                ))}
                <PipelineButton entityType="group" entityId={group.id} label={`${group.mark} ${group.model}`} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-start gap-3 lg:w-auto">
            <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-card">
              <div className="text-xs uppercase tracking-wide text-muted">Активных всего</div>
              <div className="mt-1 font-mono text-xl font-semibold">{group.activeCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-card">
              <div className="text-xs uppercase tracking-wide text-muted">Снятых всего</div>
              <div className="mt-1 font-mono text-xl font-semibold text-muted">{group.removedCount}</div>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-card">
              <div className="text-xs uppercase tracking-wide text-muted">Средняя цена группы</div>
              <div className="mt-1 font-mono text-xl font-semibold text-accent">{formatRubles(group.avgPrice)}</div>
            </div>
          </div>
        </div>

        <ModelDetail group={group} listings={listings} />

        <RegionCards
          present={group.regionsPresent.slice(0, 30)}
          missing={group.districtsMissing}
          knownRegions={knownRegions}
        />
      </main>
    </div>
  );
}
