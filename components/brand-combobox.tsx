'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export function BrandCombobox({
  value,
  onChange,
  options,
  placeholder = 'Все бренды',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const justAppliedRef = useRef(false);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  const apply = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
    justAppliedRef.current = true;
    inputRef.current?.blur();
    // Allow next focus to reopen
    setTimeout(() => { justAppliedRef.current = false; }, 200);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-sm transition focus-within:border-primary">
        <input
          ref={inputRef}
          value={query}
          onFocus={() => {
            if (justAppliedRef.current) return;
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply(query);
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          className="w-full flex-1 outline-none placeholder:text-slate-400"
        />
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              apply('');
            }}
            className="rounded p-0.5 text-muted hover:bg-slate-100 hover:text-foreground"
            aria-label="Очистить"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
          {filtered.map((o) => {
            const idx = o.toLowerCase().indexOf(query.trim().toLowerCase());
            const before = idx >= 0 ? o.slice(0, idx) : o;
            const match = idx >= 0 ? o.slice(idx, idx + query.trim().length) : '';
            const after = idx >= 0 ? o.slice(idx + query.trim().length) : '';
            return (
              <button
                key={o}
                type="button"
                onClick={() => apply(o)}
                className={`block w-full px-3 py-1.5 text-left text-sm transition hover:bg-slate-50 ${value === o ? 'bg-yellow-50 text-foreground' : ''}`}
              >
                {idx >= 0 ? (
                  <>
                    {before}
                    <span className="bg-yellow-200/70 font-medium">{match}</span>
                    {after}
                  </>
                ) : (
                  o
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
