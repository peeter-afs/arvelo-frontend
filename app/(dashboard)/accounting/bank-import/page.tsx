'use client';

import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  TableProperties,
  Upload,
} from 'lucide-react';
import { bankingApi, type BankAccountRecord, type BankImportJob, type BankImportPreviewRow } from '@/lib/api/banking.api';
import { getErrorMessage } from '@/lib/api/client';

type ImportFormat = 'csv' | 'camt53';

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
  const normalized = match[1].replace(/\s+/g, '').toUpperCase();
  return normalized || null;
}

export default function BankImportPage() {
  const t = useTranslations('accounting');
  const [file, setFile] = useState<File | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [job, setJob] = useState<BankImportJob | null>(null);
  const [previewRows, setPreviewRows] = useState<BankImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [commitSummary, setCommitSummary] = useState<Record<string, any> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<ImportFormat | null>(null);
  const [detectedStatementIban, setDetectedStatementIban] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [pendingApprovalRow, setPendingApprovalRow] = useState<number | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const items = await bankingApi.listBankAccounts();
        const activeItems = items.filter((item) => item.is_active);
        setBankAccounts(activeItems);
        setBankAccountId((current) => current || activeItems[0]?.id || '');
      } catch {
        // Keep the screen usable even if bank-account loading fails.
      }
    };

    void load();
  }, []);

  const counts = useMemo(() => {
    return {
      total: previewRows.length,
      approved: previewRows.filter((row) => row.is_approved && !row.needs_review).length,
      review: previewRows.filter((row) => row.needs_review).length,
      reviewable: previewRows.filter((row) => row.needs_review && row.can_approve).length,
    };
  }, [previewRows]);

  const startImport = async (nextFile: File) => {
    const fileContent = await nextFile.text();
    const sourceType = detectImportFormat(nextFile, fileContent);
    const statementIban = sourceType === 'camt53' ? detectStatementIban(fileContent) : null;

    setDetectedFormat(sourceType);
    setDetectedStatementIban(statementIban);

    if (sourceType === 'csv' && !bankAccountId.trim()) {
      setFile(nextFile);
      setErrorMessage(t('bankAccountSelectionRequiredBeforeCsv'));
      setSuccessMessage(null);
      setPendingMessage(t('fileReadyAddBankAccount', { file: nextFile.name }));
      return;
    }

    setIsCreating(true);
    setIsParsing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingMessage(null);
    setCommitSummary(null);

    try {
      setFile(nextFile);
      const created = await bankingApi.createImportJob({
        file_name: nextFile.name,
        file_size: nextFile.size,
        file_content: fileContent,
        source_type: sourceType,
        bank_account_id: bankAccountId.trim() || undefined,
      });
      const parsed = await bankingApi.parseImportJob(created.job.id);

      setJob(parsed.job);
      setPreviewRows(parsed.preview_rows);
      setSummary(parsed.summary);
      setSuccessMessage(t('bankFileUploadedParsed', { file: nextFile.name, format: sourceType.toUpperCase() }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
      setIsParsing(false);
    }
  };

  const handleFileSelected = async (nextFile: File | null) => {
    if (!nextFile) return;
    await startImport(nextFile);
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const nextFile = event.dataTransfer.files?.[0] || null;
    await handleFileSelected(nextFile);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleParse = async () => {
    if (!job) return;

    setIsParsing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingMessage(null);
    setCommitSummary(null);

    try {
      const result = await bankingApi.parseImportJob(job.id);
      setJob(result.job);
      setPreviewRows(result.preview_rows);
      setSummary(result.summary);
      setSuccessMessage(t('statementParsedIntoPreviewRows'));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsParsing(false);
    }
  };

  const handleRetryCurrentFile = async () => {
    if (!file) return;
    await startImport(file);
  };

  const handleBankAccountIdChange = (value: string) => {
    setBankAccountId(value);
    if (pendingMessage && value.trim()) {
      setPendingMessage(t('bankAccountIdFilledReupload'));
    }
  };

  const applyApprovalResult = (result: { job: BankImportJob; preview_rows: BankImportPreviewRow[]; summary: Record<string, any> }) => {
    setJob(result.job);
    setPreviewRows(result.preview_rows);
    setSummary(result.summary);
    setCommitSummary(null);
  };

  const handleRowApproval = async (rowNo: number, isApproved: boolean) => {
    if (!job) return;

    setPendingApprovalRow(rowNo);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingMessage(null);

    try {
      const result = await bankingApi.setImportRowApproval(job.id, [{ row_no: rowNo, is_approved: isApproved }]);
      applyApprovalResult(result);
      setSuccessMessage(isApproved ? t('rowApproved', { row: rowNo }) : t('rowApprovalReverted', { row: rowNo }));
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
    setSuccessMessage(null);
    setPendingMessage(null);

    try {
      const result = await bankingApi.setImportRowApproval(job.id, updates);
      applyApprovalResult(result);
      setSuccessMessage(t('reviewableRowsApproved', { count: updates.length }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleCommit = async () => {
    if (!job) return;

    setIsCommitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingMessage(null);

    try {
      const result = await bankingApi.commitImportJob(job.id);
      setJob(result.job);
      setCommitSummary(result.summary);
      setSuccessMessage(t('approvedBankRowsImported'));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('bankImport')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {t('bankImportDescription')}
        </p>
      </div>

      {errorMessage && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="card border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {pendingMessage && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{pendingMessage}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{t('uploadBankFile')}</div>
                <div className="text-xs text-slate-500">{t('uploadBankFileDescription')}</div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('bankAccount')}</span>
                <select
                  value={bankAccountId}
                  onChange={(event) => handleBankAccountIdChange(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3"
                >
                  <option value="">{detectedFormat === 'csv' ? t('selectBankAccount') : t('optionalFallbackCamt53')}</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} {account.iban ? `· ${account.iban}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {detectedFormat === 'camt53' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-900">{t('detectedStatementIban')}:</span>{' '}
                    {detectedStatementIban || t('notDetectedYet')}
                  </div>
                  <div>
                    {t('camtIbanInstruction')}
                  </div>
                </div>
              )}

              <label
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`block rounded-xl border border-dashed p-5 text-sm transition ${
                  isDragging
                    ? 'border-[var(--primary)] bg-orange-50 text-slate-700'
                    : 'border-slate-300 bg-slate-50 text-slate-600'
                }`}
              >
                <span className="mb-2 block font-medium text-slate-700">{t('statementFile')}</span>
                <span className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                  <Upload className="h-4 w-4" />
                  {t('dragDropBankFile')}
                </span>
                <input
                  type="file"
                  accept=".csv,.xml,text/csv,text/xml,application/xml"
                  onChange={(event) => void handleFileSelected(event.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500"
                />
                {file && <span className="mt-3 block text-xs text-slate-500">{t('currentFile', { file: file.name })}</span>}
              </label>

              <button
                onClick={handleRetryCurrentFile}
                disabled={!file || !bankAccountId.trim() || isCreating}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                <span>{isCreating ? t('uploading') : t('uploadCurrentFileAgain')}</span>
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">{t('workflow')}</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              <li>{t('bankImportStep1')}</li>
              <li>{t('bankImportStep2')}</li>
              <li>{t('bankImportStep3')}</li>
            </ol>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
              {t('bankImportApprovalNote')}
            </div>
          </div>

          {job && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900">{t('currentJob')}</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div><span className="font-medium text-slate-900">{t('fileLabel')}:</span> {job.file_name}</div>
                <div><span className="font-medium text-slate-900">{t('status')}:</span> {job.status}</div>
                <div><span className="font-medium text-slate-900">{t('format')}:</span> {job.source_type || t('autoDetected')}</div>
                {summary?.detected_statement_iban && (
                  <div><span className="font-medium text-slate-900">{t('statementIban')}:</span> {String(summary.detected_statement_iban)}</div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleParse}
                  disabled={isParsing || isCreating}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TableProperties className="h-4 w-4" />}
                  <span>{t('parse')}</span>
                </button>
                <button
                  onClick={handleCommit}
                  disabled={isCommitting || counts.approved === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{t('commitApprovedRows')}</span>
                </button>
              </div>
            </div>
          )}
        </aside>

        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label={t('previewRows')} value={counts.total} icon={TableProperties} tone="neutral" />
            <SummaryCard label={t('approved')} value={counts.approved} icon={ShieldCheck} tone="success" />
            <SummaryCard label={t('needsReview')} value={counts.review} icon={ShieldAlert} tone="warning" />
          </div>

          {(summary || commitSummary) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {summary && (
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-slate-900">{t('parseSummary')}</h2>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>{t('sourceType')}: {summary.source_type}</div>
                    <div>{t('parsedRows')}: {summary.parsed_row_count}</div>
                    <div>{t('approvedRows')}: {summary.approved_row_count}</div>
                    <div>{t('reviewRows')}: {summary.review_row_count}</div>
                    {(summary.statement_date_from || summary.statement_date_to) && (
                      <div>
                        {t('statementPeriod')}: {summary.statement_date_from || '…'} – {summary.statement_date_to || '…'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {commitSummary && (
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-slate-900">{t('commitSummary')}</h2>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>{t('importedRows')}: {commitSummary.imported_count}</div>
                    <div>{t('skippedDuplicates')}: {commitSummary.skipped_duplicate_count}</div>
                    <div>{t('approvedRowsSent')}: {commitSummary.approved_row_count}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{t('previewRows')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('previewRowsDescription')}
                </p>
              </div>
              {counts.reviewable > 0 && (
                <button
                  onClick={handleApproveAllReviewable}
                  disabled={isBulkApproving || pendingApprovalRow !== null}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBulkApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>{t('approveAllReviewable', { count: counts.reviewable })}</span>
                </button>
              )}
            </div>

            {previewRows.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">{t('parseJobToInspect')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('row')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('date')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('counterparty')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('reference')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">{t('amount')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {previewRows.map((row) => (
                      <tr key={row.external_id} className="border-b border-slate-100 align-top">
                        <td className="px-4 py-4 text-sm text-slate-700">{row.row_no}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{row.tx_date || row.value_date || '-'}</td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-slate-900">{row.counterparty_name || t('unknownCounterparty')}</div>
                          <div className="mt-1 text-xs text-slate-500">{row.description || row.counterparty_account || ''}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{row.reference || '-'}</td>
                        <td className="px-4 py-4 text-right text-sm font-mono text-slate-900">
                          {row.amount.toFixed(2)} {row.currency}
                        </td>
                        <td className="px-4 py-4">
                          {row.needs_review ? (
                            <div className="space-y-2">
                              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                {t('needsReview')}
                              </span>
                              <div className="text-xs text-amber-800">
                                {row.warning_flags.map(formatLabel).join(', ')}
                              </div>
                              {row.can_approve ? (
                                <button
                                  onClick={() => void handleRowApproval(row.row_no, true)}
                                  disabled={pendingApprovalRow === row.row_no || isBulkApproving}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {pendingApprovalRow === row.row_no ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  )}
                                  <span>{t('approveAnyway')}</span>
                                </button>
                              ) : (
                                <div className="text-[11px] font-medium text-red-600">{t('cannotApproveRow')}</div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                {t('approved')}
                              </span>
                              {row.manually_approved && (
                                <>
                                  <div className="text-[11px] font-medium text-emerald-700">{t('manuallyApproved')}</div>
                                  {row.warning_flags.length > 0 && (
                                    <div className="text-xs text-amber-800">
                                      {row.warning_flags.map(formatLabel).join(', ')}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => void handleRowApproval(row.row_no, false)}
                                    disabled={pendingApprovalRow === row.row_no || isBulkApproving}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {pendingApprovalRow === row.row_no ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <ShieldAlert className="h-3.5 w-3.5" />
                                    )}
                                    <span>{t('undoApproval')}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'neutral' | 'success' | 'warning';
}) {
  const iconClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-600'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-slate-100 text-slate-700';

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
