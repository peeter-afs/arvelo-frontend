'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileUp, Landmark, ListChecks, Loader2, Scale, Sparkles } from 'lucide-react';
import { HelpLink } from '@/components/guides/HelpLink';
import { AskAssistantButton } from '@/components/assistant/AskAssistantButton';
import { BankTabBar, type BankTab } from './BankTabBar';
import { BankInlineSummary, type BankInlineSummaryData } from './shared';
import { ImportTab } from './ImportTab';
import { ReviewTab } from './ReviewTab';
import { ReconcileTab } from './ReconcileTab';
import { ReconstructTab } from './ReconstructTab';
import { accountingApi } from '@/lib/api/accounting.api';
import type { BankImportPostCommitState } from '@/lib/api/banking.api';

const TABS: BankTab[] = ['import', 'review', 'reconcile', 'reconstruct'];

function parseTab(value: string | null): BankTab {
  return value && (TABS as string[]).includes(value) ? (value as BankTab) : 'import';
}

export function BankWorkspace() {
  const t = useTranslations('accounting');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = parseTab(searchParams.get('tab'));
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [reviewReloadKey, setReviewReloadKey] = useState(0);
  const [postCommitRunning, setPostCommitRunning] = useState(false);
  const [importReviewCount, setImportReviewCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reconcileCount, setReconcileCount] = useState(0);
  const [summaries, setSummaries] = useState<Partial<Record<BankTab, BankInlineSummaryData>>>({});
  // Drafts the commit auto-created, handed to the review tab so it can report
  // them and offer an undo. The import tab is hidden by then.
  const [autoDraftTxIds, setAutoDraftTxIds] = useState<string[]>([]);
  const [reviewInitialPhase, setReviewInitialPhase] = useState<'auto' | 'rest'>('rest');
  // The reconstruction tab (AI-assisted posting of a whole year) is for companies
  // that chose startup bookkeeping; others never see it.
  const [showReconstruct, setShowReconstruct] = useState(false);
  const [reconstructCount, setReconstructCount] = useState(0);

  useEffect(() => {
    accountingApi
      .getAccountingSettings()
      .then((settings) => setShowReconstruct(settings?.opening_balances_strategy === 'startup'))
      .catch(() => setShowReconstruct(false));
  }, []);

  const changeTab = useCallback(
    (tab: BankTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // After an import commit, move the user to the review queue and force a refetch.
  const handleCommitted = useCallback((draftTxIds: string[] = []) => {
    setAutoDraftTxIds(draftTxIds);
    setReviewInitialPhase('auto');
    setReviewRefreshKey((key) => key + 1);
    changeTab('review');
  }, [changeTab]);

  // The import's background follow-ups finished: hand over the drafts and
  // refetch the queue (renamed counterparties, drafted rows) without kicking
  // the user out of whatever review phase they are in.
  const handlePostCommitChange = useCallback((state: BankImportPostCommitState, draftTxIds: string[] = []) => {
    setPostCommitRunning(state === 'running');
    if (state === 'running') return;
    if (draftTxIds.length > 0) setAutoDraftTxIds(draftTxIds);
    setReviewReloadKey((key) => key + 1);
  }, []);

  const updateSummary = useCallback((tab: BankTab, summary: BankInlineSummaryData) => {
    setSummaries((current) => ({ ...current, [tab]: summary }));
  }, []);
  const updateImportSummary = useCallback((summary: BankInlineSummaryData) => updateSummary('import', summary), [updateSummary]);
  const updateReviewSummary = useCallback((summary: BankInlineSummaryData) => updateSummary('review', summary), [updateSummary]);
  const updateReconcileSummary = useCallback((summary: BankInlineSummaryData) => updateSummary('reconcile', summary), [updateSummary]);
  const updateReconstructSummary = useCallback((summary: BankInlineSummaryData) => updateSummary('reconstruct', summary), [updateSummary]);

  return (
    <div className="flex min-h-[520px] flex-col gap-2 lg:h-full lg:overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 lg:h-[30px] lg:flex-nowrap lg:items-baseline">
        <h1 className="text-[17px] font-bold text-slate-900">{t('bankWorkspace')}</h1>
        <p className="hidden truncate text-xs text-slate-500 sm:block">{t('bankWorkspaceSubtitle')}</p>
        {postCommitRunning && (
          <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500" title={t('postCommitRunning')}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('postCommitRunningShort')}
          </span>
        )}
        <AskAssistantButton className={`${postCommitRunning ? '' : 'ml-auto '}!h-[30px] !text-xs max-lg:!hidden`} />
        <HelpLink slug="pangatehingud" className="!h-[30px] !text-xs max-lg:ml-auto" />
        <button onClick={() => changeTab('import')} className="inline-flex h-[30px] items-center gap-2 whitespace-nowrap rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]">
          <FileUp className="h-4 w-4" />
          {t('importStatement')}
        </button>
      </div>

      <div className="flex flex-shrink-0 flex-col items-stretch gap-1.5 border-y border-slate-200 py-1.5 lg:h-[42px] lg:flex-row lg:items-center lg:gap-3 lg:py-0">
        <BankTabBar
          active={activeTab}
          onChange={changeTab}
          tabs={[
            { id: 'import', label: t('bankTabImport'), icon: Landmark, count: importReviewCount, title: t('bankImportHeaderNote') },
            { id: 'review', label: t('bankTabReview'), icon: ListChecks, count: reviewCount, title: t('bankReviewHeaderNote') },
            { id: 'reconcile', label: t('bankTabReconcile'), icon: Scale, count: reconcileCount, title: t('bankReconcileHeaderNote') },
            ...(showReconstruct || activeTab === 'reconstruct'
              ? [{ id: 'reconstruct' as const, label: t('bankTabReconstruct'), icon: Sparkles, count: reconstructCount, title: t('bankReconstructHeaderNote') }]
              : []),
          ]}
        />
        <div className="min-w-0 lg:ml-auto"><BankInlineSummary data={summaries[activeTab]} /></div>
      </div>

      {/* All tabs stay mounted so in-progress state (e.g. the post-commit draft
          step) survives tab switches and badge counts stay live. */}
      <div className={`min-h-0 flex-1 ${activeTab === 'import' ? '' : 'hidden'}`}>
        <ImportTab onCommitted={handleCommitted} onPostCommitChange={handlePostCommitChange} onReviewCountChange={setImportReviewCount} onSummaryChange={updateImportSummary} />
      </div>
      <div className={`min-h-0 flex-1 ${activeTab === 'review' ? '' : 'hidden'}`}>
        <ReviewTab
          refreshKey={reviewRefreshKey}
          reloadKey={reviewReloadKey}
          onCountChange={setReviewCount}
          onSummaryChange={updateReviewSummary}
          autoDraftTxIds={autoDraftTxIds}
          initialPhase={reviewInitialPhase}
          onAutoDraftsHandled={() => setAutoDraftTxIds([])}
        />
      </div>
      <div className={`min-h-0 flex-1 ${activeTab === 'reconcile' ? '' : 'hidden'}`}>
        <ReconcileTab onUnreconciledCountChange={setReconcileCount} onSummaryChange={updateReconcileSummary} />
      </div>
      {(showReconstruct || activeTab === 'reconstruct') && (
        <div className={`min-h-0 flex-1 ${activeTab === 'reconstruct' ? '' : 'hidden'}`}>
          <ReconstructTab refreshKey={reviewRefreshKey} onCountChange={setReconstructCount} onSummaryChange={updateReconstructSummary} />
        </div>
      )}
    </div>
  );
}
