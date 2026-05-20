'use client';

import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/utils';

type Row = Record<string, string | number>;

export function ExportButton({
  filename,
  rows,
  label = 'Экспорт',
}: {
  filename: string;
  rows: Row[];
  label?: string;
}) {
  return (
    <button
      onClick={() => {
        downloadCsv(filename, rows);
      }}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-medium text-foreground shadow-card transition hover:border-primary hover:shadow-cardHover"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
