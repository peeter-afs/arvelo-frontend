'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { GuideBody } from '@/components/guides/GuideBody';
import { GuideToc } from '@/components/guides/GuideToc';
import { getGuide } from '@/lib/guides/registry';
import type { Locale } from '@/i18n/config';

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-');
  return day && month && year ? `${day}.${month}.${year}` : iso;
}

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations('guides');
  const locale = useLocale() as Locale;
  const { guide, isFallback } = getGuide(locale, slug);

  const backLink = (
    <Link
      href="/help"
      className="inline-flex items-center gap-1.5 text-[13px] text-[var(--a-text-2)] transition-colors hover:text-[var(--a-text)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {t('backToGuides')}
    </Link>
  );

  if (!guide) {
    return (
      <div className="mx-auto w-full max-w-3xl py-6">
        {backLink}
        <div className="mt-4 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] p-6">
          <h1 className="text-[17px] font-semibold text-[var(--a-text)]">{t('notFoundTitle')}</h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--a-text-2)]">{t('notFoundMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      {backLink}

      <h1 className="mt-3 text-[22px] font-semibold text-[var(--a-text)]">{guide.title}</h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-[var(--a-text-3)]">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {t('minutes', { count: guide.minutes })}
        </span>
        <span>{t('updatedAt', { date: formatDate(guide.updatedAt) })}</span>
      </div>

      {isFallback && (
        <div className="mt-4 rounded-[10px] border border-[var(--a-border-strong)] bg-[var(--a-surface-2)] px-3 py-2 text-[12.5px] text-[var(--a-text-2)]">
          {t('fallbackNotice')}
        </div>
      )}

      <div className="mt-5 gap-6 lg:flex lg:items-start">
        <div className="order-2 min-w-0 flex-1">
          <GuideBody blocks={guide.blocks} />
        </div>
        <aside className="order-1 mb-5 lg:sticky lg:top-4 lg:mb-0 lg:w-60 lg:shrink-0">
          <GuideToc blocks={guide.blocks} />
        </aside>
      </div>
    </div>
  );
}
