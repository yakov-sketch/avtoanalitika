import Link from 'next/link';
import { Header } from '@/components/header';
import { BackButton } from '@/components/back-button';
import { ScoreBadge, OpportunityBadge } from '@/components/badges';
import { api, formatRubles, type CarGroup } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const idsRaw = searchParams.ids;
  const ids = (Array.isArray(idsRaw) ? idsRaw : idsRaw ? [idsRaw] : []).flatMap((v) => v.split(','));
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  const groups: CarGroup[] = [];
  for (const id of uniqueIds.slice(0, 4)) {
    try {
      groups.push(await api.group(id));
    } catch {
      // skip missing
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Сравнение</h1>
            <p className="mt-1 text-sm text-muted">
              {groups.length === 0
                ? 'Передай в URL ?ids=A,B,C (до 4 групп) — увидишь их рядом.'
                : `${groups.length} групп${groups.length === 1 ? 'а' : groups.length < 5 ? 'ы' : ''}`}
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="card p-6 text-sm text-muted">
            Пример: <code className="rounded bg-slate-100 px-1.5 py-0.5">/compare?ids=abc123,def456</code>
          </div>
        ) : (
          <CompareTable groups={groups} />
        )}
      </main>
    </div>
  );
}

function CompareTable({ groups }: { groups: CarGroup[] }) {
  type Row = { label: string; render: (g: CarGroup) => React.ReactNode };
  const rows: Row[] = [
    { label: 'Бренд', render: (g) => g.mark },
    { label: 'Модель', render: (g) => g.model },
    { label: 'Поколение', render: (g) => g.generation ?? '—' },
    { label: 'Конфигурация', render: (g) => g.configuration ?? '—' },
    { label: 'Премиум', render: (g) => (g.isPremium ? 'Да' : 'Нет') },
    { label: 'Активных', render: (g) => g.activeCount },
    { label: 'Снятых', render: (g) => g.removedCount },
    { label: 'Продавцов', render: (g) => g.sellersCount },
    { label: 'Регионов', render: (g) => g.regionsCount },
    { label: 'Цена min', render: (g) => formatRubles(g.minPrice) },
    { label: 'Цена средняя', render: (g) => formatRubles(g.avgPrice) },
    { label: 'Цена max', render: (g) => formatRubles(g.maxPrice) },
    { label: 'Тип возможности', render: (g) => (
        <OpportunityBadge titleKey={g.scores.opportunity.key} title={g.scores.opportunity.title} />
    ) },
    { label: 'Дефицит', render: (g) => <ScoreBadge score={g.scores.deficit} /> },
    { label: 'Ликвидность', render: (g) => <ScoreBadge score={g.scores.liquidity} /> },
    { label: 'Оборот', render: (g) => <ScoreBadge score={g.scores.turnover} /> },
    { label: 'Ценовой спред', render: (g) => <ScoreBadge score={g.scores.priceSpread} /> },
    { label: 'Арбитраж', render: (g) => <ScoreBadge score={g.scores.arbitrage} /> },
    { label: 'Спрос', render: (g) => <ScoreBadge score={g.scores.demand} /> },
    { label: 'Привлекательность', render: (g) => <ScoreBadge score={g.scores.attractiveness} /> },
    { label: 'Платформы', render: (g) => g.platforms.join(', ') },
    { label: 'Регионы', render: (g) => g.regionsPresent.slice(0, 5).join(', ') + (g.regionsPresent.length > 5 ? '…' : '') },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Параметр</th>
              {groups.map((g) => (
                <th key={g.id} className="px-4 py-3 font-medium text-foreground">
                  <Link href={`/model/${g.id}`} className="hover:text-primary">
                    {g.mark} {g.model}
                  </Link>
                  <div className="mt-0.5 text-xs font-normal text-muted truncate max-w-[180px]" title={[g.generation, g.configuration].filter(Boolean).join(' · ')}>
                    {[g.generation, g.configuration].filter(Boolean).join(' · ') || '—'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="px-4 py-3 text-muted">{row.label}</td>
                {groups.map((g) => (
                  <td key={g.id} className="px-4 py-3">{row.render(g)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
