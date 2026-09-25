'use client';

import { useTranslations } from 'next-intl';
import type { GuideBlock } from '@/lib/guides/types';
import { headingSlug } from '@/lib/guides/types';

type HeadingBlock = Extract<GuideBlock, { type: 'heading' }>;

const isHeading = (block: GuideBlock): block is HeadingBlock => block.type === 'heading';

export function GuideToc({ blocks }: { blocks: GuideBlock[] }) {
  const t = useTranslations('guides');
  const headings = blocks.filter(isHeading);

  if (headings.length < 2) return null;

  return (
    <nav className="rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] p-3" aria-label={t('contents')}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">{t('contents')}</div>
      <ul className="mt-2 space-y-1">
        {headings.map((heading) => (
          <li key={heading.text}>
            <a
              href={`#${headingSlug(heading.text)}`}
              className="block rounded-[6px] px-2 py-1 text-[12.5px] text-[var(--a-text-2)] transition-colors hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
