'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter();
  const onClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };
  return (
    <button
      onClick={onClick}
      aria-label="Назад"
      className="rounded-full border border-border bg-white p-3 text-muted shadow-card transition hover:border-primary hover:text-primary"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
