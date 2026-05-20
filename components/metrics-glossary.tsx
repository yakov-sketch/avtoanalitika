import { api } from '@/lib/api';

export async function MetricsGlossary() {
  let glossary;
  try {
    glossary = await api.glossary();
  } catch {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-2">
      <div className="card p-6">
        <div className="font-heading text-2xl font-semibold">Метрики — что они значат</div>
        <p className="mt-1 text-sm text-muted">
          Каждая метрика — это оценка от 0 до 100, переведённая в слова: «Очень низкий»,
          «Низкий», «Средний», «Высокий», «Очень высокий». В карточке модели у каждой
          можно раскрыть «Как посчитано».
        </p>
        <div className="mt-4 space-y-3">
          {glossary.metrics.map((m) => (
            <div key={m.key} className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
              <div className="font-medium text-foreground">{m.title}</div>
              <div className="mt-0.5 text-sm text-muted">{m.full}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <div className="font-heading text-2xl font-semibold">Типы возможностей</div>
        <p className="mt-1 text-sm text-muted">
          «Редкое» — не цель сама по себе. Платформа определяет, к какому типу
          относится модель, и под каждый тип — своя логика заработка.
        </p>
        <div className="mt-4 space-y-3">
          {glossary.opportunityTypes.map((o) => (
            <div key={o.key} className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
              <div className="font-medium text-foreground">{o.title}</div>
              <div className="mt-0.5 text-sm text-muted">{o.description}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-border bg-slate-50 p-4 text-sm leading-6 text-muted">
          <strong className="text-foreground">Как читать баллы:</strong> 81–100 «Очень
          высокий», 61–80 «Высокий», 41–60 «Средний», 21–40 «Низкий», 0–20 «Очень низкий».
          Главный ориентир — «Привлекательность к завозу».
        </div>
      </div>
    </div>
  );
}
