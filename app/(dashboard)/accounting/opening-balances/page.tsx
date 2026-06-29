'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Eye,
  History,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import Link from 'next/link';
import { accountingApi, type AccountOption, type OpeningBalanceBatchListItem, type PartnerOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { importApi, type OpeningBalanceImportResult } from '@/lib/api/import.api';
import { RoleMappingDialog } from '@/components/accounting/RoleMappingDialog';
import { Button } from '@/components/ui/Button';
import { getIsoToday } from '@/lib/utils/date';

type Mode = 'general' | 'receivables' | 'payables';
type Step = 'upload' | 'parsing' | 'review' | 'confirm';

// The preview/commit endpoints return loosely-shaped, mode-dependent payloads
// (normalized GL lines vs. open-item previews). We read a handful of optional
// fields off them defensively rather than modelling every variant.
type PreviewResult = Record<string, unknown> & {
  totals?: Record<string, number>;
  lines?: Array<Record<string, unknown>>;
  control_account?: { code?: string; name?: string };
  offset_account?: { code?: string; name?: string };
};
type CommitResult = Record<string, unknown> & {
  batch?: { id?: string };
  journal_entry?: { id?: string; entry_number?: string };
  created_invoice_count?: number;
};
type ImportStatusBatch = { batch_type?: string; opening_date?: string };

type GeneralRow = {
  id: string;
  account_id: string;
  account_code: string;
  partner_id: string;
  description: string;
  side: 'debit' | 'credit';
  amount: string;
};

type SubledgerRow = {
  id: string;
  partner_id: string;
  partner_name: string;
  reg_code: string;
  invoice_number: string;
  reference: string;
  description: string;
  invoice_date: string;
  due_date: string;
  amount: string;
};

const createGeneralRow = (): GeneralRow => ({
  id: crypto.randomUUID(),
  account_id: '',
  account_code: '',
  partner_id: '',
  description: '',
  side: 'debit',
  amount: ''
});

const createSubledgerRow = (date = ''): SubledgerRow => ({
  id: crypto.randomUUID(),
  partner_id: '',
  partner_name: '',
  reg_code: '',
  invoice_number: '',
  reference: '',
  description: '',
  invoice_date: date,
  due_date: date,
  amount: ''
});

const fmt = (value: number) => `€${value.toFixed(2)}`;

// Document noun for the active mode, interpolated into the upload/step copy
// ("balance" / "receivables" / "payables") so the wording tracks the chosen tab.
const docNoun = (mode: Mode, t: ReturnType<typeof useTranslations>) =>
  t(mode === 'general' ? 'obDocGeneral' : mode === 'receivables' ? 'obDocReceivables' : 'obDocPayables');

export default function OpeningBalancesPage() {
  const t = useTranslations('accounting');
  const [mode, setMode] = useState<Mode>('general');
  const [step, setStep] = useState<Step>('upload');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [batches, setBatches] = useState<OpeningBalanceBatchListItem[]>([]);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCommitLoading, setIsCommitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [importResult, setImportResult] = useState<OpeningBalanceImportResult | null>(null);
  const [roleDialogAccounts, setRoleDialogAccounts] = useState<AccountOption[] | null>(null);
  const [importSource, setImportSource] = useState<'auto' | 'merit' | 'generic'>('auto');
  // Each type (general / receivables / payables) is imported independently, so the
  // "already imported" lock is per-mode — committing the balance sheet must not
  // block importing receivables or payables.
  const [committedModes, setCommittedModes] = useState<Set<Mode>>(new Set());
  const [glOpeningDate, setGlOpeningDate] = useState<string | null>(null);
  const [detectedDate, setDetectedDate] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  // Snapshot of the payload at the moment Preview ran. Confirm is only enabled
  // while the live payload still matches this snapshot (any edit invalidates it).
  const [previewSnapshot, setPreviewSnapshot] = useState<string | null>(null);
  const [today] = useClientDateInput(getIsoToday);

  const [sharedFields, setSharedFields] = useState({
    opening_date: '',
    currency: 'EUR',
    notes: '',
    source_document_id: ''
  });
  const [generalRows, setGeneralRows] = useState<GeneralRow[]>([createGeneralRow(), createGeneralRow()]);
  const [receivableRows, setReceivableRows] = useState<SubledgerRow[]>([createSubledgerRow()]);
  const [payableRows, setPayableRows] = useState<SubledgerRow[]>([createSubledgerRow()]);
  const [receivablesOffsetAccountId, setReceivablesOffsetAccountId] = useState('');
  const [payablesOffsetAccountId, setPayablesOffsetAccountId] = useState('');

  const currentGeneralTotals = useMemo(() => {
    return generalRows.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0);
        if (row.side === 'debit') acc.debit += amount;
        if (row.side === 'credit') acc.credit += amount;
        acc.difference = acc.debit - acc.credit;
        return acc;
      },
      { debit: 0, credit: 0, difference: 0 }
    );
  }, [generalRows]);

  const currentSubledgerTotal = useMemo(() => {
    const rows = mode === 'receivables' ? receivableRows : payableRows;
    return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }, [mode, receivableRows, payableRows]);

  // A general row is "missing an account" when it carries an amount but has
  // neither a chosen account nor a code to create one from. These block the flow.
  const generalMissingCount = useMemo(
    () =>
      generalRows.filter((row) => Number(row.amount || 0) !== 0 && !row.account_id && !row.account_code).length,
    [generalRows]
  );

  const accountByCode = useMemo(() => {
    const map = new Map<string, AccountOption>();
    for (const a of accounts) map.set(a.code, a);
    return map;
  }, [accounts]);

  // Accounts that exist only as a pending code (parsed but not yet in the chart).
  const willCreateAccounts = useMemo(() => {
    if (mode !== 'general') return [] as { id: string; code: string; name: string }[];
    const seen = new Set<string>();
    const out: { id: string; code: string; name: string }[] = [];
    for (const row of generalRows) {
      if (!row.account_id && row.account_code && !accountByCode.has(row.account_code) && !seen.has(row.account_code)) {
        seen.add(row.account_code);
        out.push({ id: row.id, code: row.account_code, name: row.description.replace(/^\d{3,6}\s*/, '').trim() || row.account_code });
      }
    }
    return out;
  }, [mode, generalRows, accountByCode]);

  const generalBalanced = Math.abs(currentGeneralTotals.difference) < 0.005;
  const subledgerHasRows = (mode === 'receivables' ? receivableRows : payableRows).some((r) => Number(r.amount || 0) !== 0);

  // Whether the form is allowed to advance to the Confirm (preview) step.
  const canAdvanceToConfirm =
    mode === 'general'
      ? generalBalanced && generalMissingCount === 0 && generalRows.some((r) => Number(r.amount || 0) !== 0)
      : subledgerHasRows;

  const canCommit = previewSnapshot === JSON.stringify(buildPayload(mode, sharedFields, {
    generalRows,
    receivableRows,
    payableRows,
    receivablesOffsetAccountId,
    payablesOffsetAccountId
  })) && !!previewResult;

  const isImported = committedModes.has(mode);
  const isDateLocked = mode !== 'general' && !!glOpeningDate;

  useEffect(() => {
    if (!today) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSharedFields((current) => (
      current.opening_date ? current : { ...current, opening_date: today }
    ));
    setReceivableRows((current) => current.map((row) => ({
      ...row,
      invoice_date: row.invoice_date || today,
      due_date: row.due_date || today,
    })));
    setPayableRows((current) => current.map((row) => ({
      ...row,
      invoice_date: row.invoice_date || today,
      due_date: row.due_date || today,
    })));
  }, [today]);

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        const [accountItems, partnerItems, batchResult, importStatus] = await Promise.all([
          accountingApi.getAccounts(),
          accountingApi.getPartners(),
          accountingApi.listOpeningBalances(),
          accountingApi.getOpeningBalanceImportStatus().catch(() => ({ is_imported: false, committed_batches: [] as ImportStatusBatch[] }))
        ]);

        setAccounts(accountItems);
        setPartners(partnerItems);
        setBatches(batchResult.items);
        const committedBatches = importStatus.committed_batches as ImportStatusBatch[];
        const committed = new Set<Mode>();
        for (const b of committedBatches) {
          if (b.batch_type === 'general' || b.batch_type === 'receivables' || b.batch_type === 'payables') {
            committed.add(b.batch_type);
          }
        }
        setCommittedModes(committed);
        const glBatch = committedBatches.find((b) => b.batch_type === 'general');
        if (glBatch?.opening_date) {
          setGlOpeningDate(glBatch.opening_date);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, []);

  const invalidatePreview = () => {
    setPreviewResult(null);
    setCommitResult(null);
    setPreviewSnapshot(null);
  };

  const refreshBatches = async () => {
    const batchResult = await accountingApi.listOpeningBalances();
    setBatches(batchResult.items);
  };

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    invalidatePreview();
    setImportResult(null);
    setErrorMessage(null);
    // Returning to review keeps the editor visible; never jump forward on a mode switch.
    setStep((current) => (current === 'confirm' ? 'review' : current));
    // Lock date to GL opening date when switching to subledger modes
    if (nextMode !== 'general' && glOpeningDate) {
      setSharedFields((current) => ({ ...current, opening_date: glOpeningDate }));
    }
  };

  const applyImportedRows = (result: OpeningBalanceImportResult) => {
    setDetectedDate(result.detected_opening_date || null);
    setSharedFields((current) => ({
      ...current,
      opening_date: result.suggested_payload.opening_date || current.opening_date,
      currency: result.suggested_payload.currency || current.currency,
      source_document_id: result.document_id
    }));

    if (result.mode === 'general') {
      setGeneralRows(
        result.suggested_payload.lines.map((line) => ({
          id: crypto.randomUUID(),
          account_id: String(line.account_id || ''),
          account_code: String((line as Record<string, unknown>).account_code || ''),
          partner_id: String(line.partner_id || ''),
          description: String(line.description || ''),
          side: line.side === 'credit' ? 'credit' : 'debit',
          amount: String(line.amount || '')
        }))
      );
    } else if (result.mode === 'receivables') {
      setReceivableRows(
        result.suggested_payload.lines.map((line) => ({
          id: crypto.randomUUID(),
          partner_id: String(line.partner_id || ''),
          partner_name: String(line.partner_name || ''),
          reg_code: String(line.reg_code || ''),
          invoice_number: String(line.invoice_number || ''),
          reference: String(line.reference || ''),
          description: String(line.description || ''),
          invoice_date: String(line.invoice_date || sharedFields.opening_date),
          due_date: String(line.due_date || sharedFields.opening_date),
          amount: String(line.amount || '')
        }))
      );
    } else {
      setPayableRows(
        result.suggested_payload.lines.map((line) => ({
          id: crypto.randomUUID(),
          partner_id: String(line.partner_id || ''),
          partner_name: String(line.partner_name || ''),
          reg_code: String(line.reg_code || ''),
          invoice_number: String(line.invoice_number || ''),
          reference: String(line.reference || ''),
          description: String(line.description || ''),
          invoice_date: String(line.invoice_date || sharedFields.opening_date),
          due_date: String(line.due_date || sharedFields.opening_date),
          amount: String(line.amount || '')
        }))
      );
    }

    invalidatePreview();
  };

  // Parsing now begins as soon as a file is chosen (no separate "Parse" button).
  const handleFileSelected = async (file: File | null) => {
    if (!file) return;

    setStep('parsing');
    setErrorMessage(null);
    try {
      const result = await importApi.parseOpeningBalancePdf(file, {
        mode,
        opening_date: sharedFields.opening_date,
        source: importSource
      });
      setImportResult(result);
      applyImportedRows(result);
      setStep('review');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStep('upload');
    }
  };

  const handleEnterManually = () => {
    setImportResult(null);
    setStep('review');
  };

  const handleReplace = () => {
    setImportResult(null);
    invalidatePreview();
    setStep('upload');
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    setErrorMessage(null);
    setCommitResult(null);

    try {
      const payload = buildPayload(mode, sharedFields, {
        generalRows,
        receivableRows,
        payableRows,
        receivablesOffsetAccountId,
        payablesOffsetAccountId
      });

      const result =
        mode === 'general'
          ? await accountingApi.previewOpeningBalances(payload)
          : mode === 'receivables'
            ? await accountingApi.previewOpeningReceivables(payload)
            : await accountingApi.previewOpeningPayables(payload);

      setPreviewResult(result);
      setPreviewSnapshot(JSON.stringify(payload));
      setStep('confirm');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPreviewResult(null);
      setPreviewSnapshot(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCommit = async () => {
    setIsCommitLoading(true);
    setErrorMessage(null);

    try {
      const payload = buildPayload(mode, sharedFields, {
        generalRows,
        receivableRows,
        payableRows,
        receivablesOffsetAccountId,
        payablesOffsetAccountId
      });

      const result =
        mode === 'general'
          ? await accountingApi.commitOpeningBalances(payload)
          : mode === 'receivables'
            ? await accountingApi.commitOpeningReceivables(payload)
            : await accountingApi.commitOpeningPayables(payload);

      setCommitResult(result);
      setCommittedModes((current) => new Set(current).add(mode));
      await refreshBatches();
      await maybeOfferRoleMapping();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCommitLoading(false);
    }
  };

  // After committing opening balances, offer to map system roles to the imported
  // chart — but only while the roles still point at the app's default accounts.
  const maybeOfferRoleMapping = async () => {
    try {
      const [settings, accountList] = await Promise.all([
        accountingApi.getAccountingSettings().catch(() => null),
        accountingApi.getAccounts().catch(() => []),
      ]);
      if (!settings) return;
      const byId = new Map(accountList.map((a) => [a.id, a]));
      const roleIds = [
        settings.accounts_receivable_account_id,
        settings.accounts_payable_account_id,
        settings.sales_revenue_account_id,
        settings.purchase_expense_account_id,
        settings.vat_output_account_id,
        settings.vat_input_account_id,
        settings.bank_account_default_id,
      ];
      const stillOnDefaults = roleIds.some((id) => id && byId.get(id)?.system_code);
      const hasImportedAccounts = accountList.some((a) => !a.system_code);
      if (stillOnDefaults && hasImportedAccounts) {
        setRoleDialogAccounts(accountList);
      }
    } catch {
      /* non-fatal */
    }
  };

  const handleCreateAccount = async (payload: { code: string; name: string; type: string }): Promise<AccountOption> => {
    const created = await accountingApi.createAccount(payload);
    const option: AccountOption = {
      id: created.id,
      code: created.code,
      name: created.name,
      type: created.type,
      is_active: created.is_active ?? true,
    };
    setAccounts((current) =>
      [...current.filter((a) => a.id !== option.id), option].sort((a, b) => a.code.localeCompare(b.code))
    );
    return option;
  };

  // Live totals for the sticky action bar (general mode drives the balance check).
  const liveDebit = mode === 'general' ? currentGeneralTotals.debit : currentSubledgerTotal;
  const liveCredit = mode === 'general' ? currentGeneralTotals.credit : currentSubledgerTotal;
  const liveDiff = liveDebit - liveCredit;
  const liveBalanced = Math.abs(liveDiff) < 0.005;

  const blockingReason = (() => {
    if (mode === 'general') {
      if (generalMissingCount > 0) return t('obRowsNeedAccount', { count: generalMissingCount });
      if (!generalBalanced) return t('obEntryNotBalanced');
      if (!generalRows.some((r) => Number(r.amount || 0) !== 0)) return t('obAddAtLeastOneRow');
    } else if (!subledgerHasRows) {
      return t('obAddAtLeastOneRow');
    }
    return null;
  })();

  const showActionBar = step === 'review' || step === 'confirm';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top row: mode selector + History button */}
      <div className="flex items-center gap-3 pt-2">
        <OBModeRow mode={mode} onChange={handleModeChange} t={t} />
        <Button
          variant="default"
          onClick={() => setShowHistory(true)}
          className="shrink-0"
        >
          <History className="h-3.5 w-3.5" />
          <span>{t('obHistory')}</span>
          {batches.length > 0 && (
            <span className="font-mono text-[12px] text-[var(--a-text-3)]">{batches.length}</span>
          )}
        </Button>
      </div>

      {/* Stepper */}
      <OBStepper step={step} mode={mode} t={t} />

      {/* Already-imported lock notice */}
      {isImported && (
        <div className="mt-2 flex items-start gap-3 rounded-[10px] border border-[var(--a-pos)]/30 bg-[var(--a-pos-soft)] px-4 py-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--a-pos)]" />
          <div className="text-[13px]">
            <div className="font-semibold text-[var(--a-text)]">{t('openingBalancesAlreadyImported')}</div>
            <div className="mt-0.5 text-[var(--a-text-2)]">
              {t('openingBalancesAlreadyImportedDescription')}{' '}
              <Link href="/settings?tab=data-management" className="font-medium text-[var(--a-accent)] hover:underline">
                {t('settingsDataManagement')}
              </Link>.
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 flex items-start gap-3 rounded-[10px] border border-[var(--a-neg)]/40 bg-[var(--a-neg-soft)] px-4 py-3 text-[13px] text-[var(--a-neg)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step body */}
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1320px] pb-4">
          {(step === 'upload' || step === 'parsing') && (
            <OBUpload
              step={step}
              mode={mode}
              importSource={importSource}
              onSourceChange={(value) => setImportSource(value)}
              onFileSelected={handleFileSelected}
              onEnterManually={handleEnterManually}
              disabled={isImported || isBootLoading}
              t={t}
            />
          )}

          {step === 'review' && (
            <OBReview
              mode={mode}
              t={t}
              importResult={importResult}
              sharedFields={sharedFields}
              isDateLocked={isDateLocked}
              glOpeningDate={glOpeningDate}
              detectedDate={detectedDate}
              accounts={accounts}
              partners={partners}
              accountByCode={accountByCode}
              generalRows={generalRows}
              receivableRows={receivableRows}
              payableRows={payableRows}
              generalTotals={currentGeneralTotals}
              subledgerTotal={currentSubledgerTotal}
              generalMissingCount={generalMissingCount}
              willCreateAccounts={willCreateAccounts}
              showCreateList={showCreateList}
              onToggleCreateList={() => setShowCreateList((v) => !v)}
              receivablesOffsetAccountId={receivablesOffsetAccountId}
              payablesOffsetAccountId={payablesOffsetAccountId}
              onReplace={handleReplace}
              onSharedFieldChange={(patch) => {
                setSharedFields((current) => ({ ...current, ...patch }));
                invalidatePreview();
              }}
              onOffsetChange={(value) => {
                if (mode === 'receivables') setReceivablesOffsetAccountId(value);
                if (mode === 'payables') setPayablesOffsetAccountId(value);
                invalidatePreview();
              }}
              onGeneralChange={(rows) => {
                setGeneralRows(rows);
                invalidatePreview();
              }}
              onGeneralAddRow={() => {
                setGeneralRows((current) => [...current, createGeneralRow()]);
                invalidatePreview();
              }}
              onSubledgerChange={(rows) => {
                if (mode === 'receivables') setReceivableRows(rows);
                if (mode === 'payables') setPayableRows(rows);
                invalidatePreview();
              }}
              onSubledgerAddRow={() => {
                if (mode === 'receivables') setReceivableRows((current) => [...current, createSubledgerRow()]);
                if (mode === 'payables') setPayableRows((current) => [...current, createSubledgerRow()]);
                invalidatePreview();
              }}
              onCreateAccount={handleCreateAccount}
            />
          )}

          {step === 'confirm' && (
            <OBPreview mode={mode} previewResult={previewResult} commitResult={commitResult} t={t} />
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      {showActionBar && (
        <div className="-mx-4 -mb-6 flex shrink-0 items-center gap-5 border-t border-[var(--a-border)] bg-[var(--a-surface)] px-7 py-3 sm:-mx-6 lg:-mx-7">
          <div className="flex items-center gap-[18px]">
            <OBTotal label={t('obDebit')} value={liveDebit} />
            <OBTotal label={t('obCredit')} value={liveCredit} />
            <div className="h-[30px] w-px bg-[var(--a-border)]" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{t('obDifference')}</div>
              <div
                className="font-mono text-[17px] font-semibold tabular-nums"
                style={{ color: liveBalanced ? 'var(--a-pos)' : 'var(--a-neg)' }}
              >
                {liveBalanced ? '€0.00 ✓' : fmt(Math.abs(liveDiff))}
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {step === 'review' && !canAdvanceToConfirm && blockingReason && (
            <div className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--a-neg)]">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{blockingReason}</span>
            </div>
          )}

          {step === 'review' ? (
            <Button
              variant="primary"
              onClick={handlePreview}
              disabled={!canAdvanceToConfirm || isPreviewLoading || isCommitLoading || isBootLoading || isImported}
            >
              {isPreviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{t('preview')}</span>
            </Button>
          ) : (
            <>
              <Button variant="default" onClick={() => setStep('review')} disabled={isCommitLoading}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t('obBackToEdit')}</span>
              </Button>
              <Button
                variant="primary"
                onClick={handleCommit}
                disabled={!canCommit || isCommitLoading || isPreviewLoading || isImported}
              >
                {isCommitLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{t('obConfirm')}</span>
              </Button>
            </>
          )}
        </div>
      )}

      {showHistory && (
        <OBHistoryDrawer
          batches={batches}
          isLoading={isBootLoading}
          t={t}
          onClose={() => setShowHistory(false)}
        />
      )}

      <RoleMappingDialog
        open={roleDialogAccounts !== null}
        accounts={roleDialogAccounts || []}
        onApply={(mapping) => accountingApi.applyImportedSystemRoles(mapping)}
        onClose={() => setRoleDialogAccounts(null)}
      />
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function OBStepper({ step, mode, t }: { step: Step; mode: Mode; t: ReturnType<typeof useTranslations> }) {
  const idx = step === 'upload' || step === 'parsing' ? 0 : step === 'review' ? 1 : 2;
  const steps = [
    { n: 1, label: t('obStepUpload'), sub: t('obStepUploadSub', { doc: docNoun(mode, t) }) },
    { n: 2, label: t('obStepReview'), sub: t('obStepReviewSub') },
    { n: 3, label: t('obStepConfirm'), sub: t('obStepConfirmSub') },
  ];
  return (
    <div className="py-3">
      <div className="mx-auto flex max-w-[1020px] items-center">
        {steps.map((s, i) => {
          const state = i < idx ? 'done' : i === idx ? 'active' : 'todo';
          return (
            <div key={s.n} className="contents">
              <div className="flex items-center gap-[11px]">
                <div
                  className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold"
                  style={{
                    background:
                      state === 'active' ? 'var(--a-accent)' : state === 'done' ? 'var(--a-pos)' : 'var(--a-surface)',
                    color: state === 'todo' ? 'var(--a-text-3)' : '#fff',
                    border: state === 'todo' ? '1px solid var(--a-border-strong)' : 'none',
                  }}
                >
                  {state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
                </div>
                <div>
                  <div
                    className="text-[13px]"
                    style={{
                      fontWeight: state === 'active' ? 600 : 500,
                      color: state === 'todo' ? 'var(--a-text-3)' : 'var(--a-text)',
                    }}
                  >
                    {s.label}
                  </div>
                  <div className="text-[11px] text-[var(--a-text-3)]">{s.sub}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="mx-4 h-px flex-1"
                  style={{ background: i < idx ? 'var(--a-pos)' : 'var(--a-border)' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mode segmented control ───────────────────────────────────────────────────
function OBModeRow({
  mode,
  onChange,
  t,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const modes: { id: Mode; label: string; sub: string }[] = [
    { id: 'general', label: t('obModeGeneral'), sub: t('obModeGeneralSub') },
    { id: 'receivables', label: t('obModeReceivables'), sub: t('obModeReceivablesSub') },
    { id: 'payables', label: t('obModePayables'), sub: t('obModePayablesSub') },
  ];
  return (
    <div className="flex flex-1 gap-2 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface-2)] p-1">
      {modes.map((m) => {
        const on = m.id === mode;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="flex-1 rounded-[7px] px-3.5 py-2.5 text-left transition-colors"
            style={{
              background: on ? 'var(--a-surface)' : 'transparent',
              border: on ? '1px solid var(--a-border)' : '1px solid transparent',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: on ? 'var(--a-accent)' : 'var(--a-text-3)' }}
              />
              <span
                className="text-[13.5px] font-semibold"
                style={{ color: on ? 'var(--a-text)' : 'var(--a-text-2)' }}
              >
                {m.label}
              </span>
            </div>
            <div className="ml-[15px] mt-[3px] text-[11.5px] text-[var(--a-text-3)]">{m.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Upload step ──────────────────────────────────────────────────────────────
function OBUpload({
  step,
  mode,
  importSource,
  onSourceChange,
  onFileSelected,
  onEnterManually,
  disabled,
  t,
}: {
  step: Step;
  mode: Mode;
  importSource: 'auto' | 'merit' | 'generic';
  onSourceChange: (value: 'auto' | 'merit' | 'generic') => void;
  onFileSelected: (file: File | null) => void;
  onEnterManually: () => void;
  disabled: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const parsing = step === 'parsing';
  const canDrop = !parsing && !disabled;
  const doc = docNoun(mode, t);

  // Without these handlers a dropped file falls through to the browser, which
  // just navigates to (opens) the PDF instead of importing it.
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canDrop) return;
    event.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (!canDrop) return;
    const file = Array.from(event.dataTransfer.files).find((f) => f.type === 'application/pdf')
      ?? event.dataTransfer.files[0]
      ?? null;
    onFileSelected(file);
  };

  return (
    <div className="mt-4">
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="rounded-[12px] border border-dashed px-6 text-center transition-colors"
        style={{
          paddingTop: 40,
          paddingBottom: 40,
          borderColor: dragActive ? 'var(--a-accent)' : 'var(--a-border-strong)',
          background: dragActive ? 'var(--a-accent-soft)' : 'var(--a-surface)',
        }}
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--a-accent-soft)] text-[var(--a-accent)]">
          {parsing ? <Loader2 className="h-[22px] w-[22px] animate-spin" /> : <Upload className="h-[22px] w-[22px]" />}
        </div>
        <div className="mt-4 text-[16px] font-semibold text-[var(--a-text)]">
          {parsing ? t('obParsingHeadline', { doc }) : t('obUploadHeadline', { doc })}
        </div>
        <div className="mx-auto mt-1.5 max-w-[440px] text-[13px] text-[var(--a-text-2)]">
          {parsing ? t('obParsingSubcopy') : t('obUploadSubcopy')}
        </div>

        {!parsing && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                event.target.value = '';
                onFileSelected(file);
              }}
            />
            <div className="mt-[18px] flex items-center justify-center gap-2.5">
              <Button variant="primary" disabled={disabled} onClick={() => inputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                <span>{t('obChooseFile')}</span>
              </Button>
              <span className="text-[12.5px] text-[var(--a-text-3)]">{t('obDragHint')}</span>
            </div>

            {/* Source selector kept */}
            <div className="mx-auto mt-4 flex max-w-[320px] items-center justify-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{t('importSource')}</span>
              <select
                value={importSource}
                onChange={(event) => onSourceChange(event.target.value as 'auto' | 'merit' | 'generic')}
                className="h-9 rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[13px] text-[var(--a-text)]"
              >
                <option value="auto">{t('importSourceAuto')}</option>
                <option value="merit">{t('importSourceMerit')}</option>
                <option value="generic">{t('importSourceGeneric')}</option>
              </select>
            </div>
          </>
        )}
      </div>

      {!parsing && (
        <div className="mt-3 text-center text-[12.5px] text-[var(--a-text-3)]">
          {t('obNoPdf')}{' '}
          <button
            type="button"
            onClick={onEnterManually}
            disabled={disabled}
            className="font-medium text-[var(--a-accent)] hover:underline disabled:opacity-50"
          >
            {t('obEnterManually')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Review step ──────────────────────────────────────────────────────────────
function OBReview(props: {
  mode: Mode;
  t: ReturnType<typeof useTranslations>;
  importResult: OpeningBalanceImportResult | null;
  sharedFields: { opening_date: string; currency: string; notes: string; source_document_id: string };
  isDateLocked: boolean;
  glOpeningDate: string | null;
  detectedDate: string | null;
  accounts: AccountOption[];
  partners: PartnerOption[];
  accountByCode: Map<string, AccountOption>;
  generalRows: GeneralRow[];
  receivableRows: SubledgerRow[];
  payableRows: SubledgerRow[];
  generalTotals: { debit: number; credit: number; difference: number };
  subledgerTotal: number;
  generalMissingCount: number;
  willCreateAccounts: { id: string; code: string; name: string }[];
  showCreateList: boolean;
  onToggleCreateList: () => void;
  receivablesOffsetAccountId: string;
  payablesOffsetAccountId: string;
  onReplace: () => void;
  onSharedFieldChange: (patch: Partial<{ opening_date: string; currency: string; notes: string; source_document_id: string }>) => void;
  onOffsetChange: (value: string) => void;
  onGeneralChange: (rows: GeneralRow[]) => void;
  onGeneralAddRow: () => void;
  onSubledgerChange: (rows: SubledgerRow[]) => void;
  onSubledgerAddRow: () => void;
  onCreateAccount: (payload: { code: string; name: string; type: string }) => Promise<AccountOption>;
}) {
  const {
    mode, t, importResult, sharedFields, isDateLocked, glOpeningDate, detectedDate,
    accounts, partners, accountByCode, generalRows, receivableRows, payableRows,
    subledgerTotal, generalMissingCount, willCreateAccounts, showCreateList,
    onToggleCreateList, receivablesOffsetAccountId, payablesOffsetAccountId, onReplace,
    onSharedFieldChange, onOffsetChange, onGeneralChange, onGeneralAddRow,
    onSubledgerChange, onSubledgerAddRow, onCreateAccount,
  } = props;

  return (
    <div>
      {/* source summary card */}
      {importResult && (
        <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] px-4 py-3">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-[6px] bg-[#fbeaea] text-[8.5px] font-bold text-[#c0392b]">
            PDF
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-[var(--a-text)]">{importResult.file_name}</div>
            <div className="truncate font-mono text-[11.5px] text-[var(--a-text-3)]">
              {importResult.source === 'merit' ? t('sourceMeritUsed') : t('sourceAiUsed', { model: importResult.model })}
              {importResult.detected_opening_date ? ` · ${importResult.detected_opening_date}` : ''}
              {` · ${t('obRowsLabel', { count: mode === 'general' ? generalRows.length : (mode === 'receivables' ? receivableRows.length : payableRows.length) })}`}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--a-pos)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t('obParsed')}
          </span>
          <Button variant="default" onClick={onReplace} className="h-[30px] text-[12px]">
            <Upload className="h-3 w-3" /> {t('obReplace')}
          </Button>
        </div>
      )}

      {/* blocking-missing notice */}
      {mode === 'general' && generalMissingCount > 0 && (
        <div className="mt-3 flex items-center gap-2.5 rounded-[9px] border border-[var(--a-neg)]/40 bg-[var(--a-neg-soft)] px-3.5 py-2.5 text-[13px] text-[var(--a-neg)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            <strong>{t('obRowsNeedAccount', { count: generalMissingCount })}</strong> {t('obRowsNeedAccountDetail')}
          </span>
        </div>
      )}

      {/* collapsed "will be created" notice */}
      {mode === 'general' && willCreateAccounts.length > 0 && (
        <div className="mt-2.5 rounded-[9px] border border-[var(--a-border)] bg-[var(--a-surface)]">
          <button
            type="button"
            onClick={onToggleCreateList}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
          >
            <AlertCircle className="h-[15px] w-[15px] shrink-0 text-[var(--a-warn)]" />
            <span className="flex-1 text-[13px] text-[var(--a-text-2)]">
              <strong className="text-[var(--a-text)]">{t('obNewAccountsWillBeCreated', { count: willCreateAccounts.length })}</strong>{' '}
              {t('obNewAccountsWillBeCreatedDetail')}
            </span>
            <span className="text-[12px] text-[var(--a-text-3)]">{showCreateList ? t('obHideToggle') : t('obReviewToggle')}</span>
            <ChevronDown
              className="h-3.5 w-3.5 text-[var(--a-text-3)] transition-transform"
              style={{ transform: showCreateList ? 'rotate(180deg)' : 'none' }}
            />
          </button>
          {showCreateList && (
            <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
              {willCreateAccounts.map((a) => (
                <span
                  key={a.id}
                  className="rounded-[5px] border border-[var(--a-border)] bg-[var(--a-surface-2)] px-2 py-[3px] font-mono text-[11.5px] text-[var(--a-text-2)]"
                >
                  {a.code} · {a.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* meta strip — compact; auto-detected detail surfaces on hover */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <label
          className="flex items-center gap-1.5"
          title={
            !isDateLocked && detectedDate
              ? t('detectedDateFromPdf', { date: detectedDate })
              : isDateLocked && glOpeningDate
                ? t('lockedToGlOpeningDate')
                : t('openingDate')
          }
        >
          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{t('openingDate')}</span>
          <input
            type="date"
            value={sharedFields.opening_date}
            readOnly={isDateLocked}
            onChange={(event) => {
              if (isDateLocked) return;
              onSharedFieldChange({ opening_date: event.target.value });
            }}
            className="h-[30px] w-[140px] rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2 font-mono text-[12.5px] text-[var(--a-text)]"
            style={isDateLocked ? { background: 'var(--a-surface-2)', color: 'var(--a-text-3)' } : undefined}
          />
          {!isDateLocked && detectedDate && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--a-pos)]" />}
        </label>

        <label className="flex items-center gap-1.5" title={t('currency')}>
          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{t('currency')}</span>
          <input
            type="text"
            value={sharedFields.currency}
            onChange={(event) => onSharedFieldChange({ currency: event.target.value.toUpperCase() })}
            className="h-[30px] w-[68px] rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2 font-mono text-[12.5px] text-[var(--a-text)]"
          />
        </label>

        {(mode === 'receivables' || mode === 'payables') && (
          <label className="flex min-w-[220px] flex-1 items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{t('obOffsetAccount')}</span>
            <select
              value={mode === 'receivables' ? receivablesOffsetAccountId : payablesOffsetAccountId}
              onChange={(event) => onOffsetChange(event.target.value)}
              className="h-[30px] flex-1 rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[12.5px] text-[var(--a-text)]"
            >
              <option value="">{t('selectOffsetAccount')}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <input
          type="text"
          value={sharedFields.notes}
          onChange={(event) => onSharedFieldChange({ notes: event.target.value })}
          placeholder={t('optionalOnboardingNote')}
          title={t('notes')}
          className="h-[30px] min-w-[160px] flex-1 rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[12.5px] text-[var(--a-text)]"
        />
      </div>

      {mode === 'general' ? (
        <GeneralTable
          t={t}
          rows={generalRows}
          accounts={accounts}
          partners={partners}
          accountByCode={accountByCode}
          missingCount={generalMissingCount}
          onChange={onGeneralChange}
          onAddRow={onGeneralAddRow}
          onCreateAccount={onCreateAccount}
        />
      ) : (
        <SubledgerTable
          mode={mode}
          t={t}
          rows={mode === 'receivables' ? receivableRows : payableRows}
          partners={partners}
          total={subledgerTotal}
          onChange={onSubledgerChange}
          onAddRow={onSubledgerAddRow}
        />
      )}
    </div>
  );
}

function OBTotal({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{label}</div>
      <div className="font-mono text-[17px] font-semibold tabular-nums text-[var(--a-text)]">{fmt(value)}</div>
    </div>
  );
}

// Shared grid template so header + rows line up; partner column is optional.
const OB_COLS = (showPartner: boolean) =>
  showPartner
    ? '34px minmax(320px,2fr) 160px minmax(220px,1.3fr) 70px 150px 36px'
    : '34px minmax(360px,2.2fr) minmax(240px,1.4fr) 70px 150px 36px';

// ─── General ledger table ─────────────────────────────────────────────────────
function GeneralTable({
  t,
  rows,
  accounts,
  partners,
  accountByCode,
  missingCount,
  onChange,
  onAddRow,
  onCreateAccount,
}: {
  t: ReturnType<typeof useTranslations>;
  rows: GeneralRow[];
  accounts: AccountOption[];
  partners: PartnerOption[];
  accountByCode: Map<string, AccountOption>;
  missingCount: number;
  onChange: (rows: GeneralRow[]) => void;
  onAddRow: () => void;
  onCreateAccount: (payload: { code: string; name: string; type: string }) => Promise<AccountOption>;
}) {
  const [createForRowId, setCreateForRowId] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'asset' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showPartner, setShowPartner] = useState(false);

  const balanceSheetSummary = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let hasResolvedAccounts = false;
    let unmatchedCount = 0;

    for (const row of rows) {
      const amount = Number(row.amount || 0);
      if (amount === 0) continue;

      const account = accounts.find((a) => a.id === row.account_id);
      const code = account?.code || row.account_code || '';
      if (!code) {
        unmatchedCount += 1;
        continue;
      }

      hasResolvedAccounts = true;
      const signedAmount = row.side === 'debit' ? amount : -amount;

      if (code.startsWith('1')) {
        totalAssets += signedAmount;
      } else if (code.startsWith('2') && !code.startsWith('29')) {
        totalLiabilities += -signedAmount;
      } else {
        totalEquity += -signedAmount;
      }
    }

    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
    return { totalAssets, totalLiabilities, totalEquity, isBalanced, hasResolvedAccounts, unmatchedCount };
  }, [rows, accounts]);

  const updateRow = (id: string, key: keyof GeneralRow, value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const selectRowAccount = (id: string, accountId: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, account_id: accountId, account_code: accountId ? '' : row.account_code } : row)));
  };

  const removeRow = (id: string) => onChange(rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);

  const openCreateAccount = (row: GeneralRow) => {
    setCreateForRowId(row.id);
    setCreateError(null);
    setNewAccount({
      code: row.account_code || '',
      name: (row.description || '').replace(/^\d{3,6}\s*/, '').trim(),
      type: 'asset',
    });
  };

  const submitCreateAccount = async (rowId: string) => {
    if (!newAccount.code.trim() || !newAccount.name.trim()) {
      setCreateError('Code and name are required');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await onCreateAccount({
        code: newAccount.code.trim(),
        name: newAccount.name.trim(),
        type: newAccount.type,
      });
      selectRowAccount(rowId, created.id);
      setCreateForRowId(null);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[13.5px] font-semibold text-[var(--a-text)]">{t('obGeneralLedgerRows')}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPartner((v) => !v)}
              className="inline-flex items-center gap-[7px] rounded-[6px] border border-[var(--a-border)] px-2.5 py-[5px] text-[12.5px]"
              style={{
                background: showPartner ? 'var(--a-accent-soft-2)' : 'transparent',
                color: showPartner ? 'var(--a-accent)' : 'var(--a-text-2)',
              }}
            >
              <span
                className="relative inline-block h-[15px] w-[26px] shrink-0 rounded-full transition-colors"
                style={{ background: showPartner ? 'var(--a-accent)' : 'var(--a-border-strong)' }}
              >
                <span
                  className="absolute top-[2px] h-[11px] w-[11px] rounded-full bg-white transition-all"
                  style={{ left: showPartner ? 13 : 2 }}
                />
              </span>
              {t('obPartnerColumn')}
            </button>
            <button
              type="button"
              onClick={onAddRow}
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-dashed border-[var(--a-border-strong)] bg-transparent px-2.5 py-[5px] text-[12.5px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
            >
              <Plus className="h-3 w-3" /> {t('obAddRow')}
            </button>
          </div>
        </div>

        <div
          className="grid gap-3.5 bg-[var(--a-surface-2)] px-[18px] py-2 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--a-text-3)]"
          style={{ gridTemplateColumns: OB_COLS(showPartner) }}
        >
          <div />
          <div>{t('obColAccount')}</div>
          {showPartner && <div>{t('obColPartner')}</div>}
          <div>{t('obColDescription')}</div>
          <div>{t('obColSide')}</div>
          <div className="text-right">{t('obColAmount')}</div>
          <div />
        </div>

        {rows.map((row, index) => {
          const resolvedCode = accountByCode.get(row.account_code);
          const missing = Number(row.amount || 0) !== 0 && !row.account_id && !row.account_code;
          const willCreate = !row.account_id && !!row.account_code && !resolvedCode;
          return (
            <div key={row.id}>
              <div
                className="grid items-center gap-3.5 border-b border-[var(--a-border)] px-[18px] py-2.5"
                style={{
                  gridTemplateColumns: OB_COLS(showPartner),
                  background: missing ? 'var(--a-neg-soft)' : 'transparent',
                  boxShadow: missing ? 'inset 2px 0 0 var(--a-neg)' : 'none',
                }}
              >
                <div className="font-mono text-[11px] text-[var(--a-text-3)]">{index + 1}</div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <select
                      value={row.account_id}
                      onChange={(e) => selectRowAccount(row.id, e.target.value)}
                      title={willCreate ? t('obCreatedOnConfirmHint') : undefined}
                      className="h-[34px] min-w-0 flex-1 rounded-[7px] px-2.5 text-[13px]"
                      style={{
                        border: missing ? '1px solid var(--a-neg)' : '1px solid var(--a-border)',
                        background: 'var(--a-surface)',
                        color: missing ? 'var(--a-neg)' : 'var(--a-text)',
                      }}
                    >
                      <option value="">
                        {row.account_code
                          ? t('obCreatedOnCommitOption', { code: row.account_code })
                          : t('obSelectAccount')}
                      </option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </select>

                    {missing && createForRowId !== row.id && (
                      <button
                        type="button"
                        onClick={() => openCreateAccount(row)}
                        className="shrink-0 whitespace-nowrap text-[11.5px] font-medium text-[var(--a-accent)] hover:underline"
                      >
                        + {t('obNewAccount')}
                      </button>
                    )}
                    {willCreate && (
                      <span
                        title={t('obCreatedOnConfirmHint')}
                        className="shrink-0 rounded-[5px] border px-[7px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--a-warn)]"
                        style={{ background: 'var(--a-warn-soft)', borderColor: '#e8d3a8' }}
                      >
                        {t('obNew')}
                      </span>
                    )}
                  </div>

                  {createForRowId === row.id && (
                    <div className="mt-2 space-y-2 rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] p-2">
                      <input
                        value={newAccount.code}
                        onChange={(e) => setNewAccount((c) => ({ ...c, code: e.target.value }))}
                        placeholder="Code"
                        className="h-9 w-full rounded-[6px] border border-[var(--a-border)] px-2 text-[13px]"
                      />
                      <input
                        value={newAccount.name}
                        onChange={(e) => setNewAccount((c) => ({ ...c, name: e.target.value }))}
                        placeholder="Name"
                        className="h-9 w-full rounded-[6px] border border-[var(--a-border)] px-2 text-[13px]"
                      />
                      <select
                        value={newAccount.type}
                        onChange={(e) => setNewAccount((c) => ({ ...c, type: e.target.value }))}
                        className="h-9 w-full rounded-[6px] border border-[var(--a-border)] px-2 text-[13px]"
                      >
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="equity">Equity</option>
                        <option value="revenue">Revenue</option>
                        <option value="expense">Expense</option>
                      </select>
                      {createError && <div className="text-[11px] text-[var(--a-neg)]">{createError}</div>}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={() => void submitCreateAccount(row.id)}
                          disabled={creating}
                          className="h-8 text-[12px]"
                        >
                          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          <span>Create</span>
                        </Button>
                        <Button variant="default" onClick={() => setCreateForRowId(null)} className="h-8 text-[12px]">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {showPartner && (
                  <select
                    value={row.partner_id}
                    onChange={(e) => updateRow(row.id, 'partner_id', e.target.value)}
                    className="h-[34px] min-w-0 rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[12.5px] text-[var(--a-text-2)]"
                  >
                    <option value="">{t('obOptional')}</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>{partner.name}</option>
                    ))}
                  </select>
                )}

                <input
                  value={row.description}
                  onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[12.5px] text-[var(--a-text-2)]"
                />

                <div className="inline-flex overflow-hidden rounded-[6px] border border-[var(--a-border)]">
                  {(['debit', 'credit'] as const).map((s) => {
                    const on = row.side === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateRow(row.id, 'side', s)}
                        className="w-[30px] py-[5px] text-center font-mono text-[12px] font-semibold"
                        style={{
                          background: on ? (s === 'debit' ? 'var(--a-text)' : 'var(--a-text-2)') : 'transparent',
                          color: on ? '#fff' : 'var(--a-text-3)',
                        }}
                      >
                        {s === 'debit' ? 'D' : 'C'}
                      </button>
                    );
                  })}
                </div>

                <input
                  value={row.amount}
                  onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                  inputMode="decimal"
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-right font-mono text-[13px] tabular-nums text-[var(--a-text)]"
                />

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  className="grid h-8 w-8 place-items-center rounded-[6px] text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* balance-sheet summary strip */}
      <div className="mt-3.5">
        <div className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{t('obBalanceSheetSummary')}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OBSummaryCard label={t('obTotalAssets')} value={balanceSheetSummary.totalAssets} />
          <OBSummaryCard label={t('obTotalLiabilities')} value={balanceSheetSummary.totalLiabilities} />
          <OBSummaryCard label={t('obTotalEquity')} value={balanceSheetSummary.totalEquity} />
          <OBSummaryCard
            label={t('obBalanceCheck')}
            value={Math.abs(balanceSheetSummary.totalAssets - (balanceSheetSummary.totalLiabilities + balanceSheetSummary.totalEquity))}
            check
            ok={balanceSheetSummary.isBalanced && missingCount === 0}
          />
        </div>
        {balanceSheetSummary.unmatchedCount > 0 && (
          <p className="mt-2 text-[12px] text-[var(--a-text-3)]">
            {t('obRowsExcludedFromSummary', { count: balanceSheetSummary.unmatchedCount })}
          </p>
        )}
      </div>
    </>
  );
}

function OBSummaryCard({ label, value, check, ok }: { label: string; value: number; check?: boolean; ok?: boolean }) {
  const tone = check ? (ok ? 'var(--a-pos)' : 'var(--a-neg)') : 'var(--a-text)';
  return (
    <div className="rounded-[9px] border border-[var(--a-border)] bg-[var(--a-surface)] px-3.5 py-3">
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{label}</div>
      <div className="mt-1.5 font-mono text-[18px] font-semibold tabular-nums" style={{ color: tone }}>
        {check && ok ? '€0.00 ✓' : fmt(Math.abs(value))}
      </div>
    </div>
  );
}

const SUB_GRID = '32px 180px 180px 130px 130px 130px 1fr 130px 132px 36px';

// ─── Subledger table ──────────────────────────────────────────────────────────
function SubledgerTable({
  mode,
  t,
  rows,
  partners,
  total,
  onChange,
  onAddRow,
}: {
  mode: 'receivables' | 'payables';
  t: ReturnType<typeof useTranslations>;
  rows: SubledgerRow[];
  partners: PartnerOption[];
  total: number;
  onChange: (rows: SubledgerRow[]) => void;
  onAddRow: () => void;
}) {
  const updateRow = (id: string, key: keyof SubledgerRow, value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };
  const removeRow = (id: string) => onChange(rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div>
            <div className="text-[13.5px] font-semibold text-[var(--a-text)]">
              {mode === 'receivables' ? t('obReceivableOpenItems') : t('obPayableOpenItems')}
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--a-text-3)]">
              {mode === 'receivables' ? t('obReceivableRowHint') : t('obPayableRowHint')}
            </div>
          </div>
          <button
            type="button"
            onClick={onAddRow}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-dashed border-[var(--a-border-strong)] bg-transparent px-2.5 py-[5px] text-[12.5px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
          >
            <Plus className="h-3 w-3" /> {t('obAddRow')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <div
            className="grid min-w-[1240px] gap-3 bg-[var(--a-surface-2)] px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--a-text-3)]"
            style={{ gridTemplateColumns: SUB_GRID }}
          >
            <div />
            <div>{t('obColPartner')}</div>
            <div>{t('obPartnerName')}</div>
            <div>{t('obRegistryCode')}</div>
            <div>{t('obInvoiceNo')}</div>
            <div>{t('reference')}</div>
            <div>{t('obColDescription')}</div>
            <div>{t('obInvoiceDate')} / {t('obDueDate')}</div>
            <div className="text-right">{t('obColAmount')}</div>
            <div />
          </div>

          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid min-w-[1240px] items-center gap-3 border-b border-[var(--a-border)] px-4 py-2.5"
              style={{ gridTemplateColumns: SUB_GRID }}
            >
              <div className="font-mono text-[11px] text-[var(--a-text-3)]">{index + 1}</div>

              <select
                value={row.partner_id}
                onChange={(e) => updateRow(row.id, 'partner_id', e.target.value)}
                className="h-[34px] rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[12.5px] text-[var(--a-text-2)]"
              >
                <option value="">{t('obMatchOrCreate')}</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>

              <input
                value={row.partner_name}
                onChange={(e) => updateRow(row.id, 'partner_name', e.target.value)}
                placeholder={t('obPartnerNeededIfNew')}
                className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[12.5px] text-[var(--a-text-2)]"
              />

              <input
                value={row.reg_code}
                onChange={(e) => updateRow(row.id, 'reg_code', e.target.value)}
                placeholder={t('obOptional')}
                className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 font-mono text-[12.5px] text-[var(--a-text-2)]"
              />

              <input
                value={row.invoice_number}
                onChange={(e) => updateRow(row.id, 'invoice_number', e.target.value)}
                className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 font-mono text-[12.5px] text-[var(--a-text-2)]"
              />

              <input
                value={row.reference}
                onChange={(e) => updateRow(row.id, 'reference', e.target.value)}
                className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 font-mono text-[12.5px] text-[var(--a-text-2)]"
              />

              <input
                value={row.description}
                onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[12.5px] text-[var(--a-text-2)]"
              />

              <div className="flex flex-col gap-1">
                <input
                  type="date"
                  value={row.invoice_date}
                  onChange={(e) => updateRow(row.id, 'invoice_date', e.target.value)}
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2 font-mono text-[12px] text-[var(--a-text-2)]"
                />
                <input
                  type="date"
                  value={row.due_date}
                  onChange={(e) => updateRow(row.id, 'due_date', e.target.value)}
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2 font-mono text-[12px] text-[var(--a-text-2)]"
                />
              </div>

              <input
                value={row.amount}
                onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                inputMode="decimal"
                className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-right font-mono text-[13px] tabular-nums text-[var(--a-text)]"
              />

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                className="grid h-8 w-8 place-items-center rounded-[6px] text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 sm:max-w-[260px]">
        <OBSummaryCard label={t('obOpenItemTotal')} value={total} />
      </div>
    </>
  );
}

// ─── Confirm / Preview step ───────────────────────────────────────────────────
function OBPreview({
  mode,
  previewResult,
  commitResult,
  t,
}: {
  mode: Mode;
  previewResult: PreviewResult | null;
  commitResult: CommitResult | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const totals: Record<string, number> = previewResult?.totals || {};
  const debitTotal = Number(totals.debit_total ?? 0);
  const creditTotal = Number(totals.credit_total ?? 0);
  const lineTotal = Number(totals.line_total ?? 0);
  const lines: Array<Record<string, unknown>> = previewResult?.lines || [];

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center gap-2.5">
        <Eye className="h-4 w-4 text-[var(--a-accent)]" />
        <div className="text-[16px] font-semibold text-[var(--a-text)]">{t('obPreviewHeadline')}</div>
      </div>
      <div className="mb-4 text-[13px] text-[var(--a-text-2)]">{t('obPreviewSubcopy')}</div>

      {!previewResult ? (
        <div className="rounded-[10px] border border-dashed border-[var(--a-border-strong)] bg-[var(--a-surface)] p-6 text-[13px] text-[var(--a-text-3)]">
          {t('previewRequiredBeforeCommit')}
        </div>
      ) : (
        <>
          <div className="mb-3.5 flex gap-3">
            {'debit_total' in totals ? (
              <>
                <OBPreviewTotal label={t('obDebitTotal')} value={debitTotal} />
                <OBPreviewTotal label={t('obCreditTotal')} value={creditTotal} />
              </>
            ) : (
              <OBPreviewTotal label={t('obLineTotal')} value={lineTotal} />
            )}
            <div className="flex flex-1 items-center gap-2.5 rounded-[10px] border border-[var(--a-pos)]/40 bg-[var(--a-pos-soft)] px-4 py-3.5">
              <CheckCircle2 className="h-[18px] w-[18px] text-[var(--a-pos)]" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--a-pos)]">{t('obStatus')}</div>
                <div className="text-[15px] font-semibold text-[var(--a-pos)]">{t('obBalancedReadyToPost')}</div>
              </div>
            </div>
          </div>

          {(previewResult.control_account || previewResult.offset_account) && (
            <div className="mb-3.5 grid gap-3 sm:grid-cols-2">
              {previewResult.control_account && (
                <div className="rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] px-4 py-3 text-[13px]">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{t('obControlAccount')}</div>
                  <div className="font-medium text-[var(--a-text)]">{previewResult.control_account.code} · {previewResult.control_account.name}</div>
                </div>
              )}
              {previewResult.offset_account && (
                <div className="rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] px-4 py-3 text-[13px]">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{t('obOffsetAccount')}</div>
                  <div className="font-medium text-[var(--a-text)]">{previewResult.offset_account.code} · {previewResult.offset_account.name}</div>
                </div>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)]">
            <div className="border-b border-[var(--a-border)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--a-text-3)]">
              {mode === 'general' ? t('obNormalizedLines', { count: lines.length }) : t('obOpenItemPreview', { count: lines.length })}
            </div>
            {lines.map((line, index) => {
              const str = (key: string) => {
                const v = line[key];
                return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
              };
              const num = (key: string) => Number(line[key] || 0);
              const code = str('account_code') || str('code');
              const name = str('account_name') || str('partner_name') || str('description') || str('invoice_number');
              const hasDc = 'debit' in line || 'credit' in line;
              return (
                <div
                  key={`${index}-${str('account_id') || str('partner_id') || str('invoice_number') || index}`}
                  className="grid items-center gap-3 border-b border-[var(--a-border)] px-4 py-2.5"
                  style={{ gridTemplateColumns: '1fr 120px 200px' }}
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    {code && (
                      <span className="rounded-[4px] bg-[var(--a-surface-2)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--a-text-2)]">{code}</span>
                    )}
                    <span className="truncate text-[13.5px] text-[var(--a-text)]">{name}</span>
                  </div>
                  <div className="text-[12px] text-[var(--a-text-3)]">{str('due_date') || str('invoice_date') || '—'}</div>
                  <div className="text-right font-mono text-[13px] tabular-nums">
                    {hasDc ? (
                      <>
                        <span style={{ color: num('debit') ? 'var(--a-text)' : 'var(--a-text-3)' }}>D {num('debit').toFixed(2)}</span>
                        <span className="text-[var(--a-text-3)]"> / </span>
                        <span style={{ color: num('credit') ? 'var(--a-text)' : 'var(--a-text-3)' }}>C {num('credit').toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-[var(--a-text)]">{num('amount').toFixed(2)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {commitResult && (
        <div className="mt-4 rounded-[10px] border border-[var(--a-pos)]/40 bg-[var(--a-pos-soft)] p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--a-pos)]" />
            <div className="space-y-1.5 text-[13px]">
              <div className="font-semibold text-[var(--a-text)]">{t('obCommitCompleted')}</div>
              <div className="text-[var(--a-text-2)]">
                {t('obCommitBatchLinked', {
                  batch: commitResult.batch?.id?.slice(0, 8) || '',
                  journal: commitResult.journal_entry?.entry_number || commitResult.journal_entry?.id?.slice(0, 8) || '',
                })}
              </div>
              {typeof commitResult.created_invoice_count === 'number' && (
                <div className="text-[var(--a-text-2)]">{t('obCreatedInvoices', { count: commitResult.created_invoice_count })}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OBPreviewTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] px-4.5 py-3.5">
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--a-text-3)]">{label}</div>
      <div className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-[var(--a-text)]">{fmt(value)}</div>
    </div>
  );
}

// ─── History drawer ───────────────────────────────────────────────────────────
function OBHistoryDrawer({
  batches,
  isLoading,
  t,
  onClose,
}: {
  batches: OpeningBalanceBatchListItem[];
  isLoading: boolean;
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(10,10,10,0.28)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[380px] flex-col border-l border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--a-border)] px-[18px] py-4">
          <div>
            <div className="text-[15px] font-semibold text-[var(--a-text)]">{t('recentBatches')}</div>
            <div className="text-[12px] text-[var(--a-text-3)]">{t('obRecentBatchesSub')}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--a-text-2)] hover:text-[var(--a-text)]"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3.5">
          {isLoading ? (
            <div className="p-3 text-[13px] text-[var(--a-text-3)]">{t('loadingBatches')}</div>
          ) : batches.length === 0 ? (
            <div className="p-3 text-[13px] text-[var(--a-text-3)]">{t('noOpeningBalanceBatches')}</div>
          ) : (
            batches.map((batch) => (
              <div key={batch.id} className="mb-2.5 rounded-[9px] border border-[var(--a-border)] px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-[4px] bg-[var(--a-surface-2)] px-[7px] py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-2)]">
                    {batch.batch_type || t('general')}
                  </span>
                  <Link
                    href="/settings?tab=data-management"
                    className="text-[11.5px] font-medium text-[var(--a-accent)] hover:underline"
                  >
                    {t('obResetLink')}
                  </Link>
                </div>
                <div className="mt-2 font-mono text-[14px] font-semibold text-[var(--a-text)]">{batch.opening_date}</div>
                <div className="mt-0.5 text-[12px] text-[var(--a-text-3)]">
                  {batch.currency} ·{' '}
                  {batch.journal_entry_number
                    ? t('journalNumber', { number: batch.journal_entry_number })
                    : batch.journal_entry_id
                      ? t('journalNumber', { number: batch.journal_entry_id.slice(0, 8) })
                      : t('obJournalLinkPending')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function buildPayload(
  mode: Mode,
  sharedFields: {
    opening_date: string;
    currency: string;
    notes: string;
    source_document_id: string;
  },
  state: {
    generalRows: GeneralRow[];
    receivableRows: SubledgerRow[];
    payableRows: SubledgerRow[];
    receivablesOffsetAccountId: string;
    payablesOffsetAccountId: string;
  }
) {
  const base = {
    opening_date: sharedFields.opening_date,
    currency: sharedFields.currency,
    notes: sharedFields.notes || undefined,
    source_document_id: sharedFields.source_document_id || undefined
  };

  if (mode === 'general') {
    return {
      ...base,
      lines: state.generalRows.map((row) => ({
        account_id: row.account_id || undefined,
        account_code: row.account_id ? undefined : (row.account_code || undefined),
        partner_id: row.partner_id || undefined,
        description: row.description || undefined,
        side: row.side,
        amount: Number(row.amount || 0)
      }))
    };
  }

  const rows = (mode === 'receivables' ? state.receivableRows : state.payableRows).map((row) => ({
    partner_id: row.partner_id || undefined,
    partner_name: row.partner_name || undefined,
    reg_code: row.reg_code || undefined,
    invoice_number: row.invoice_number || undefined,
    reference: row.reference || undefined,
    description: row.description || undefined,
    invoice_date: row.invoice_date || undefined,
    due_date: row.due_date || undefined,
    amount: Number(row.amount || 0)
  }));

  return {
    ...base,
    offset_account_id: mode === 'receivables' ? state.receivablesOffsetAccountId || undefined : state.payablesOffsetAccountId || undefined,
    lines: rows
  };
}
