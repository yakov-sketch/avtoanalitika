import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/header';
import { BackButton } from '@/components/back-button';
import { api, formatInt, formatRubles } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function PlatformPage({ params }: { params: { platformId: string } }) {
  const id = decodeURIComponent(params.platformId);
  let platform;
  try {
    platform = await api.platform(id);
  } catch {
    notFound();
  }

  const totalRegions = platform.regions.reduce((s, r) => s + r.value, 0) || 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <div className="text-sm text-muted">Аналитика платформы</div>
              <h1 className="mt-1 font-heading text-4xl font-semibold">{platform.id}</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <KpiLink
            label="Всего активных"
            value={formatInt(platform.totalListings)}
            href={`/rare-models?platform=${encodeURIComponent(platform.id)}&premiumOnly=0`}
          />
          <KpiLink
            label="Новые авто"
            value={formatInt(platform.newCars)}
            href={`/rare-models?platform=${encodeURIComponent(platform.id)}&premiumOnly=0&section=NEW`}
          />
          <KpiLink
            label="Авто до 1 года"
            value={formatInt(platform.underOneYear)}
            href={`/rare-models?platform=${encodeURIComponent(platform.id)}&premiumOnly=0&yearFrom=2025`}
          />
          <KpiLink
            label="Редких групп"
            value={formatInt(platform.rareModels)}
            accent
            href={`/rare-models?platform=${encodeURIComponent(platform.id)}&rareOnly=1&premiumOnly=0`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="card p-6">
            <h2 className="font-heading text-2xl font-semibold">Распределение по федеральным округам</h2>
            <p className="mt-1 text-sm text-muted">Клик по округу — увидеть все группы платформы в нём.</p>
            <div className="mt-4 space-y-2">
              {platform.regions.length === 0 ? (
                <p className="text-sm text-muted">Нет данных по регионам.</p>
              ) : (
                platform.regions.map((r) => (
                  <Link
                    key={r.name}
                    href={`/rare-models?platform=${encodeURIComponent(platform.id)}&district=${encodeURIComponent(r.name)}&premiumOnly=0`}
                    className="block rounded-xl border border-border bg-white p-3 transition hover:border-primary"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="font-mono text-muted">{r.value.toFixed(1)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-primary" style={{ width: `${(r.value / totalRegions) * 100}%` }} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-heading text-2xl font-semibold">Топ брендов</h2>
            <p className="mt-1 text-sm text-muted">Клик — все группы этого бренда на платформе.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {platform.topBrands.map((brand) => (
                <Link
                  key={brand}
                  href={`/rare-models?brand=${encodeURIComponent(brand)}&platform=${encodeURIComponent(platform.id)}`}
                  className="rounded-full border border-border bg-slate-50 px-3 py-2 font-mono text-sm text-foreground transition hover:border-yellow-300 hover:bg-yellow-50"
                >
                  {brand}
                </Link>
              ))}
            </div>
            <div className="my-6 border-t border-border" />
            <p className="text-[15px] leading-7 text-muted">{platform.commentary}</p>
            <div className="mt-6 rounded-xl border border-border bg-slate-50 p-4">
              <div className="text-sm text-muted">Средняя цена</div>
              <div className="mt-2 font-mono text-2xl font-semibold">{formatRubles(platform.avgPrice)}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiLink({ label, value, href, accent = false }: { label: string; value: string; href: string; accent?: boolean }) {
  return (
    <Link href={href} className="card group p-5 transition hover:border-primary/30">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-3 font-mono text-3xl font-semibold group-hover:text-primary ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</div>
      <div className="mt-2 text-xs text-muted opacity-0 transition group-hover:opacity-100">открыть список →</div>
    </Link>
  );
}
