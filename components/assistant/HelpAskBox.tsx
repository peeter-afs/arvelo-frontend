'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Send, Sparkles } from 'lucide-react';
import { useAssistantStore } from '@/lib/stores/assistant.store';

/** Question box on the guides index: asks the assistant, which answers from the guides. */
export function HelpAskBox() {
  const t = useTranslations('assistant');
  const pathname = usePathname();
  const ask = useAssistantStore((state) => state.ask);
  const isThinking = useAssistantStore((state) => state.isThinking);
  const [question, setQuestion] = useState('');

  return (
    <form
      className="mt-5 rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!question.trim() || isThinking) return;
        void ask(question, pathname || undefined);
        setQuestion('');
      }}
    >
      <label htmlFor="help-ask" className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--a-text)]">
        <Sparkles className="h-3.5 w-3.5 text-[var(--a-accent)]" />
        {t('helpAskTitle')}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="help-ask"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={4000}
          placeholder={t('helpAskPlaceholder')}
          className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3 text-[13.5px] text-[var(--a-text)] outline-none focus:border-[var(--a-accent)]"
        />
        <button
          type="submit"
          disabled={!question.trim() || isThinking}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--a-accent)] px-3.5 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          {t('send')}
        </button>
      </div>
    </form>
  );
}
