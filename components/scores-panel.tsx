import type { Score, ScoresBundle } from '@/lib/api';

const COLOR: Record<string, { text: string; bar: string }> = {
  green: { text: 'text-emerald-700', bar: 'bg-emerald-500' },
  yellow: { text: 'text-yellow-700', bar: 'bg-yellow-400' },
  slate: { text: 'text-slate-600', bar: 'bg-slate-400' },
  gray: { text: 'text-gray-400', bar: 'bg-gray-300' },
};

function MetricCard({ score }: { score: Score }) {
  const c = COLOR[score.color] ?? COLOR.gray;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">{score.name}</span>
        {!score.available && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] uppercase text-gray-400">
            скоро
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className={`font-heading text-lg font-semibold ${c.text}`}>
          {score.available ? score.grade : 'Нет данных'}
        </span>
        {score.available && <span className="font-mono text-xs text-muted">{score.value}</span>}
      </div>
      {score.available && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${c.bar}`} style={{ width: `${score.value}%` }} />
        </div>
      )}
      <p className="mt-2 text-xs leading-5 text-muted">{score.interpretation}</p>
      {score.available && (
        <details className="mt-1.5 group">
          <summary className="cursor-pointer text-[10px] font-medium uppercase tracking-wide text-muted hover:text-foreground">
            Как посчитано
          </summary>
          <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-slate-50/60 p-2.5 text-[11px]">
            <div className="font-mono text-foreground/70">{score.formula}</div>
            {score.components.map((comp) => (
              <div key={comp.label} className="flex items-start justify-between gap-2 text-foreground/80">
                <div>
                  <div className="font-medium">{comp.label}</div>
                  {comp.explain ? <div className="text-muted">{comp.explain}</div> : null}
                </div>
                <div className="shrink-0 font-mono">{comp.value > 0 ? `+${comp.value}` : comp.value}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function HeroCard({ score }: { score: Score }) {
  const c = COLOR[score.color] ?? COLOR.gray;
  return (
    <div className="card border-2 border-primary/15 p-5">
      <div className="text-xs uppercase tracking-wide text-muted">{score.name}</div>
      <div className="mt-1 flex items-baseline gap-3">
        <span className={`font-heading text-3xl font-semibold ${c.text}`}>{score.grade}</span>
        <span className="font-mono text-sm text-muted">{score.value} / 100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${c.bar}`} style={{ width: `${score.value}%` }} />
      </div>
      <p className="mt-2 text-sm leading-5 text-foreground/80">{score.interpretation}</p>
      <details className="mt-2 group">
        <summary className="cursor-pointer text-[10px] font-medium uppercase tracking-wide text-muted hover:text-foreground">
          Как посчитано
        </summary>
        <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-slate-50/60 p-2.5 text-[11px]">
          <div className="font-mono text-foreground/70">{score.formula}</div>
          {score.components.map((comp) => (
            <div key={comp.label} className="flex items-start justify-between gap-2 text-foreground/80">
              <div>
                <div className="font-medium">{comp.label}</div>
                {comp.explain ? <div className="text-muted">{comp.explain}</div> : null}
              </div>
              <div className="shrink-0 font-mono">{comp.value > 0 ? `+${comp.value}` : comp.value}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export function ScoresPanel({ scores }: { scores: ScoresBundle }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Тип возможности + итоговая привлекательность */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="card border-2 border-primary/15 p-5">
          <div className="text-xs uppercase tracking-wide text-muted">Тип возможности</div>
          <div className="mt-1 font-heading text-2xl font-semibold text-primary">
            {scores.opportunity.title}
          </div>
          <p className="mt-2 text-sm leading-5 text-foreground/80">
            {scores.opportunity.description}
          </p>
        </div>
        <HeroCard score={scores.attractiveness} />
      </div>

      {/* 9 метрик — компактная сетка */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <MetricCard score={scores.deficit} />
        <MetricCard score={scores.liquidity} />
        <MetricCard score={scores.demand} />
        <MetricCard score={scores.turnover} />
        <MetricCard score={scores.capacity} />
        <MetricCard score={scores.priceSpread} />
        <MetricCard score={scores.arbitrage} />
        <MetricCard score={scores.velocity} />
        <MetricCard score={scores.trend} />
      </div>
    </div>
  );
}
