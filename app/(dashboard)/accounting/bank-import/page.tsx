'use client';

import { useMemo, useState } from 'react';
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
import { bankingApi, type BankImportJob, type BankImportPreviewRow } from '@/lib/api/banking.api';
import { getErrorMessage } from '@/lib/api/client';

type ImportFormat = 'csv' | 'camt53';

export default function BankImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [bankAccountId, setBankAccountId] = useState('');
  const [sourceType, setSourceType] = useState<ImportFormat>('csv');
  const [job, setJob] = useState<BankImportJob | null>(null);
  const [previewRows, setPreviewRows] = useState<BankImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [commitSummary, setCommitSummary] = useState<Record<string, any> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const counts = useMemo(() => {
    return {
      total: previewRows.length,
      approved: previewRows.filter((row) => row.is_approved && !row.needs_review).length,
      review: previewRows.filter((row) => row.needs_review).length,
    };
  }, [previewRows]);

  const handleCreateJob = async () => {
    if (!file) return;

    setIsCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCommitSummary(null);

    try {
      const fileContent = await file.text();
      const result = await bankingApi.createImportJob({
        file_name: file.name,
        file_size: file.size,
        file_content: fileContent,
        source_type: sourceType,
        bank_account_id: bankAccountId.trim(),
      });
      setJob(result.job);
      setPreviewRows([]);
      setSummary(null);
      setSuccessMessage(`Import job created for ${file.name}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleParse = async () => {
    if (!job) return;

    setIsParsing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCommitSummary(null);

    try {
      const result = await bankingApi.parseImportJob(job.id);
      setJob(result.job);
      setPreviewRows(result.preview_rows);
      setSummary(result.summary);
      setSuccessMessage('Statement parsed into preview rows.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!job) return;

    setIsCommitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await bankingApi.commitImportJob(job.id);
      setJob(result.job);
      setCommitSummary(result.summary);
      setSuccessMessage('Approved bank rows imported into banking transactions.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Bank Import</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Upload a bank statement, parse preview rows, inspect duplicate and validation warnings, and commit only the
          rows the backend currently marks safe. Parsing does not create accounting entries.
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

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Create import job</div>
                <div className="text-xs text-slate-500">CSV and CAMT.053 XML are supported</div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Format</span>
                <select
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value as ImportFormat)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3"
                >
                  <option value="csv">CSV</option>
                  <option value="camt53">CAMT.053 XML</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bank account id</span>
                <input
                  value={bankAccountId}
                  onChange={(event) => setBankAccountId(event.target.value)}
                  placeholder="UUID from banking.bank_accounts"
                  className="h-11 w-full rounded-lg border border-slate-200 px-3"
                />
              </label>

              <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                <span className="mb-2 block font-medium text-slate-700">Statement file</span>
                <input
                  type="file"
                  accept={sourceType === 'csv' ? '.csv,text/csv' : '.xml,text/xml,application/xml'}
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500"
                />
              </label>

              <button
                onClick={handleCreateJob}
                disabled={!file || !bankAccountId.trim() || isCreating}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                <span>{isCreating ? 'Creating…' : 'Create job'}</span>
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Workflow</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              <li>1. Create import job with raw file content and bank account id.</li>
              <li>2. Parse preview rows and inspect warnings.</li>
              <li>3. Commit only rows already approved by backend rules.</li>
            </ol>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
              Per-row approval editing is not exposed by the backend yet. Rows with warnings stay review-only in this UI.
            </div>
          </div>

          {job && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900">Current job</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div><span className="font-medium text-slate-900">File:</span> {job.file_name}</div>
                <div><span className="font-medium text-slate-900">Status:</span> {job.status}</div>
                <div><span className="font-medium text-slate-900">Format:</span> {job.source_type || sourceType}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleParse}
                  disabled={isParsing || isCreating}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TableProperties className="h-4 w-4" />}
                  <span>Parse</span>
                </button>
                <button
                  onClick={handleCommit}
                  disabled={isCommitting || counts.approved === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Commit approved rows</span>
                </button>
              </div>
            </div>
          )}
        </aside>

        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Preview rows" value={counts.total} icon={TableProperties} tone="neutral" />
            <SummaryCard label="Approved" value={counts.approved} icon={ShieldCheck} tone="success" />
            <SummaryCard label="Needs review" value={counts.review} icon={ShieldAlert} tone="warning" />
          </div>

          {(summary || commitSummary) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {summary && (
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-slate-900">Parse summary</h2>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Source type: {summary.source_type}</div>
                    <div>Parsed rows: {summary.parsed_row_count}</div>
                    <div>Approved rows: {summary.approved_row_count}</div>
                    <div>Review rows: {summary.review_row_count}</div>
                  </div>
                </div>
              )}
              {commitSummary && (
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-slate-900">Commit summary</h2>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Imported rows: {commitSummary.imported_count}</div>
                    <div>Skipped duplicates: {commitSummary.skipped_duplicate_count}</div>
                    <div>Approved rows sent: {commitSummary.approved_row_count}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Preview rows</h2>
              <p className="mt-1 text-sm text-slate-500">
                Transactions marked with warnings are visible here but will not be committed by the current backend flow.
              </p>
            </div>

            {previewRows.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">Parse an import job to inspect normalized bank statement rows.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Counterparty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Reference</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {previewRows.map((row) => (
                      <tr key={row.external_id} className="border-b border-slate-100 align-top">
                        <td className="px-4 py-4 text-sm text-slate-700">{row.row_no}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{row.tx_date || row.value_date || '-'}</td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-slate-900">{row.counterparty_name || 'Unknown counterparty'}</div>
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
                                Needs review
                              </span>
                              <div className="text-xs text-amber-800">
                                {row.warning_flags.map(formatLabel).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                              Approved
                            </span>
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
