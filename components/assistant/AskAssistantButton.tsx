'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { useAssistantStore } from '@/lib/stores/assistant.store';

/**
 * Opens the assistant. With `prompt` it also sends that as the user's message
 * (guide action buttons); without, it just opens the panel. Sits next to
 * <HelpLink /> in page headers and matches its look.
 */
export function AskAssistantButton({
  prompt,
  label,
  className = '',
}: {
  prompt?: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations('assistant');
  const pathname = usePathname();
  const open = useAssistantStore((state) => state.open);
  const ask = useAssistantStore((state) => state.ask);

  return (
    <button
      type="button"
      onClick={() => (prompt ? void ask(prompt, pathname || undefined) : open())}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium text-[var(--a-text-2)] transition-colors hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)] ${className}`}
      title={t('open')}
    >
      <Sparkles className="h-3.5 w-3.5 text-[var(--a-accent)]" />
      <span>{label ?? t('askShort')}</span>
    </button>
  );
}
