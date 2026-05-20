'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { Listing } from '@/lib/api';

function formatM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

export function PriceHistogram({ listings }: { listings: Listing[] }) {
  const prices = listings
    .map((l) => l.priceRub)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  if (prices.length === 0) {
    return <p className="text-sm text-muted">Нет цен для гистограммы.</p>;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const buckets = 12;
  const step = Math.max((max - min) / buckets, 1);
  const data = Array.from({ length: buckets }, (_, i) => {
    const lo = min + step * i;
    const hi = i === buckets - 1 ? max + 1 : min + step * (i + 1);
    const count = prices.filter((p) => p >= lo && p < hi).length;
    return {
      range: `${formatM(lo)}–${formatM(hi)}`,
      lo,
      hi,
      count,
    };
  });

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
          <Tooltip
            formatter={(value: number) => [`${value} объявлений`, 'Количество']}
            labelFormatter={(label) => `Диапазон: ${label} ₽`}
          />
          <Bar dataKey="count" fill="#d4af37" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceVsYearChart({ listings }: { listings: Listing[] }) {
  const points = listings
    .filter((l) => typeof l.priceRub === 'number' && l.priceRub > 0 && typeof l.year === 'number' && l.year > 1990)
    .map((l) => ({
      year: l.year as number,
      price: (l.priceRub as number) / 1_000_000,
      status: l.status,
      mark: l.mark,
    }));

  if (points.length === 0) {
    return <p className="text-sm text-muted">Недостаточно данных для графика.</p>;
  }

  const active = points.filter((p) => p.status === 'active');
  const removed = points.filter((p) => p.status === 'removed');

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 15, right: 15, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#eef2f7" />
          <XAxis
            type="number"
            dataKey="year"
            name="Год"
            domain={['dataMin', 'dataMax']}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="number"
            dataKey="price"
            name="Цена, млн ₽"
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => `${v.toFixed(1)}M`}
          />
          <ZAxis range={[40, 41]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: number, name: string) => {
              if (name === 'Цена, млн ₽') return [`${value.toFixed(2)} млн ₽`, 'Цена'];
              return [value, name];
            }}
          />
          <Legend />
          <Scatter name="активные" data={active} fill="#2d3748" fillOpacity={0.75} />
          <Scatter name="снятые" data={removed} fill="#cbd5e1" fillOpacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
