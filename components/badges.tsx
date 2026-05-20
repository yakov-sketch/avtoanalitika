import { cn } from '@/lib/utils';
import type { Score } from '@/lib/api';

type CompetitionLevel = 'Низкая' | 'Средняя' | 'Высокая';

const COLOR_CLASS: Record<string, string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  yellow: 'border-yellow-300 bg-yellow-50 text-yellow-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  gray: 'border-gray-200 bg-gray-50 text-gray-500',
};

export function CompetitionBadge({ value }: { value: CompetitionLevel }) {
  const styles: Record<CompetitionLevel, string> = {
    'Низкая': 'border-emerald-200 bg-emerald-50 text-emerald-700',
    'Средняя': 'border-amber-200 bg-amber-50 text-amber-700',
    'Высокая': 'border-red-200 bg-red-50 text-red-700',
  };
  return <span className={cn('badge-base font-mono', styles[value])}>{value}</span>;
}

/** Бейдж метрики: показывает словесную оценку (grade), красит по уровню. */
export function ScoreBadge({ score }: { score: Score }) {
  const cls = COLOR_CLASS[score.color] ?? COLOR_CLASS.gray;
  return (
    <span className={cn('badge-base', cls)} title={score.available ? `${score.value} / 100` : undefined}>
      {score.available ? score.grade : 'Нет данных'}
    </span>
  );
}

/** Бейдж типа возможности. */
export function OpportunityBadge({ titleKey, title }: { titleKey: string; title: string }) {
  const styles: Record<string, string> = {
    niche_deficit: 'border-yellow-300 bg-yellow-50 text-yellow-800',
    mass_liquid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    arbitrage: 'border-sky-200 bg-sky-50 text-sky-700',
    moderate: 'border-slate-200 bg-slate-50 text-slate-600',
    illiquid: 'border-amber-200 bg-amber-50 text-amber-800',
    oversaturated: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <span className={cn('badge-base', styles[titleKey] ?? styles.moderate)}>{title}</span>
  );
}
