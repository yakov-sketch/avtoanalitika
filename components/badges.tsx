import { cn } from '@/lib/utils';

type CompetitionLevel = 'Низкая' | 'Средняя' | 'Высокая';
type PotentialLevel = 'Высокий' | 'Средний' | 'Низкий';

export function CompetitionBadge({ value }: { value: CompetitionLevel }) {
  const styles: Record<CompetitionLevel, string> = {
    'Низкая': 'border-emerald-200 bg-emerald-50 text-emerald-700',
    'Средняя': 'border-amber-200 bg-amber-50 text-amber-700',
    'Высокая': 'border-red-200 bg-red-50 text-red-700',
  };
  return <span className={cn('badge-base font-mono', styles[value])}>{value}</span>;
}

export function ScoreBadge({ value, label }: { value: number; label?: string }) {
  const color =
    value >= 75
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : value >= 50
      ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
      : value >= 25
      ? 'border-slate-200 bg-slate-50 text-slate-700'
      : 'border-gray-200 bg-gray-50 text-gray-600';
  return (
    <span className={cn('badge-base font-mono', color)}>
      {label ? `${label}: ` : ''}
      {value}
    </span>
  );
}

export function PotentialBadge({ value }: { value: PotentialLevel }) {
  const styles: Record<PotentialLevel, string> = {
    'Высокий': 'border-emerald-200 bg-emerald-50 text-emerald-700',
    'Средний': 'border-amber-200 bg-amber-50 text-amber-700',
    'Низкий': 'border-gray-200 bg-gray-50 text-gray-600',
  };
  return <span className={cn('badge-base font-mono', styles[value])}>{value}</span>;
}
