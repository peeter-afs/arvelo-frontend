'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Contextual entry point into a guide. Drop it into any page header:
 *   <HelpLink slug="algsaldode-import" />
 */
export function HelpLink({ slug, className = '' }: { slug: string; className?: string }) {
  const t = useTranslations('guides');

  return (
    <Link
      href={`/help/${slug}`}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium text-[var(--a-text-2)] transition-colors hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)] ${className}`}
      title={t('openGuide')}
    >
      <BookOpen className="h-3.5 w-3.5" />
      <span>{t('guideShort')}</span>
    </Link>
  );
}
