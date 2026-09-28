'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useAssistantStore } from '@/lib/stores/assistant.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { AssistantText } from './AssistantText';
import { ProposalCard } from './ProposalCard';

const SUGGESTION_KEYS = ['suggestionBankAccount', 'suggestionReconcile', 'suggestionProduct', 'suggestionInvite'] as const;

/**
 * Right-hand assistant drawer, mounted once in the dashboard layout and opened
 * from the command bar, a guide's action button or "Küsi assistendilt".
 */
export function AssistantPanel() {
  const t = useTranslations('assistant');
  const pathname = usePathname();
  const tenantId = useAuthStore((state) => state.tenant?.id ?? null);
  const { isOpen, items, isThinking, close, reset, ask, bindTenant } = useAssistantStore();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bindTenant(tenantId);
  }, [bindTenant, tenantId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [items.length, isThinking]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const submit = (text: string) => {
    if (!text.trim() || isThinking) return;
    setDraft('');
    void ask(text, pathname || undefined);
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[var(--a-border)] bg-[var(--a-bg)] shadow-2xl sm:w-[420px]"
      aria-label={t('title')}
    >
      <header className="flex items-center gap-2 border-b border-[var(--a-border)] bg-[var(--a-surface)] px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--a-accent-soft)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--a-accent)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[var(--a-text)]">{t('title')}</div>
          <div className="truncate text-[11.5px] text-[var(--a-text-3)]">{t('subtitle')}</div>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={reset}
            disabled={isThinking}
            title={t('newConversation')}
            className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={close}
          title={t('close')}
          className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13.5px] leading-6">
        {items.length === 0 && (
          <div className="space-y-3">
            <p className="text-[var(--a-text-2)]">{t('intro')}</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => submit(t(key))}
                  className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-left text-[13px] text-[var(--a-text-2)] hover:border-[var(--a-border-strong)] hover:text-[var(--a-text)]"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.map((item) => {
          switch (item.kind) {
            case 'user':
              return (
                <div key={item.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-[12px] rounded-br-sm bg-[var(--a-accent-soft)] px-3 py-2 text-[var(--a-text)]">
                    {item.text}
                  </div>
                </div>
              );
            case 'assistant':
              return (
                <div key={item.id} className="text-[var(--a-text-2)]">
                  <AssistantText text={item.text} />
                </div>
              );
            case 'error':
              return (
                <div key={item.id} className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[12.5px] text-[var(--a-neg)]">
                  {item.text}
                </div>
              );
            case 'proposal':
              return <ProposalCard key={item.id} item={item} />;
            default:
              return null;
          }
        })}

        {isThinking && (
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--a-text-3)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('thinking')}
          </div>
        )}
      </div>

      <form
        className="border-t border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit(draft);
              }
            }}
            rows={2}
            maxLength={4000}
            placeholder={t('placeholder')}
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3 py-2 text-[13.5px] text-[var(--a-text)] outline-none focus:border-[var(--a-accent)]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isThinking}
            title={t('send')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--a-accent)] text-[var(--a-accent-on)] disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--a-text-3)]">{t('disclaimer')}</p>
      </form>
    </aside>
  );
}
