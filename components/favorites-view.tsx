'use client';

import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';
import { downloadCsv } from '@/lib/utils';
import type { PipelineItem } from '@/lib/api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  watch: { label: 'В наблюдении', color: 'border-sky-300 bg-sky-50 text-sky-700' },
  in_progress: { label: 'В работе', color: 'border-yellow-400 bg-yellow-50 text-yellow-800' },
  bought: { label: 'Куплено', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Не подходит', color: 'border-slate-300 bg-slate-50 text-slate-600' },
};

const STATUS_RU: Record<string, string> = {
  watch: 'В наблюдении',
  in_progress: 'В работе',
  bought: 'Куплено',
  rejected: 'Не подходит',
};

export function FavoritesView({ items }: { items: PipelineItem[] }) {
  const grouped: Record<string, PipelineItem[]> = { watch: [], in_progress: [], bought: [], rejected: [] };
  for (const it of items) grouped[it.status]?.push(it);

  // Уникальные марки в строчку (как просил Yakov)
  const uniqueMarks = Array.from(
    new Set(
      items
        .map((it) => (it.label ?? '').split(' ')[0])
        .filter((m) => m && m !== ''),
    ),
  );

  const handleExport = () => {
    if (items.length === 0) return;
    const rows = items.map((it) => ({
      Тип: it.entityType === 'group' ? 'Группа моделей' : 'Объявление',
      Название: it.label ?? '',
      Статус: STATUS_RU[it.status] ?? it.status,
      Заметка: it.note ?? '',
      Ссылка: it.entityType === 'group'
        ? `http://localhost:3000/model/${it.entityId}`
        : (it.entityUrl ?? ''),
      'ID объекта': it.entityId,
      Добавлено: new Date(it.createdAt).toLocaleString('ru-RU'),
      Обновлено: new Date(it.updatedAt).toLocaleString('ru-RU'),
    }));
    // Первая строка: марки в строчку для удобного просмотра в Excel
    if (uniqueMarks.length > 0) {
      rows.unshift({
        Тип: 'СВОДКА',
        Название: `Избранные марки: ${uniqueMarks.join(', ')}`,
        Статус: '',
        Заметка: '',
        Ссылка: '',
        'ID объекта': '',
        Добавлено: '',
        Обновлено: '',
      });
    }
    downloadCsv(`rovena-favorites-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-muted">
        Здесь будут машины, которые ты пометил «в наблюдении», «в работе» или «куплено».
        На карточке любой группы или в раскрытом объявлении есть кнопка «+ В избранное».
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {uniqueMarks.length > 0 && (
          <div className="text-sm text-muted">
            Марки в избранном:{' '}
            <span className="font-mono text-foreground">{uniqueMarks.join(', ')}</span>
          </div>
        )}
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-medium text-foreground shadow-card transition hover:border-primary hover:shadow-cardHover"
        >
          <Download className="h-4 w-4" />
          Скачать Excel (CSV)
        </button>
      </div>

      {(['in_progress', 'watch', 'bought', 'rejected'] as const).map((status) => {
        const list = grouped[status];
        if (!list || list.length === 0) return null;
        const meta = STATUS_LABELS[status];
        return (
          <section key={status} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`badge-base ${meta.color}`}>{meta.label}</span>
              <span className="text-sm text-muted">{list.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((it) => {
                const isGroup = it.entityType === 'group';
                const href = isGroup ? `/model/${it.entityId}` : it.entityUrl;
                return (
                  <div key={it.id} className="card p-4">
                    <div className="text-xs uppercase tracking-wide text-muted">
                      {isGroup ? 'Группа моделей' : 'Объявление на площадке'}
                    </div>
                    <div className="mt-2 font-medium">{it.label ?? it.entityId}</div>
                    {it.note ? <div className="mt-2 text-sm text-muted">{it.note}</div> : null}
                    <div className="mt-3 flex items-center justify-between text-xs text-muted">
                      <span>обновлено {new Date(it.updatedAt).toLocaleDateString('ru-RU')}</span>
                      {href ? (
                        isGroup ? (
                          <Link href={href} className="inline-flex items-center gap-1 text-primary hover:underline">
                            открыть карточку →
                          </Link>
                        ) : (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            открыть на площадке <ExternalLink className="h-3 w-3" />
                          </a>
                        )
                      ) : (
                        <span className="text-slate-400">нет ссылки</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
