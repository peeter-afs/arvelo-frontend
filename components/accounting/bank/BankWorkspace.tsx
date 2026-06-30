'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Landmark, ListChecks, Scale } from 'lucide-react';
import { BankTabBar, type BankTab } from './BankTabBar';
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

  const subtitle =
    activeTab === 'import'
      ? t('bankImportDescription')
      : activeTab === 'review'
        ? t('bankReviewDescription')
        : t('bankReconciliationDescription');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('bankWorkspace')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>
      </div>

      <BankTabBar
        active={activeTab}
        onChange={changeTab}
        tabs={[
          { id: 'import', label: t('bankTabImport'), icon: Landmark, count: importReviewCount },
          { id: 'review', label: t('bankTabReview'), icon: ListChecks, count: reviewCount },
          { id: 'reconcile', label: t('bankTabReconcile'), icon: Scale, count: reconcileCount },
        ]}
      />

      {/* All tabs stay mounted so in-progress state (e.g. the post-commit draft
          step) survives tab switches and badge counts stay live. */}
      <div className={activeTab === 'import' ? '' : 'hidden'}>
        <ImportTab onCommitted={handleCommitted} onReviewCountChange={setImportReviewCount} />
      </div>
      <div className={activeTab === 'review' ? '' : 'hidden'}>
        <ReviewTab refreshKey={reviewRefreshKey} onCountChange={setReviewCount} />
      </div>
      <div className={activeTab === 'reconcile' ? '' : 'hidden'}>
        <ReconcileTab onUnreconciledCountChange={setReconcileCount} />
      </div>
    </div>
  );
}
