'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, Flame, X } from 'lucide-react';
import { api, type PipelineStatus } from '@/lib/api';

const STATUSES: { value: PipelineStatus; label: string; icon: typeof Eye; color: string }[] = [
  { value: 'watch', label: 'В наблюдении', icon: Eye, color: 'border-sky-300 bg-sky-50 text-sky-700' },
  { value: 'in_progress', label: 'В работе', icon: Flame, color: 'border-yellow-400 bg-yellow-50 text-yellow-800' },
  { value: 'bought', label: 'Куплено', icon: Check, color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'rejected', label: 'Не подходит', icon: X, color: 'border-slate-300 bg-slate-50 text-slate-600' },
];

export function PipelineButton({
  entityType,
  entityId,
  entityUrl,
  label,
  size = 'md',
}: {
  entityType: 'group' | 'listing';
  entityId: string;
  entityUrl?: string | null;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await api.pipelineList();
        if (cancelled) return;
        const found = all.find((p) => p.entityType === entityType && p.entityId === entityId);
        setStatus(found?.status ?? null);
      } catch (e) {
        if (!cancelled) setError('Не удалось загрузить статус');
      }
    })();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  const apply = async (newStatus: PipelineStatus | null) => {
    setLoading(true);
    setError(null);
    try {
      if (newStatus === null) {
        await api.pipelineDelete(entityType, entityId);
      } else {
        await api.pipelineUpsert({ entityType, entityId, entityUrl, status: newStatus, label });
      }
      setStatus(newStatus);
    } catch (e) {
      setError('Ошибка сохранения');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const current = STATUSES.find((s) => s.value === status);
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition ${sizeClass} ${
          current ? current.color : 'border-border bg-white text-muted hover:border-primary hover:text-foreground'
        } disabled:opacity-50`}
        title={error ?? undefined}
      >
        {current ? (
          <>
            <current.icon className="h-3.5 w-3.5" />
            {current.label}
          </>
        ) : (
          <>+ В избранное</>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                apply(s.value);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                status === s.value ? 'bg-yellow-50' : ''
              }`}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
          {status !== null && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                apply(null);
              }}
              className="block w-full border-t border-border px-3 py-2 text-left text-xs text-muted hover:bg-slate-50"
            >
              Снять статус
            </button>
          )}
        </div>
      )}
    </div>
  );
}
