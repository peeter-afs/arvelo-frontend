'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileQuestion,
  FileUp,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  bankingApi,
  type BankAccountRecord,
  type BankImportCommitSummary,
  type BankImportHistoryItem,
  type BankImportJob,
  type BankImportPreviewRow,
  type BankImportSummary,
  type DraftableOutgoingItem,
} from '@/lib/api/banking.api';
import { getErrorMessage } from '@/lib/api/client';
import { showToast } from '@/components/ui/Toast';
import { formatLabel, type BankInlineSummaryData } from './shared';

type ImportFormat = 'csv' | 'camt53';
type ImportStage = 'start' | 'parsed' | 'committed';
type RowFilter = 'all' | 'review' | 'ready';

function detectImportFormat(file: File, fileContent: string): ImportFormat {
  const fileName = file.name.toLowerCase();
  const trimmedContent = fileContent.trim().slice(0, 500).toLowerCase();

  if (
    fileName.endsWith('.xml') ||
    trimmedContent.includes('<bktocstmrstmt') ||
    trimmedContent.includes('camt.053') ||
    (trimmedContent.includes('<?xml') && trimmedContent.includes('<document'))
  ) {
    return 'camt53';
  }

  return 'csv';
}

function detectStatementIban(fileContent: string): string | null {
  const match = fileContent.match(/<(?:\w+:)?IBAN\b[^>]*>\s*([A-Z]{2}[0-9A-Z ]{10,34})\s*<\/(?:\w+:)?IBAN>/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, '').toUpperCase() || null;
}

function isDuplicateRow(row: BankImportPreviewRow) {
  return row.is_duplicate === true || row.warning_flags.some((flag) => flag.toLowerCase().includes('duplicate'));
}

function ImportSteps({ stage }: { stage: ImportStage }) {
  const t = useTranslations('accounting');
  const activeIndex = stage === 'start' ? 0 : stage === 'parsed' ? 1 : 2;
  const steps = [
    { title: t('bankImportStepTitle1'), description: t('bankImportStepDesc1') },
    { title: t('bankImportStepTitle2'), description: t('bankImportStepDesc2') },
    { title: t('bankImportStepTitle3'), description: t('bankImportStepDesc3') },
  ];

  return (
    <div className="card grid flex-shrink-0 overflow-hidden md:grid-cols-3">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <div
            key={step.title}
            className={`flex min-w-0 gap-3 border-slate-200 px-4 py-3 md:border-r md:last:border-r-0 ${isActive ? 'bg-orange-50' : ''}`}
          >
            <span
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isActive
                  ? 'bg-[var(--primary)] text-white'
                  : isDone
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isDone ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900">{step.title}</div>
              <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{step.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[190px] truncate text-right font-mono font-medium tabular-nums text-slate-800" title={String(value)}>{value}</span>
    </div>
  );
}

function formatBankDay(value: string | null, locale: string): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function ImportTab({
  onCommitted,
  onReviewCountChange,
  onSummaryChange,
}: {
  onCommitted: (draftTxIds?: string[]) => void;
  onReviewCountChange?: (count: number) => void;
  onSummaryChange?: (summary: BankInlineSummaryData) => void;
}) {
  const t = useTranslations('accounting');
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [job, setJob] = useState<BankImportJob | null>(null);
  const [previewRows, setPreviewRows] = useState<BankImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<BankImportSummary | null>(null);
  const [commitSummary, setCommitSummary] = useState<BankImportCommitSummary | null>(null);
  const [importHistory, setImportHistory] = useState<BankImportHistoryItem[]>([]);
  const [lastImportedBankDay, setLastImportedBankDay] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<ImportFormat | null>(null);
  const [detectedStatementIban, setDetectedStatementIban] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [pendingApprovalRow, setPendingApprovalRow] = useState<number | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const [draftableOutgoing, setDraftableOutgoing] = useState<DraftableOutgoingItem[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isCreatingDrafts, setIsCreatingDrafts] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const historyRequestRef = useRef(0);

  const stage: ImportStage = commitSummary ? 'committed' : job ? 'parsed' : 'start';

  const loadImportHistory = useCallback(async (accountId: string) => {
    if (!accountId) return;
    const requestId = ++historyRequestRef.current;
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const result = await bankingApi.listImportJobs({ bank_account_id: accountId, limit: 8 });
      if (requestId !== historyRequestRef.current) return;
      setImportHistory(result.items);
      setLastImportedBankDay(result.last_imported_bank_day);
    } catch (error) {
      if (requestId !== historyRequestRef.current) return;
      setHistoryError(getErrorMessage(error));
    } finally {
      if (requestId === historyRequestRef.current) setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const items = await bankingApi.listBankAccounts();
        const activeItems = items.filter((item) => item.is_active);
        setBankAccounts(activeItems);
        setBankAccountId((current) => current || activeItems[0]?.id || '');
      } catch {
        // File selection remains available; the inline CSV validation explains a missing account.
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (bankAccountId) void loadImportHistory(bankAccountId);
  }, [bankAccountId, loadImportHistory]);

  const applyResolvedBankAccount = (resolvedAccountId?: string | null) => {
    if (!resolvedAccountId || resolvedAccountId === bankAccountId) return;
    historyRequestRef.current += 1;
    setBankAccountId(resolvedAccountId);
    setImportHistory([]);
    setLastImportedBankDay(null);
    setHistoryError(null);
  };

  const counts = useMemo(() => {
    const review = previewRows.filter((row) => row.needs_review).length;
    const duplicate = previewRows.filter((row) => !row.needs_review && isDuplicateRow(row)).length;
    const ready = previewRows.filter((row) => !row.needs_review && !isDuplicateRow(row)).length;
    return {
      total: previewRows.length,
      ready,
      review,
      duplicate,
      reviewable: previewRows.filter((row) => row.needs_review && row.can_approve).length,
      manuallyApproved: previewRows.filter((row) => row.manually_approved).length,
    };
  }, [previewRows]);

  const filteredRows = useMemo(() => previewRows.filter((row) => {
    if (rowFilter === 'review') return row.needs_review;
    if (rowFilter === 'ready') return !row.needs_review && !isDuplicateRow(row);
    return true;
  }), [previewRows, rowFilter]);

  useEffect(() => {
    const cells: BankInlineSummaryData['cells'] = stage === 'start'
      ? [
          { label: t('lastBankDay'), value: formatBankDay(lastImportedBankDay, locale) },
          { label: t('pendingInReview'), value: '—' },
        ]
      : stage === 'parsed'
        ? [
            { label: t('previewRows'), value: counts.total },
            { label: t('ready'), value: counts.ready, color: 'var(--pos, #0e7b5a)' },
            { label: t('needsReview'), value: counts.review, color: counts.review > 0 ? 'var(--warning)' : undefined },
          ]
        : [
            { label: t('importedRows'), value: counts.ready },
            { label: t('duplicateCount'), value: commitSummary?.skipped_duplicate_count ?? 0 },
            { label: t('pendingInReview'), value: commitSummary?.imported_count ?? 0 },
          ];
    onSummaryChange?.({ cells });
  }, [commitSummary, counts, lastImportedBankDay, locale, onSummaryChange, stage, t]);

  useEffect(() => {
    onReviewCountChange?.(stage === 'parsed' ? counts.review : 0);
  }, [counts.review, onReviewCountChange, stage]);

  const startImport = async (nextFile: File) => {
    const fileContent = await nextFile.text();
    const sourceType = detectImportFormat(nextFile, fileContent);
    const statementIban = sourceType === 'camt53' ? detectStatementIban(fileContent) : null;
    setFile(nextFile);
    setDetectedFormat(sourceType);
    setDetectedStatementIban(statementIban);

    if (sourceType === 'csv' && !bankAccountId.trim()) {
      setErrorMessage(t('bankAccountSelectionRequiredBeforeCsv'));
      setPendingMessage(t('fileReadyAddBankAccount', { file: nextFile.name }));
      return;
    }

    setIsCreating(true);
    setIsParsing(true);
    setErrorMessage(null);
    setPendingMessage(null);
    setCommitSummary(null);
    try {
      const created = await bankingApi.createImportJob({
        file_name: nextFile.name,
        file_size: nextFile.size,
        file_content: fileContent,
        source_type: sourceType,
        bank_account_id: bankAccountId.trim() || undefined,
      });
      const parsed = await bankingApi.parseImportJob(created.job.id);
      applyResolvedBankAccount(parsed.summary.bank_account_id);
      setJob(parsed.job);
      setPreviewRows(parsed.preview_rows);
      setSummary(parsed.summary);
      showToast.success(t('bankFileUploadedParsed', { file: nextFile.name, format: sourceType.toUpperCase() }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
      setIsParsing(false);
    }
  };

  const handleFileSelected = async (nextFile: File | null) => {
    if (nextFile) await startImport(nextFile);
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFileSelected(event.dataTransfer.files?.[0] || null);
  };

  const handleParse = async () => {
    if (!job) return;
    setIsParsing(true);
    setErrorMessage(null);
    try {
      const result = await bankingApi.parseImportJob(job.id);
      applyResolvedBankAccount(result.summary.bank_account_id);
      setJob(result.job);
      setPreviewRows(result.preview_rows);
      setSummary(result.summary);
      showToast.success(t('statementParsedIntoPreviewRows'));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsParsing(false);
    }
  };

  const handleBankAccountIdChange = (value: string) => {
    historyRequestRef.current += 1;
    setBankAccountId(value);
    setImportHistory([]);
    setLastImportedBankDay(null);
    setHistoryError(null);
    if (pendingMessage && value.trim()) setPendingMessage(t('bankAccountIdFilledReupload'));
  };

  const applyApprovalResult = (result: { job: BankImportJob; preview_rows: BankImportPreviewRow[]; summary: BankImportSummary }) => {
    applyResolvedBankAccount(result.summary.bank_account_id);
    setJob(result.job);
    setPreviewRows(result.preview_rows);
    setSummary(result.summary);
  };

  const handleRowApproval = async (rowNo: number, isApproved: boolean) => {
    if (!job) return;
    setPendingApprovalRow(rowNo);
    setErrorMessage(null);
    try {
      const result = await bankingApi.setImportRowApproval(job.id, [{ row_no: rowNo, is_approved: isApproved }]);
      applyApprovalResult(result);
      showToast.success(isApproved ? t('rowApproved', { row: rowNo }) : t('rowApprovalReverted', { row: rowNo }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingApprovalRow(null);
    }
  };

  const handleApproveAllReviewable = async () => {
    if (!job) return;
    const updates = previewRows
      .filter((row) => row.needs_review && row.can_approve)
      .map((row) => ({ row_no: row.row_no, is_approved: true }));
    if (updates.length === 0) return;

    setIsBulkApproving(true);
    setErrorMessage(null);
    try {
      const result = await bankingApi.setImportRowApproval(job.id, updates);
      applyApprovalResult(result);
      showToast.success(t('reviewableRowsApproved', { count: updates.length }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsBulkApproving(false);
    }
  };

  const loadDraftableOutgoing = async (importJobId: string) => {
    setIsLoadingDrafts(true);
    setDraftError(null);
    try {
      const result = await bankingApi.listDraftableOutgoing(importJobId);
      setDraftableOutgoing(result.items);
      setSelectedDraftIds(new Set(result.items.filter((item) => !item.excluded).map((item) => item.transaction_id)));
    } catch (error) {
      setDraftError(getErrorMessage(error));
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleCommit = async () => {
    if (!job) return;
    setIsCommitting(true);
    setErrorMessage(null);
    try {
      const result = await bankingApi.commitImportJob(job.id);
      setJob(result.job);
      setCommitSummary(result.summary);
      showToast.success(t('approvedBankRowsImported'));
      await Promise.all([
        loadDraftableOutgoing(result.job.id),
        loadImportHistory(bankAccountId),
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreateDrafts = async () => {
    const ids = [...selectedDraftIds];
    if (ids.length === 0) return;
    setIsCreatingDrafts(true);
    setDraftError(null);
    try {
      const result = await bankingApi.bulkMarkMissingReceipt(ids);
      showToast.success(t('draftsCreatedSummary', { created: result.created.length, skipped: result.skipped }));
      setDraftableOutgoing((current) => current.filter((item) => !ids.includes(item.transaction_id)));
      setSelectedDraftIds(new Set());
    } catch (error) {
      setDraftError(getErrorMessage(error));
    } finally {
      setIsCreatingDrafts(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setJob(null);
    setPreviewRows([]);
    setSummary(null);
    setCommitSummary(null);
    setErrorMessage(null);
    setPendingMessage(null);
    setDetectedFormat(null);
    setDetectedStatementIban(null);
    setDraftableOutgoing([]);
    setSelectedDraftIds(new Set());
    setDraftError(null);
    setRowFilter('all');
  };

  const selectedAccount = bankAccounts.find((account) => account.id === bankAccountId);
  const importedCount = counts.ready;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <ImportSteps stage={stage} />

      {stage === 'start' && (
        <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-[1.35fr_1fr]">
        <section className="card flex min-h-0 flex-col overflow-hidden">
          <label
            onDrop={handleDrop}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
            className={`m-4 flex min-h-[260px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition ${
              isDragging ? 'border-[var(--primary)] bg-orange-50' : 'border-slate-300 bg-white hover:bg-slate-50'
            }`}
          >
            {isCreating ? <Loader2 className="h-9 w-9 animate-spin text-[var(--primary)]" /> : <Upload className="h-9 w-9 text-slate-400" />}
            <h2 className="mt-4 text-base font-semibold text-slate-900">{t('dropStatementHere')}</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">{t('bankImportStepDesc1')}</p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">CSV</span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">CAMT.053 XML</span>
            </div>
            <span className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]">
              <FileUp className="h-4 w-4" />
              {isCreating ? t('uploading') : t('chooseFileFromComputer')}
            </span>
            <input type="file" accept=".csv,.xml,text/csv,text/xml,application/xml" disabled={isCreating} onChange={(event) => void handleFileSelected(event.target.files?.[0] || null)} className="sr-only" />
            {file && <span className="mt-3 text-xs text-slate-500">{t('currentFile', { file: file.name })}</span>}
          </label>

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <label className="flex items-center gap-3">
                <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{t('bankAccount')}</span>
                <select value={bankAccountId} onChange={(event) => handleBankAccountIdChange(event.target.value)} className="h-9 min-w-[250px] rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="">{detectedFormat === 'csv' ? t('selectBankAccount') : t('optionalFallbackCamt53')}</option>
                  {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} {account.iban ? `· ${account.iban}` : ''}</option>)}
                </select>
              </label>
              <p className="text-xs text-slate-500">{t('bankAccountImportHelp')}</p>
              {detectedFormat === 'camt53' && <span className="font-mono text-xs font-medium text-slate-700">IBAN: {detectedStatementIban || t('notDetectedYet')}</span>}
            </div>
            {(errorMessage || pendingMessage) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-700">{errorMessage}</span>
                {pendingMessage && <span className="text-amber-700">{pendingMessage}</span>}
                {file && (
                  <button onClick={() => void startImport(file)} disabled={isCreating} className="font-semibold text-[var(--primary)] hover:underline disabled:opacity-50">
                    {t('tryAgain')}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="card flex min-h-[240px] flex-col overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">{t('previousImports')}</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">{t('previousImportsBankDays')}</p>
          </div>
          <InlineError message={historyError} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoadingHistory ? (
              <div className="flex h-full min-h-[160px] items-center justify-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('loading')}</div>
            ) : importHistory.length === 0 ? (
              <div className="flex h-full min-h-[160px] items-center justify-center px-6 text-center text-xs text-slate-500">{t('noPreviousImports')}</div>
            ) : importHistory.map((item) => (
              <div key={item.id} className="border-b border-slate-100 px-4 py-2.5 last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-slate-900" title={item.file_name || undefined}>{item.file_name || t('statementFile')}</div>
                    <div className="mt-1 font-mono text-[10.5px] tabular-nums text-slate-500">
                      {item.statement_date_from && item.statement_date_to
                        ? `${formatBankDay(item.statement_date_from, locale)} – ${formatBankDay(item.statement_date_to, locale)}`
                        : t('bankDayUnavailable')}
                    </div>
                    <div className="mt-1 text-[10.5px] text-slate-500">{t('importHistoryCounts', { rows: item.parsed_row_count, duplicates: item.skipped_duplicate_count })}</div>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.status === 'imported' ? 'bg-emerald-50 text-emerald-700' : item.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.status === 'imported' ? t('importedCountShort', { count: item.imported_count }) : item.status === 'failed' ? t('importFailed') : formatLabel(item.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        </div>
      )}

      {stage === 'parsed' && job && (
        <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            <section className="card overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">{t('currentJob')}</h2></div>
              <div className="px-4 py-3">
                <KeyValue label={t('fileLabel')} value={job.file_name || file?.name || '—'} />
                <KeyValue label={t('format')} value={(job.source_type || detectedFormat || '—').toUpperCase()} />
                <KeyValue label={t('bankAccount')} value={selectedAccount?.name || '—'} />
                <KeyValue label={t('statementIban')} value={summary?.detected_statement_iban || detectedStatementIban || selectedAccount?.iban || '—'} />
                <KeyValue label={t('statementPeriod')} value={`${summary?.statement_date_from || '…'} – ${summary?.statement_date_to || '…'}`} />
                <div className="my-2 border-t border-slate-200" />
                <KeyValue label={t('parsedRows')} value={counts.total} />
                <KeyValue label={t('ready')} value={counts.ready} />
                <KeyValue label={t('needsReview')} value={counts.review} />
                <KeyValue label={t('duplicateCount')} value={counts.duplicate} />
              </div>
              <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-2">
                <button onClick={() => void handleParse()} disabled={isParsing || isCreating} className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}{t('parseAgain')}
                </button>
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">{t('checksTitle')}</h2></div>
              <div className="space-y-2 p-3">
                {summary?.statement_period_warning?.kind === 'overlap' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">{t('statementPeriodOverlapWarning', { from: summary.statement_period_warning.from || '…', to: summary.statement_period_warning.to || '…' })}</div>
                )}
                {summary?.statement_period_warning?.kind === 'gap' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">{t('statementPeriodGapWarning', { previousTo: summary.statement_period_warning.previous_to, from: summary.statement_period_warning.from, days: summary.statement_period_warning.missing_days })}</div>
                )}
                {!summary?.statement_period_warning && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{t('statementPeriodOk')}</div>}
                {summary?.balance_check_ok === true && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{t('balanceCheckOk')}</div>}
              </div>
            </section>
          </aside>

          <section className="card flex min-h-0 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
              <h2 className="mr-2 text-sm font-semibold text-slate-900">{t('previewRows')}</h2>
              {([
                ['all', t('filterAll'), counts.total],
                ['review', t('needsReview'), counts.review],
                ['ready', t('ready'), counts.ready],
              ] as const).map(([id, label, count]) => (
                <button key={id} onClick={() => setRowFilter(id)} className={`h-7 rounded-full border px-2.5 text-xs font-medium ${rowFilter === id ? 'border-[var(--primary)] bg-orange-50 text-[var(--primary)]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label} <span className="font-mono tabular-nums">{count}</span></button>
              ))}
              <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={showReference} onChange={(event) => setShowReference(event.target.checked)} className="h-4 w-4" />{t('showReference')}
              </label>
              {counts.reviewable > 0 && (
                <button onClick={() => void handleApproveAllReviewable()} disabled={isBulkApproving || pendingApprovalRow !== null} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                  {isBulkApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}{t('approveAllReviewable', { count: counts.reviewable })}
                </button>
              )}
            </div>
            <InlineError message={errorMessage} />

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full table-fixed">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                  <tr>
                    <th className="w-12 px-2 py-2 text-left text-[11px] font-semibold text-slate-500">{t('row')}</th>
                    <th className="w-24 px-2 py-2 text-left text-[11px] font-semibold text-slate-500">{t('date')}</th>
                    <th className="w-[20%] px-2 py-2 text-left text-[11px] font-semibold text-slate-500">{t('counterparty')}</th>
                    <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500">{t('txDescription')}</th>
                    {showReference && <th className="w-[14%] px-2 py-2 text-left text-[11px] font-semibold text-slate-500">{t('reference')}</th>}
                    <th className="w-32 px-2 py-2 text-right text-[11px] font-semibold text-slate-500">{t('amount')}</th>
                    <th className="w-48 px-2 py-2 text-left text-[11px] font-semibold text-slate-500">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const duplicate = !row.needs_review && isDuplicateRow(row);
                    return (
                      <tr key={row.external_id} className={`border-b border-slate-100 align-top ${row.needs_review ? 'bg-amber-50' : index % 2 ? 'bg-slate-50/50' : 'bg-white'}`}>
                        <td className="px-2 py-1.5 font-mono text-xs tabular-nums text-slate-600">{row.row_no}</td>
                        <td className="px-2 py-1.5 font-mono text-xs tabular-nums text-slate-700">{row.tx_date || row.value_date || '—'}</td>
                        <td className="px-2 py-1.5"><div className="truncate text-xs font-medium text-slate-900">{row.counterparty_name || t('unknownCounterparty')}</div>{row.parsed_payload?.counterparty_source === 'card_descriptor' && <div className="truncate text-[10px] text-slate-500">{t('derivedFromCardDescriptor')}</div>}{row.counterparty_account && <div className="truncate font-mono text-[10px] text-slate-500">{row.counterparty_account}</div>}</td>
                        <td className="px-2 py-1.5 text-xs text-slate-600"><div className="line-clamp-2">{row.description || '—'}</div></td>
                        {showReference && <td className="px-2 py-1.5 font-mono text-xs text-slate-600"><div className="truncate">{row.reference || '—'}</div></td>}
                        <td className={`px-2 py-1.5 text-right font-mono text-xs font-semibold tabular-nums ${row.amount > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{row.amount.toFixed(2)} {row.currency}</td>
                        <td className="px-2 py-1.5">
                          {row.needs_review ? (
                            <div className="space-y-1">
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{t('needsReview')}</span>
                              {row.warning_flags.length > 0 && <div className="text-[10px] leading-4 text-amber-800">{row.warning_flags.map(formatLabel).join(', ')}</div>}
                              {row.can_approve ? <button onClick={() => void handleRowApproval(row.row_no, true)} disabled={pendingApprovalRow === row.row_no || isBulkApproving} className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline disabled:opacity-50">{pendingApprovalRow === row.row_no ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}{t('approveAnywayShort')}</button> : <div className="text-[10px] font-medium text-red-600">{t('cannotApproveRow')}</div>}
                            </div>
                          ) : duplicate ? (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{t('duplicateSkipped')}</span>
                          ) : row.manually_approved ? (
                            <div className="space-y-1"><span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{t('manuallyApproved')}</span><button onClick={() => void handleRowApproval(row.row_no, false)} disabled={pendingApprovalRow === row.row_no || isBulkApproving} className="flex items-center gap-1 text-[10px] text-slate-500 hover:underline"><ShieldAlert className="h-3 w-3" />{t('undoApproval')}</button></div>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{t('ready')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-3 py-2">
              <div className="text-xs text-slate-500"><strong className="font-mono text-slate-800">{counts.ready}</strong> {t('rowsReady')} · <strong className="font-mono text-slate-800">{counts.review}</strong> {t('needsReview').toLowerCase()} · <strong className="font-mono text-slate-800">{counts.duplicate}</strong> {t('duplicatesWillBeSkipped')}</div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={resetImport} className="h-8 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">{t('cancelImport')}</button>
                <button onClick={() => void handleCommit()} disabled={isCommitting || counts.ready === 0} className="inline-flex h-8 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">{isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{t('commitAndSendToReview', { count: counts.ready })}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {stage === 'committed' && job && commitSummary && (
        <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="card flex flex-col overflow-hidden">
            <div className="flex items-start gap-3 border-b border-emerald-200 bg-emerald-50 p-5">
              <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-600" />
              <div><h2 className="text-base font-semibold text-emerald-900">{t('rowsImportedAndSent', { count: importedCount })}</h2><p className="mt-1 text-xs text-emerald-700">{t('bankImportStepDesc3')}</p></div>
            </div>
            <div className="p-5">
              <KeyValue label={t('fileLabel')} value={job.file_name || file?.name || '—'} />
              <KeyValue label={t('importedRows')} value={importedCount} />
              <KeyValue label={t('skippedDuplicates')} value={commitSummary.skipped_duplicate_count ?? counts.duplicate} />
              <KeyValue label={t('manuallyApproved')} value={counts.manuallyApproved} />
            </div>
            <InlineError message={errorMessage} />
            <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 p-4">
              <button onClick={() => onCommitted(commitSummary.draft_transaction_ids || [])} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"><CheckCircle2 className="h-4 w-4" />{t('openReview', { count: importedCount })}</button>
              <button onClick={resetImport} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"><FileUp className="h-4 w-4" />{t('importNext')}</button>
            </div>
          </section>

          <section className="card flex min-h-[300px] flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <FileQuestion className="h-5 w-5 text-slate-400" />
              <div><h2 className="text-sm font-semibold text-slate-900">{t('draftFromOutgoingTitle')}</h2><p className="text-[11px] text-slate-500">{t('optionalNextStep')}</p></div>
              <button onClick={() => { setDraftableOutgoing([]); setSelectedDraftIds(new Set()); }} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-800">{t('skip')}</button>
            </div>
            <InlineError message={draftError} />
            <div className="min-h-0 flex-1 overflow-auto">
              {isLoadingDrafts ? <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('loading')}</div> : draftableOutgoing.length === 0 ? <div className="p-6 text-sm text-slate-500">{t('noDraftableOutgoing')}</div> : draftableOutgoing.map((item) => (
                <label key={item.transaction_id} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-2.5 hover:bg-slate-50">
                  <input type="checkbox" checked={selectedDraftIds.has(item.transaction_id)} disabled={item.excluded} onChange={() => setSelectedDraftIds((current) => { const next = new Set(current); if (next.has(item.transaction_id)) next.delete(item.transaction_id); else next.add(item.transaction_id); return next; })} className="mt-1 h-4 w-4" />
                  <div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><span className="truncate text-xs font-medium text-slate-900">{item.counterparty_name || t('unknownCounterparty')}</span><span className="ml-auto whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-slate-900">{Math.abs(item.amount).toFixed(2)} {item.currency}</span></div><div className="mt-0.5 flex gap-2 text-[10px] text-slate-500"><span className="font-mono">{item.tx_date}</span><span className="truncate">{item.description || item.reference || '—'}</span>{item.excluded && <span className="ml-auto text-amber-700">{t('excludedByRule', { rule: item.excluded_by || '—' })}</span>}</div></div>
                </label>
              ))}
            </div>
            {draftableOutgoing.length > 0 && <div className="flex justify-end border-t border-slate-200 bg-white px-4 py-2"><button onClick={() => void handleCreateDrafts()} disabled={selectedDraftIds.size === 0 || isCreatingDrafts} className="inline-flex h-8 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white disabled:opacity-50">{isCreatingDrafts && <Loader2 className="h-4 w-4 animate-spin" />}{t('createDraftsButton', { count: selectedDraftIds.size })}</button></div>}
          </section>
        </div>
      )}
    </div>
  );
}
