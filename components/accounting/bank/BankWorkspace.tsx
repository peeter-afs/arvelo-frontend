'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileUp, Landmark, ListChecks, Scale } from 'lucide-react';
import { BankTabBar, type BankTab } from './BankTabBar';
import { BankInlineSummary, type BankInlineSummaryData } from './shared';
import { ImportTab } from './ImportTab';
import { ReviewTab } from './ReviewTab';
import { ReconcileTab } from './ReconcileTab';

const TABS: BankTab[] = ['import', 'review', 'reconcile'];

function parseTab(value: string | null): BankTab {
  return value && (TABS as string[]).includes(value) ? (value as BankTab) : 'import';
}

export function BankWorkspace() {
  const t = useTranslations('accounting');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<BankTab>(() => parseTab(searchParams.get('tab')));
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [importReviewCount, setImportReviewCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reconcileCount, setReconcileCount] = useState(0);
  const [summaries, setSummaries] = useState<Partial<Record<BankTab, BankInlineSummaryData>>>({});

  // Keep the active tab in sync with the URL (back/forward, refresh, deep links).
  useEffect(() => {
    const urlTab = parseTab(searchParams.get('tab'));
    setActiveTab((current) => (current === urlTab ? current : urlTab));
  }, [searchParams]);

  const changeTab = useCallback(
    (tab: BankTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // After an import commit, move the user to the review queue and force a refetch.
  const handleCommitted = useCallback(() => {
    setReviewRefreshKey((key) => key + 1);
    changeTab('review');
  }, [changeTab]);

  const updateSummary = useCallback((tab: BankTab, summary: BankInlineSummaryData) => {
    setSummaries((current) => ({ ...current, [tab]: summary }));
  }, []);
  const updateImportSummary = useCallback((summary: BankInlineSummaryData) => updateSummary('import', summary), [updateSummary]);
  const updateReviewSummary = useCallback((summary: BankInlineSummaryData) => updateSummary('review', summary), [updateSummary]);
  const updateReconcileSummary = useCallback((summary: BankInlineSummaryData) => updateSummary('reconcile', summary), [updateSummary]);

  return (
    <div className="flex h-full min-h-[520px] flex-col gap-2 overflow-hidden">
      <div className="flex h-[30px] flex-shrink-0 items-baseline gap-2">
        <h1 className="text-[17px] font-bold text-slate-900">{t('bankWorkspace')}</h1>
        <p className="truncate text-xs text-slate-500">{t('bankWorkspaceSubtitle')}</p>
        <button onClick={() => changeTab('import')} className="ml-auto inline-flex h-[30px] items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]">
          <FileUp className="h-4 w-4" />
          {t('importStatement')}
        </button>
      </div>

      <div className="flex h-[42px] flex-shrink-0 items-center gap-3 border-y border-slate-200">
        <BankTabBar
          active={activeTab}
          onChange={changeTab}
          tabs={[
            { id: 'import', label: t('bankTabImport'), icon: Landmark, count: importReviewCount, title: t('bankImportHeaderNote') },
            { id: 'review', label: t('bankTabReview'), icon: ListChecks, count: reviewCount, title: t('bankReviewHeaderNote') },
            { id: 'reconcile', label: t('bankTabReconcile'), icon: Scale, count: reconcileCount, title: t('bankReconcileHeaderNote') },
          ]}
        />
        <div className="ml-auto min-w-0"><BankInlineSummary data={summaries[activeTab]} /></div>
      </div>

      {/* All tabs stay mounted so in-progress state (e.g. the post-commit draft
          step) survives tab switches and badge counts stay live. */}
      <div className={`min-h-0 flex-1 ${activeTab === 'import' ? '' : 'hidden'}`}>
        <ImportTab onCommitted={handleCommitted} onReviewCountChange={setImportReviewCount} onSummaryChange={updateImportSummary} />
      </div>
      <div className={`min-h-0 flex-1 ${activeTab === 'review' ? '' : 'hidden'}`}>
        <ReviewTab refreshKey={reviewRefreshKey} onCountChange={setReviewCount} onSummaryChange={updateReviewSummary} />
      </div>
      <div className={`min-h-0 flex-1 ${activeTab === 'reconcile' ? '' : 'hidden'}`}>
        <ReconcileTab onUnreconciledCountChange={setReconcileCount} onSummaryChange={updateReconcileSummary} />
      </div>
    </div>
  );
}
