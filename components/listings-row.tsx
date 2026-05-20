'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { PipelineButton } from '@/components/pipeline-button';
import { formatRubles, formatInt, type Listing } from '@/lib/api';

function parseOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
  } catch {
    // fallthrough
  }
  return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
}

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((x) => (typeof x === 'string' ? x : x?.url))
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .map((u) => (u.startsWith('//') ? `https:${u}` : u));
    }
  } catch {
    // ignore
  }
  return [];
}

export function ListingsTable({ listings }: { listings: Listing[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] text-sm">
        <thead className="bg-slate-50 text-left text-muted">
          <tr>
            <th className="w-8 px-3 py-3" />
            <th className="px-5 py-3 font-medium">Статус</th>
            <th className="px-5 py-3 font-medium">Платформа</th>
            <th className="px-5 py-3 font-medium">Год</th>
            <th className="px-5 py-3 font-medium">Регион</th>
            <th className="px-5 py-3 font-medium">Комплектация</th>
            <th className="px-5 py-3 text-right font-medium">Пробег</th>
            <th className="px-5 py-3 text-right font-medium">Цена</th>
            <th className="px-5 py-3 font-medium">Продавец</th>
            <th className="px-5 py-3 font-medium">Ссылка</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <ListingRow key={l.id} listing={l} />
          ))}
          {listings.length === 0 ? (
            <tr>
              <td className="px-5 py-8 text-center text-muted" colSpan={10}>
                Объявлений в группе не найдено.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  const options = parseOptions(listing.options);
  const images = parseImages(listing.imageUrls);
  return (
    <>
      <tr className="border-t border-border hover:bg-slate-50/80">
        <td className="px-3 py-3 align-top">
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded p-1 text-muted transition hover:bg-slate-100 hover:text-foreground"
            aria-label={open ? 'Свернуть' : 'Развернуть'}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-5 py-3">
          <span className={`badge-base ${listing.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            {listing.status === 'active' ? 'активно' : 'снято'}
          </span>
        </td>
        <td className="px-5 py-3">{listing.platform}</td>
        <td className="px-5 py-3">{listing.year ?? '—'}</td>
        <td className="px-5 py-3 text-muted">{listing.region ?? '—'}</td>
        <td className="px-5 py-3 text-muted truncate max-w-[220px]" title={listing.complectation ?? ''}>
          {listing.complectation ?? '—'}
        </td>
        <td className="px-5 py-3 text-right font-mono">{listing.kmAge ? `${formatInt(listing.kmAge)} км` : '—'}</td>
        <td className="px-5 py-3 text-right font-mono">{formatRubles(listing.priceRub)}</td>
        <td className="px-5 py-3 text-muted truncate max-w-[180px]" title={listing.seller ?? ''}>{listing.seller ?? '—'}</td>
        <td className="px-5 py-3">
          {listing.url ? (
            <a href={listing.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              открыть <ExternalLink className="h-3 w-3" />
            </a>
          ) : '—'}
        </td>
      </tr>
      {open && (
        <tr className="border-t border-border bg-slate-50/60">
          <td />
          <td colSpan={9} className="px-5 py-4">
            <div className="grid grid-cols-[240px_1fr_1fr] gap-6">
              <div>
                {images.length > 0 ? (
                  <a href={images[0]} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={images[0]}
                      alt="фото объявления"
                      className="h-44 w-full rounded-lg border border-border object-cover"
                    />
                    <div className="mt-2 flex items-center justify-between text-xs text-muted">
                      <span>{images.length} фото</span>
                      <span className="text-primary">открыть оригинал ↗</span>
                    </div>
                  </a>
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-border text-muted">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                  </div>
                )}
              </div>

              <div>
                <SectionTitle>Авто</SectionTitle>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <KV label="VIN" value={listing.vin} mono />
                  <KV label="ПТС" value={listing.pts} />
                  <KV label="Таможня" value={listing.custom} />
                  <KV label="Не битый" value={listing.stateNotBeaten} />
                  <KV label="ДТП" value={listing.noAccidents} />
                  <KV label="Владельцев" value={listing.ownersCount?.toString() ?? null} />
                  <KV label="Кузов" value={listing.bodyType} />
                  <KV label="Цвет" value={listing.color} />
                  <KV
                    label="Двигатель"
                    value={[
                      listing.engineType,
                      listing.displacement ? `${listing.displacement} л` : null,
                      listing.horsePower ? `${listing.horsePower} л.с.` : null,
                    ].filter(Boolean).join(', ')}
                  />
                  <KV label="Трансмиссия" value={listing.transmission} />
                  <KV label="Привод" value={listing.driveType} />
                  <KV label="Руль" value={listing.wheel} />
                  <KV label="Состояние" value={listing.condition} />
                  <KV label="Тип авто" value={listing.section === 'NEW' ? 'Новая' : listing.section === 'USED' ? 'Б/У' : listing.section} />
                  <KV label="Доступность" value={listing.inStock} />
                  {(listing.priceUsd || listing.priceEur) && (
                    <KV
                      label="В валюте"
                      value={[
                        listing.priceUsd ? `$${formatInt(listing.priceUsd)}` : null,
                        listing.priceEur ? `€${formatInt(listing.priceEur)}` : null,
                      ].filter(Boolean).join(' · ')}
                      mono
                    />
                  )}
                </div>

                <div className="mt-4">
                  <PipelineButton
                    entityType="listing"
                    entityId={listing.innerId}
                    entityUrl={listing.url}
                    label={`${listing.mark ?? ''} ${listing.model ?? ''} · ${listing.year ?? ''}`}
                    size="sm"
                  />
                </div>

                <SectionTitle className="mt-5">Продавец и место</SectionTitle>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <KV label="Тип" value={listing.sellerType} />
                  <KV label="Имя" value={listing.seller} />
                  <KV label="Город" value={listing.city} />
                  <KV label="Адрес" value={listing.address} />
                  <KV
                    label="Профиль"
                    value={listing.sellerUrl ? 'открыть' : null}
                    link={listing.sellerUrl ?? undefined}
                  />
                  <KV label="Обновлено" value={listing.offerUpdatedAt} />
                </div>

                {listing.description && (
                  <>
                    <SectionTitle className="mt-5">Описание</SectionTitle>
                    <p className="text-sm leading-6 text-foreground/80 whitespace-pre-wrap">
                      {listing.description.slice(0, 800)}
                      {listing.description.length > 800 ? '…' : ''}
                    </p>
                  </>
                )}
              </div>

              <div>
                <SectionTitle>Опции ({options.length})</SectionTitle>
                {options.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {options.slice(0, 80).map((opt) => (
                      <span key={opt} className="rounded-full border border-border bg-white px-2 py-1 text-xs text-foreground/80">
                        {opt}
                      </span>
                    ))}
                    {options.length > 80 ? <span className="text-xs text-muted">+{options.length - 80}</span> : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Не указаны.</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-2 text-xs font-medium uppercase tracking-wide text-muted ${className}`}>{children}</div>
  );
}

function KV({
  label,
  value,
  mono = false,
  link,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  link?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1">
      <span className="text-xs text-muted">{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
          {value || '—'}
        </a>
      ) : (
        <span className={`${mono ? 'font-mono' : ''} text-xs text-foreground text-right truncate max-w-[60%]`} title={value ?? ''}>
          {value || '—'}
        </span>
      )}
    </div>
  );
}
