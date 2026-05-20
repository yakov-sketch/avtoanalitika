'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Crown, Search, X } from 'lucide-react';
import { ScoreBadge } from '@/components/badges';
import { formatRubles, type CarGroup } from '@/lib/api';

type SortKey = 'mark' | 'activeCount' | 'removedCount' | 'sellersCount' | 'regionsCount' | 'avgPrice' | 'deficit' | 'liquidity' | 'prospect';

export function RareCarsTable({
  cars,
  initialSort = 'activeCount',
  initialDir = 'desc',
  showSearch = true,
  pageSize = 20,
}: {
  cars: CarGroup[];
  initialSort?: SortKey;
  initialDir?: 'asc' | 'desc';
  showSearch?: boolean;
  pageSize?: number;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialDir);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter((c) =>
      [c.mark, c.model, c.generation, c.configuration].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [cars, query]);

  const sorted = useMemo(() => {
    const key = sortKey;
    const dir = sortDir === 'asc' ? 1 : -1;
    const getVal = (c: CarGroup): number | string => {
      switch (key) {
        case 'mark': return `${c.mark} ${c.model}`;
        case 'activeCount': return c.activeCount;
        case 'removedCount': return c.removedCount;
        case 'sellersCount': return c.sellersCount;
        case 'regionsCount': return c.regionsCount;
        case 'avgPrice': return c.avgPrice ?? 0;
        case 'deficit': return c.scores.deficit.value;
        case 'liquidity': return c.scores.liquidity.value;
        case 'prospect': return c.scores.prospect.value;
      }
    };
    return filtered.slice().sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(k === 'mark' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <div className="font-heading text-2xl font-semibold">Детальная аналитика</div>
          <div className="mt-1 text-sm text-muted">
            {filtered.length} групп · клик по колонке — сортировка
          </div>
        </div>
        {showSearch && (
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Поиск по марке, модели..."
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-slate-100 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] text-sm">
          <thead className="bg-slate-50 text-left text-muted">
            <tr>
              <ThSort label="Бренд / Модель" k="mark" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <th className="px-5 py-3 font-medium">Поколение / Конфигурация</th>
              <ThSort label="Активные" k="activeCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
              <ThSort label="Снятые" k="removedCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
              <ThSort label="Продавцов" k="sellersCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
              <ThSort label="Регионов" k="regionsCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
              <ThSort label="Средняя цена" k="avgPrice" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
              <ThSort label="Дефицит" k="deficit" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <ThSort label="Ликвидность" k="liquidity" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <ThSort label="Перспективность" k="prospect" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((car) => (
              <tr key={car.id} className="border-t border-border transition hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <Link href={`/model/${car.id}`} className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary">
                    {car.isPremium ? (
                      <Crown className="h-3.5 w-3.5 text-accent" aria-label="премиум-бренд" />
                    ) : null}
                    <span>{car.mark} {car.model}</span>
                  </Link>
                </td>
                <td className="px-5 py-4 text-muted truncate max-w-[260px]" title={[car.generation, car.configuration].filter(Boolean).join(' · ')}>
                  {[car.generation, car.configuration].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-5 py-4 text-right font-mono">{car.activeCount}</td>
                <td className="px-5 py-4 text-right font-mono text-muted">{car.removedCount}</td>
                <td className="px-5 py-4 text-right">{car.sellersCount}</td>
                <td className="px-5 py-4 text-right">{car.regionsCount}</td>
                <td className="px-5 py-4 text-right font-mono">{formatRubles(car.avgPrice)}</td>
                <td className="px-5 py-4"><ScoreBadge value={car.scores.deficit.value} /></td>
                <td className="px-5 py-4"><ScoreBadge value={car.scores.liquidity.value} /></td>
                <td className="px-5 py-4"><ScoreBadge value={car.scores.prospect.value} /></td>
              </tr>
            ))}
            {pageRows.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-center text-muted" colSpan={10}>
                  Ничего не найдено.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-slate-50/60 px-5 py-3 text-sm">
          <span className="text-muted">
            Страница {safePage + 1} из {totalPages} · показано {pageRows.length} из {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Назад
            </button>
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThSort({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align = 'left',
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`px-5 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 transition hover:text-foreground ${active ? 'text-foreground' : ''}`}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}
