import type { Score, ScoresBundle } from '@/lib/api';

function colorByValue(v: number): string {
  if (v >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (v >= 50) return 'text-yellow-700 bg-yellow-50 border-yellow-300';
  if (v >= 25) return 'text-slate-700 bg-slate-50 border-slate-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
}

export function ScoreCard({ score }: { score: Score }) {
  const color = colorByValue(score.value);
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted">{score.name}</div>
          <div className={`mt-2 inline-flex items-baseline gap-1 rounded-lg border px-3 py-1 font-mono ${color}`}>
            <span className="text-3xl font-semibold">{score.value}</span>
            <span className="text-sm opacity-70">/ 100</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground/80">{score.interpretation}</p>
      <details className="mt-4 group">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted hover:text-foreground">
          Как посчитано
        </summary>
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-slate-50/60 p-3 text-xs">
          <div className="font-mono text-foreground/80">{score.formula}</div>
          <div className="mt-2 space-y-1.5">
            {score.components.map((c) => (
              <div key={c.label} className="flex items-start justify-between gap-3 text-foreground/80">
                <div>
                  <div className="font-medium">{c.label}</div>
                  {c.explain ? <div className="text-muted">{c.explain}</div> : null}
                </div>
                <div className="shrink-0 font-mono text-foreground">{c.value > 0 ? `+${c.value}` : c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

export function ScoresPanel({ scores }: { scores: ScoresBundle }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <ScoreCard score={scores.deficit} />
      <ScoreCard score={scores.liquidity} />
      <ScoreCard score={scores.demand} />
      <ScoreCard score={scores.prospect} />
    </div>
  );
}
