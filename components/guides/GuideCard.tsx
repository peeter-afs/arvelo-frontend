'use client';

import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Guide } from '@/lib/guides/types';

export function GuideCard({ guide }: { guide: Guide }) {
  const t = useTranslations('guides');

  return (
    <Link
      href={`/help/${guide.slug}`}
      className="group flex flex-col rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4 transition hover:border-[var(--a-accent)]"
    >
      <div className="text-[14px] font-semibold text-[var(--a-text)]">{guide.title}</div>
      <p className="mt-1.5 flex-1 text-[13px] leading-6 text-[var(--a-text-2)]">{guide.summary}</p>
      <div className="mt-3 flex items-center gap-3 text-[12px] text-[var(--a-text-3)]">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {t('minutes', { count: guide.minutes })}
        </span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1 text-[var(--a-accent)]">
          {t('readGuide')}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
