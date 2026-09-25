'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { GuideBlock, GuideCallout } from '@/lib/guides/types';
import { headingSlug } from '@/lib/guides/types';

/**
 * Minimal inline formatting for guide text: `**bold**` and `[label](/href)`.
 * Deliberately not a markdown library — this is all the guides need and the
 * frontend keeps its dependency list small.
 */
const INLINE_PATTERN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export function renderInline(text: string): ReactNode {
  return text.split(INLINE_PATTERN).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[var(--a-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      return (
        <Link key={index} href={href} className="text-[var(--a-accent)] underline underline-offset-2">
          {label}
        </Link>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

const CALLOUT_STYLE: Record<GuideCallout, { border: string; bg: string; text: string; Icon: typeof Info }> = {
  info: { border: 'var(--a-border-strong)', bg: 'var(--a-surface-2)', text: 'var(--a-text-2)', Icon: Info },
  warning: { border: 'var(--a-warn)', bg: 'var(--a-warn-soft)', text: 'var(--a-warn)', Icon: AlertCircle },
  success: { border: 'var(--a-pos)', bg: 'var(--a-pos-soft)', text: 'var(--a-pos)', Icon: CheckCircle2 },
};

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2
          id={headingSlug(block.text)}
          className="mt-10 scroll-mt-6 border-t border-[var(--a-border)] pt-6 text-[17px] font-semibold text-[var(--a-text)] first:mt-0 first:border-0 first:pt-0"
        >
          {block.text}
        </h2>
      );

    case 'paragraph':
      return <p className="mt-3 text-[13.5px] leading-6 text-[var(--a-text-2)]">{renderInline(block.text)}</p>;

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`mt-3 space-y-1.5 pl-5 text-[13.5px] leading-6 text-[var(--a-text-2)] ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    }

    case 'steps':
      return (
        <ol className="mt-4 space-y-2.5">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] p-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--a-accent-soft)] text-[11px] font-semibold text-[var(--a-accent)]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-[var(--a-text)]">{renderInline(item.title)}</div>
                {item.text && <p className="mt-1 text-[13px] leading-6 text-[var(--a-text-2)]">{renderInline(item.text)}</p>}
              </div>
            </li>
          ))}
        </ol>
      );

    case 'callout': {
      const { border, bg, text, Icon } = CALLOUT_STYLE[block.tone];
      return (
        <div className="mt-4 flex gap-2.5 rounded-[10px] border p-3" style={{ borderColor: border, background: bg }}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: text }} />
          <div className="min-w-0">
            {block.title && <div className="text-[13px] font-semibold" style={{ color: text }}>{block.title}</div>}
            <p className="mt-0.5 text-[13px] leading-6 text-[var(--a-text-2)]">{renderInline(block.text)}</p>
          </div>
        </div>
      );
    }

    case 'table':
      return (
        <div className="mt-4 overflow-x-auto rounded-[10px] border border-[var(--a-border)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="bg-[var(--a-surface-2)]">
                {block.headers.map((header, index) => (
                  <th key={index} className="px-3 py-2 font-semibold text-[var(--a-text)]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-[var(--a-border)] bg-[var(--a-surface)] align-top">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 leading-6 text-[var(--a-text-2)]">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'image':
      return (
        <figure className="mt-4">
          {/* Plain <img>: guide screenshots are static assets served from /public and
              never need next/image's remote loader or layout shifting behaviour. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt}
            className="w-full rounded-[10px] border border-[var(--a-border)]"
            loading="lazy"
          />
          {block.caption && (
            <figcaption className="mt-1.5 text-[12px] text-[var(--a-text-3)]">{block.caption}</figcaption>
          )}
        </figure>
      );

    default:
      return null;
  }
}

export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
