'use client';

import { useLocale, useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';
import { GuideCard } from '@/components/guides/GuideCard';
import { listGuides } from '@/lib/guides/registry';
import { GUIDE_CATEGORY_ORDER } from '@/lib/guides/types';
import type { Locale } from '@/i18n/config';

export default function GuidesIndexPage() {
  const t = useTranslations('guides');
  const locale = useLocale() as Locale;
  const { guides, isFallback } = listGuides(locale);

  return (
    <div className="mx-auto w-full max-w-4xl py-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--a-accent-soft)]">
          <BookOpen className="h-4.5 w-4.5 text-[var(--a-accent)]" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('title')}</h1>
          <p className="mt-1 text-[13.5px] leading-6 text-[var(--a-text-2)]">{t('subtitle')}</p>
        </div>
      </div>

      {isFallback && (
        <div className="mt-4 rounded-[10px] border border-[var(--a-border-strong)] bg-[var(--a-surface-2)] px-3 py-2 text-[12.5px] text-[var(--a-text-2)]">
          {t('fallbackNotice')}
        </div>
      )}

      {GUIDE_CATEGORY_ORDER.map((category) => {
        const inCategory = guides.filter((guide) => guide.category === category);
        if (inCategory.length === 0) return null;

        return (
          <section key={category} className="mt-7">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">
              {t(`category.${category}`)}
            </h2>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              {inCategory.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </section>
        );
      })}

      {guides.length === 0 && (
        <p className="mt-6 text-[13.5px] text-[var(--a-text-3)]">{t('empty')}</p>
      )}
    </div>
  );
}
