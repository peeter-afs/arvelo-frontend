'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCode2,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Wallet,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { bankingApi, type BankAccountRecord, type PaymentBatchLine, type PaymentBatchListItem } from '@/lib/api/banking.api';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';

type DraftLine = {
  invoice_id: string;
  amount: string;
  payee_name: string;
  payee_iban: string;
  payee_bic: string;
  reference: string;
  description: string;
  warning_flags?: string[];
};

const today = new Date().toISOString().slice(0, 10);

export default function PaymentBatchesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [batches, setBatches] = useState<PaymentBatchListItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<{
    batch: PaymentBatchListItem;
    lines: PaymentBatchLine[];
    summary: Record<string, any>;
  } | null>(null);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [executionDate, setExecutionDate] = useState(today);
  const [currency, setCurrency] = useState('EUR');
  const [voidReason, setVoidReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        const [invoiceItems, batchResult, bankAccountItems] = await Promise.all([
          invoicesApi.listInvoices({ type: 'purchase_invoice', limit: 100 }),
          bankingApi.listPaymentBatches({ limit: 30 }),
          bankingApi.listBankAccounts(),
        ]);

        const payableInvoices = invoiceItems.filter((invoice) =>
          invoice.type === 'purchase_invoice' && ['approved', 'payable', 'partially_paid'].includes(invoice.status)
        );

        setInvoices(payableInvoices);
        setBatches(batchResult.items);
        setBankAccounts(bankAccountItems.filter((item) => item.is_active));
        setBankAccountId((current) => current || bankAccountItems.find((item) => item.is_active)?.id || '');
        setSelectedBatchId((current) => current || batchResult.items[0]?.id || null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setSelectedBatch(null);
      return;
    }

    const loadBatch = async () => {
      try {
        const result = await bankingApi.getPaymentBatch(selectedBatchId);
        setSelectedBatch(result);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    };

    void loadBatch();
  }, [selectedBatchId]);

  const refreshBatches = async (preferredBatchId?: string | null) => {
    const batchResult = await bankingApi.listPaymentBatches({ limit: 30 });
    setBatches(batchResult.items);
    const nextId = preferredBatchId && batchResult.items.some((item) => item.id === preferredBatchId)
      ? preferredBatchId
      : batchResult.items[0]?.id || null;
    setSelectedBatchId(nextId);
    if (nextId) {
      const detail = await bankingApi.getPaymentBatch(nextId);
      setSelectedBatch(detail);
    } else {
      setSelectedBatch(null);
    }
  };

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setActionLoading(key);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await fn();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((current) =>
      current.includes(invoiceId) ? current.filter((id) => id !== invoiceId) : [...current, invoiceId]
    );
  };

  const handlePrefill = async () => {
    if (selectedInvoiceIds.length === 0) return;
    await runAction('prefill', async () => {
      const result = await bankingApi.getPaymentBatchPrefillLines({
        invoice_ids: selectedInvoiceIds,
        currency,
      });
      setDraftLines(result.lines.map((line) => ({
        invoice_id: line.invoice_id,
        amount: String(line.amount),
        payee_name: line.payee_name || '',
        payee_iban: line.payee_iban || '',
        payee_bic: line.payee_bic || '',
        reference: line.reference || '',
        description: line.description || '',
        warning_flags: line.warning_flags || [],
      })));
      setSuccessMessage('Draft lines prefilled from payable invoices.');
    });
  };

  const handleCreateBatch = async () => {
    if (!bankAccountId || draftLines.length === 0) return;
    await runAction('create', async () => {
      const result = await bankingApi.createPaymentBatch({
        bank_account_id: bankAccountId,
        batch_name: batchName || undefined,
        execution_date: executionDate || undefined,
        currency,
        lines: draftLines.map((line) => ({
          invoice_id: line.invoice_id,
          amount: Number(line.amount || 0),
          payee_name: line.payee_name || undefined,
          payee_iban: line.payee_iban || undefined,
          payee_bic: line.payee_bic || undefined,
          reference: line.reference || undefined,
          description: line.description || undefined,
        })),
      });
      setSuccessMessage('Payment batch created.');
      setSelectedInvoiceIds([]);
      setDraftLines([]);
      await refreshBatches(result.batch.id);
    });
  };

  const selectedBatchStatus = selectedBatch?.batch.status;

  const handleGenerateCsv = async () => {
    if (!selectedBatchId) return;
    await runAction('generate-csv', async () => {
      await bankingApi.generatePaymentBatch(selectedBatchId);
      setSuccessMessage('CSV export generated.');
      await refreshBatches(selectedBatchId);
    });
  };

  const handleGeneratePain = async () => {
    if (!selectedBatchId) return;
    await runAction('generate-pain', async () => {
      await bankingApi.generatePaymentBatchPain001(selectedBatchId);
      setSuccessMessage('PAIN.001 export generated.');
      await refreshBatches(selectedBatchId);
    });
  };

  const handleConfirmUploaded = async () => {
    if (!selectedBatchId) return;
    await runAction('uploaded', async () => {
      await bankingApi.confirmPaymentBatchUploaded(selectedBatchId);
      setSuccessMessage('Batch marked uploaded.');
      await refreshBatches(selectedBatchId);
    });
  };

  const handleConfirmExecuted = async () => {
    if (!selectedBatchId) return;
    await runAction('executed', async () => {
      const result = await bankingApi.confirmPaymentBatchExecuted(selectedBatchId);
      setSuccessMessage(`Batch executed. Payments created: ${result.payments_created ?? 0}.`);
      await refreshBatches(selectedBatchId);
    });
  };

  const handleVoidBatch = async () => {
    if (!selectedBatchId) return;
    await runAction('void', async () => {
      await bankingApi.voidPaymentBatch(selectedBatchId, { reason: voidReason || undefined });
      setSuccessMessage('Batch voided.');
      await refreshBatches(selectedBatchId);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payment Batches</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Select payable purchase invoices, prefill supplier payment lines, create an outgoing payment batch, export
          CSV or PAIN.001, then confirm upload and execution.
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Create batch</h2>
              <p className="mt-1 text-sm text-slate-500">Prefill from purchase invoices that are approved, payable, or partially paid.</p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bank account</span>
                  <select
                    value={bankAccountId}
                    onChange={(event) => setBankAccountId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3"
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} {account.iban ? `· ${account.iban}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Batch name" value={batchName} onChange={setBatchName} placeholder="Optional batch name" />
                <Field label="Execution date" type="date" value={executionDate} onChange={setExecutionDate} />
                <Field label="Currency" value={currency} onChange={(value) => setCurrency(value.toUpperCase())} />
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Payable invoices</h3>
                    <p className="text-xs text-slate-500">Choose invoices to prefill batch lines.</p>
                  </div>
                  <button
                    onClick={handlePrefill}
                    disabled={selectedInvoiceIds.length === 0 || !!actionLoading}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'prefill' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                    <span>Prefill lines</span>
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {isBootLoading ? (
                    <div className="p-4 text-sm text-slate-500">Loading invoices…</div>
                  ) : invoices.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No payable purchase invoices available.</div>
                  ) : (
                    invoices.map((invoice) => {
                      const openAmount = Number(invoice.open_amount ?? invoice.total ?? 0);
                      const checked = selectedInvoiceIds.includes(invoice.id);
                      return (
                        <label key={invoice.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleInvoice(invoice.id)}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              {invoice.invoice_number || invoice.id.slice(0, 8)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Status {invoice.status} · due {invoice.due_date || '-'} · open {openAmount.toFixed(2)} {invoice.currency}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">Draft lines</h3>
                </div>
                <div className="space-y-3 p-4">
                  {draftLines.length === 0 ? (
                    <div className="text-sm text-slate-500">Prefill lines from selected invoices first.</div>
                  ) : (
                    draftLines.map((line, index) => (
                      <div key={`${line.invoice_id}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-12">
                        <div className="lg:col-span-2">
                          <SmallField label="Invoice" value={line.invoice_id.slice(0, 8)} readOnly />
                        </div>
                        <div className="lg:col-span-2">
                          <SmallField label="Amount" value={line.amount} onChange={(value) => updateDraftLine(setDraftLines, index, 'amount', value)} />
                        </div>
                        <div className="lg:col-span-3">
                          <SmallField label="Payee" value={line.payee_name} onChange={(value) => updateDraftLine(setDraftLines, index, 'payee_name', value)} />
                        </div>
                        <div className="lg:col-span-3">
                          <SmallField label="IBAN" value={line.payee_iban} onChange={(value) => updateDraftLine(setDraftLines, index, 'payee_iban', value)} />
                        </div>
                        <div className="lg:col-span-2">
                          <SmallField label="BIC" value={line.payee_bic} onChange={(value) => updateDraftLine(setDraftLines, index, 'payee_bic', value)} />
                        </div>
                        <div className="lg:col-span-4">
                          <SmallField label="Reference" value={line.reference} onChange={(value) => updateDraftLine(setDraftLines, index, 'reference', value)} />
                        </div>
                        <div className="lg:col-span-8">
                          <SmallField label="Description" value={line.description} onChange={(value) => updateDraftLine(setDraftLines, index, 'description', value)} />
                        </div>
                        {line.warning_flags && line.warning_flags.length > 0 && (
                          <div className="lg:col-span-12 text-xs text-amber-700">
                            Warnings: {line.warning_flags.join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateBatch}
                disabled={!bankAccountId || draftLines.length === 0 || !!actionLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Create batch</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Existing batches</h2>
                <p className="mt-1 text-sm text-slate-500">Draft, generated, uploaded, confirmed, and voided batches.</p>
              </div>
              <button
                onClick={() => void refreshBatches(selectedBatchId)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {batches.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No payment batches yet.</div>
              ) : (
                batches.map((batch) => (
                  <button
                    key={batch.id}
                    onClick={() => setSelectedBatchId(batch.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${selectedBatchId === batch.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{batch.batch_name || batch.id.slice(0, 8)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {batch.line_count || 0} lines · {Number(batch.total_amount || 0).toFixed(2)} {batch.currency}
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {batch.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedBatch && (
            <div className="card overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Batch detail</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedBatch.batch.batch_name || selectedBatch.batch.id.slice(0, 8)} · {selectedBatch.batch.status}
                </p>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox label="Bank account" value={selectedBatch.batch.bank_account_iban || selectedBatch.batch.bank_account_id} />
                  <InfoBox label="Execution date" value={selectedBatch.batch.execution_date || '-'} />
                  <InfoBox label="Export format" value={selectedBatch.batch.exported_file_format || '-'} />
                  <InfoBox label="Lines" value={String(selectedBatch.summary.line_count || 0)} />
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={handleGenerateCsv}
                    disabled={selectedBatchStatus !== 'draft' || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'generate-csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span>Generate CSV</span>
                  </button>
                  <button
                    onClick={handleGeneratePain}
                    disabled={selectedBatchStatus !== 'draft' || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'generate-pain' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode2 className="h-4 w-4" />}
                    <span>Generate PAIN.001</span>
                  </button>
                  <button
                    onClick={handleConfirmUploaded}
                    disabled={!['generated', 'uploaded'].includes(selectedBatchStatus || '') || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'uploaded' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>Confirm uploaded</span>
                  </button>
                  <button
                    onClick={handleConfirmExecuted}
                    disabled={!['generated', 'uploaded'].includes(selectedBatchStatus || '') || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'executed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>Confirm executed</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">Void batch</div>
                  <input
                    value={voidReason}
                    onChange={(event) => setVoidReason(event.target.value)}
                    placeholder="Reason for voiding"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3"
                  />
                  <button
                    onClick={handleVoidBatch}
                    disabled={selectedBatchStatus === 'confirmed' || selectedBatchStatus === 'voided' || !!actionLoading}
                    className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'void' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span>Void batch</span>
                  </button>
                </div>

                {selectedBatch.batch.exported_file_content && (
                  <div className="rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Export preview</div>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-4 text-xs text-slate-700">
                      {String(selectedBatch.batch.exported_file_content).slice(0, 8000)}
                    </pre>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Batch lines</div>
                  <div className="max-h-72 overflow-auto divide-y divide-slate-100">
                    {selectedBatch.lines.map((line) => (
                      <div key={line.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {line.invoice_number || line.invoice_id.slice(0, 8)} · {line.payee_name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {line.payee_iban} · {line.reference || 'No reference'}
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-600">
                            <div>{Number(line.amount).toFixed(2)} {line.currency}</div>
                            <div className="mt-1">{line.status}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-slate-200 px-3"
      />
    </label>
  );
}

function SmallField({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 px-3"
      />
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-800">{value}</div>
    </div>
  );
}

function updateDraftLine(
  setDraftLines: Dispatch<SetStateAction<DraftLine[]>>,
  index: number,
  key: keyof DraftLine,
  value: string
) {
  setDraftLines((current) => current.map((line, currentIndex) => currentIndex === index ? { ...line, [key]: value } : line));
}
