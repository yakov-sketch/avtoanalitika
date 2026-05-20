import { Header } from '@/components/header';
import { BackButton } from '@/components/back-button';
import { FavoritesView } from '@/components/favorites-view';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const items = await api.pipelineList();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Избранное</h1>
              <p className="mt-1 text-sm text-muted">
                Машины и группы, которые ты пометил статусом. Всего: {items.length}.
              </p>
            </div>
          </div>
        </div>

        <FavoritesView items={items} />
      </main>
    </div>
  );
}
