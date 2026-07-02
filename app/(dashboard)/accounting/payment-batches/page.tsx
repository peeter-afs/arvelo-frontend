'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
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
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { bankingApi, type BankAccountRecord, type PaymentBatchLine, type PaymentBatchListItem } from '@/lib/api/banking.api';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { getIsoToday } from '@/lib/utils/date';

type DraftLine = {
  /** null = manual/free-form line (taxes, rent, ...) */
  invoice_id: string | null;
  amount: string;
  payee_name: string;
  payee_iban: string;
  payee_bic: string;
  reference: string;
  description: string;
  counterpart_account_id?: string;
  warning_flags?: string[];
};

export default function PaymentBatchesPage() {
  const t = useTranslations('accounting');
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
  const [ledgerAccounts, setLedgerAccounts] = useState<AccountOption[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [executionDate, setExecutionDate] = useClientDateInput(getIsoToday);
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
        const [invoiceItems, batchResult, bankAccountItems, accountItems] = await Promise.all([
          invoicesApi.listInvoices({ type: 'purchase_invoice', limit: 100 }),
          bankingApi.listPaymentBatches({ limit: 30 }),
          bankingApi.listBankAccounts(),
          accountingApi.getAccounts().catch(() => [] as AccountOption[]),
        ]);

        const payableInvoices = invoiceItems.filter((invoice) =>
          invoice.type === 'purchase_invoice' && ['approved', 'payable', 'partially_paid'].includes(invoice.status)
        );

        setInvoices(payableInvoices);
        setLedgerAccounts(accountItems.filter((account) => account.is_active));
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
      setSuccessMessage(t('draftLinesPrefilled'));
    });
  };

  const handleAddManualLine = () => {
    setDraftLines((current) => [
      ...current,
      {
        invoice_id: null,
        amount: '',
        payee_name: '',
        payee_iban: '',
        payee_bic: '',
        reference: '',
        description: '',
        counterpart_account_id: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setDraftLines((current) => current.filter((_, currentIndex) => currentIndex !== index));
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
          invoice_id: line.invoice_id || undefined,
          amount: Number(line.amount || 0),
          payee_name: line.payee_name || undefined,
          payee_iban: line.payee_iban || undefined,
          payee_bic: line.payee_bic || undefined,
          reference: line.reference || undefined,
          description: line.description || undefined,
          counterpart_account_id: line.invoice_id ? undefined : line.counterpart_account_id || undefined,
        })),
      });
      setSuccessMessage(t('paymentBatchCreated'));
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
      setSuccessMessage(t('csvExportGenerated'));
      await refreshBatches(selectedBatchId);
    });
  };

  const handleGeneratePain = async () => {
    if (!selectedBatchId) return;
    await runAction('generate-pain', async () => {
      await bankingApi.generatePaymentBatchPain001(selectedBatchId);
      setSuccessMessage(t('painExportGenerated'));
      await refreshBatches(selectedBatchId);
    });
  };

  const handleConfirmUploaded = async () => {
    if (!selectedBatchId) return;
    await runAction('uploaded', async () => {
      await bankingApi.confirmPaymentBatchUploaded(selectedBatchId);
      setSuccessMessage(t('batchMarkedUploaded'));
      await refreshBatches(selectedBatchId);
    });
  };

  const handleConfirmExecuted = async () => {
    if (!selectedBatchId) return;
    await runAction('executed', async () => {
      const result = await bankingApi.confirmPaymentBatchExecuted(selectedBatchId);
      setSuccessMessage(t('batchExecutedPaymentsCreated', { count: result.payments_created ?? 0 }));
      await refreshBatches(selectedBatchId);
    });
  };

  const handleSubmitToBank = async () => {
    if (!selectedBatchId) return;
    await runAction('submit-to-bank', async () => {
      const result = await bankingApi.submitPaymentBatchToBank(selectedBatchId);
      setSuccessMessage(t('batchSentToBank', { provider: result.provider === 'lhv_connect' ? 'LHV' : 'Swedbank' }));
      await refreshBatches(selectedBatchId);
    });
  };

  const handleVoidBatch = async () => {
    if (!selectedBatchId) return;
    await runAction('void', async () => {
      await bankingApi.voidPaymentBatch(selectedBatchId, { reason: voidReason || undefined });
      setSuccessMessage(t('batchVoided'));
      await refreshBatches(selectedBatchId);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('paymentBatches')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {t('paymentBatchesDescription')}
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
              <h2 className="text-base font-semibold text-slate-900">{t('createBatch')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('createBatchDescription')}</p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('bankAccount')}</span>
                  <select
                    value={bankAccountId}
                    onChange={(event) => setBankAccountId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3"
                  >
                    <option value="">{t('selectBankAccount')}</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} {account.iban ? `· ${account.iban}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label={t('batchName')} value={batchName} onChange={setBatchName} placeholder={t('optionalBatchName')} />
                <Field label={t('executionDate')} type="date" value={executionDate} onChange={setExecutionDate} />
                <Field label={t('currency')} value={currency} onChange={(value) => setCurrency(value.toUpperCase())} />
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{t('payableInvoices')}</h3>
                    <p className="text-xs text-slate-500">{t('chooseInvoicesToPrefill')}</p>
                  </div>
                  <button
                    onClick={handlePrefill}
                    disabled={selectedInvoiceIds.length === 0 || !!actionLoading}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'prefill' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                    <span>{t('prefillLines')}</span>
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {isBootLoading ? (
                    <div className="p-4 text-sm text-slate-500">{t('loadingInvoices')}</div>
                  ) : invoices.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">{t('noPayablePurchaseInvoices')}</div>
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
                              {t('statusValue', { value: invoice.status })} · {t('dueValue', { value: invoice.due_date || '-' })} · {t('openAmountValue', { amount: openAmount.toFixed(2), currency: invoice.currency })}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">{t('draftLines')}</h3>
                  <button
                    onClick={handleAddManualLine}
                    disabled={!!actionLoading}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>{t('addManualLine')}</span>
                  </button>
                </div>
                <div className="space-y-3 p-4">
                  {draftLines.length === 0 ? (
                    <div className="text-sm text-slate-500">{t('prefillLinesFirst')}</div>
                  ) : (
                    draftLines.map((line, index) => (
                      <div key={`${line.invoice_id || 'manual'}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-12">
                        <div className="lg:col-span-2">
                          <SmallField label={t('invoice')} value={line.invoice_id ? line.invoice_id.slice(0, 8) : t('manualLine')} readOnly />
                        </div>
                        <div className="lg:col-span-2">
                          <SmallField label={t('amount')} value={line.amount} onChange={(value) => updateDraftLine(setDraftLines, index, 'amount', value)} />
                        </div>
                        <div className="lg:col-span-3">
                          <SmallField label={t('payee')} value={line.payee_name} onChange={(value) => updateDraftLine(setDraftLines, index, 'payee_name', value)} />
                        </div>
                        <div className="lg:col-span-3">
                          <SmallField label={t('iban')} value={line.payee_iban} onChange={(value) => updateDraftLine(setDraftLines, index, 'payee_iban', value)} />
                        </div>
                        <div className="lg:col-span-2">
                          <SmallField label={t('bic')} value={line.payee_bic} onChange={(value) => updateDraftLine(setDraftLines, index, 'payee_bic', value)} />
                        </div>
                        <div className="lg:col-span-4">
                          <SmallField label={t('reference')} value={line.reference} onChange={(value) => updateDraftLine(setDraftLines, index, 'reference', value)} />
                        </div>
                        <div className="lg:col-span-8">
                          <SmallField label={t('description')} value={line.description} onChange={(value) => updateDraftLine(setDraftLines, index, 'description', value)} />
                        </div>
                        {!line.invoice_id && (
                          <div className="lg:col-span-8">
                            <label className="space-y-1">
                              <span className="text-xs font-medium text-slate-500">{t('counterpartAccount')}</span>
                              <select
                                value={line.counterpart_account_id || ''}
                                onChange={(event) => updateDraftLine(setDraftLines, index, 'counterpart_account_id', event.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm"
                              >
                                <option value="">{t('selectCounterpartAccount')}</option>
                                {ledgerAccounts.map((account) => (
                                  <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        )}
                        <div className={`flex items-end ${line.invoice_id ? 'lg:col-span-12' : 'lg:col-span-4'} justify-end`}>
                          <button
                            onClick={() => handleRemoveLine(index)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 hover:bg-slate-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{t('removeLine')}</span>
                          </button>
                        </div>
                        {line.warning_flags && line.warning_flags.length > 0 && (
                          <div className="lg:col-span-12 text-xs text-amber-700">
                            {t('warningsValue', { warnings: line.warning_flags.join(', ') })}
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
                <span>{t('createBatch')}</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{t('existingBatches')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('existingBatchesDescription')}</p>
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
                <div className="p-4 text-sm text-slate-500">{t('noPaymentBatchesYet')}</div>
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
                          {t('linesCount', { count: batch.line_count || 0 })} · {Number(batch.total_amount || 0).toFixed(2)} {batch.currency}
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
                <h2 className="text-base font-semibold text-slate-900">{t('batchDetail')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedBatch.batch.batch_name || selectedBatch.batch.id.slice(0, 8)} · {selectedBatch.batch.status}
                </p>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox label={t('bankAccount')} value={selectedBatch.batch.bank_account_iban || selectedBatch.batch.bank_account_id} />
                  <InfoBox label={t('executionDate')} value={selectedBatch.batch.execution_date || '-'} />
                  <InfoBox label={t('exportFormat')} value={selectedBatch.batch.exported_file_format || '-'} />
                  <InfoBox label={t('lines')} value={String(selectedBatch.summary.line_count || 0)} />
                </div>

                {selectedBatch.batch.submitted_via && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('bankSubmission')}</div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <div>{t('sentVia', { provider: selectedBatch.batch.submitted_via === 'lhv_connect' ? 'LHV Connect' : 'Swedbank Gateway' })}</div>
                      <div>
                        {t('bankStatusLabel')}: <span className={selectedBatch.batch.bank_status === 'rejected' ? 'font-medium text-red-700' : selectedBatch.batch.bank_status === 'settled' || selectedBatch.batch.bank_status === 'accepted' ? 'font-medium text-emerald-700' : 'font-medium text-slate-800'}>{selectedBatch.batch.bank_status || '-'}</span>
                        {selectedBatch.batch.bank_status_at ? ` · ${new Date(selectedBatch.batch.bank_status_at).toLocaleString()}` : ''}
                      </div>
                      {selectedBatch.batch.bank_status_reason && (
                        <div className="text-slate-500">{selectedBatch.batch.bank_status_reason}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-3">
                  <button
                    onClick={handleGenerateCsv}
                    disabled={selectedBatchStatus !== 'draft' || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'generate-csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span>{t('generateCsv')}</span>
                  </button>
                  <button
                    onClick={handleGeneratePain}
                    disabled={selectedBatchStatus !== 'draft' || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'generate-pain' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode2 className="h-4 w-4" />}
                    <span>{t('generatePain')}</span>
                  </button>
                  <button
                    onClick={handleSubmitToBank}
                    disabled={!['draft', 'generated'].includes(selectedBatchStatus || '') || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'submit-to-bank' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>{t('sendToBank')}</span>
                  </button>
                  <button
                    onClick={handleConfirmUploaded}
                    disabled={!['generated', 'uploaded'].includes(selectedBatchStatus || '') || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'uploaded' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>{t('confirmUploaded')}</span>
                  </button>
                  <button
                    onClick={handleConfirmExecuted}
                    disabled={!['generated', 'uploaded'].includes(selectedBatchStatus || '') || !!actionLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'executed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{t('confirmExecuted')}</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">{t('voidBatch')}</div>
                  <input
                    value={voidReason}
                    onChange={(event) => setVoidReason(event.target.value)}
                    placeholder={t('reasonForVoiding')}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3"
                  />
                  <button
                    onClick={handleVoidBatch}
                    disabled={selectedBatchStatus === 'confirmed' || selectedBatchStatus === 'voided' || !!actionLoading}
                    className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'void' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span>{t('voidBatch')}</span>
                  </button>
                </div>

                {selectedBatch.batch.exported_file_content && (
                  <div className="rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{t('exportPreview')}</div>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-4 text-xs text-slate-700">
                      {String(selectedBatch.batch.exported_file_content).slice(0, 8000)}
                    </pre>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{t('batchLines')}</div>
                  <div className="max-h-72 overflow-auto divide-y divide-slate-100">
                    {selectedBatch.lines.map((line) => (
                      <div key={line.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {line.invoice_number || (line.invoice_id ? line.invoice_id.slice(0, 8) : t('manualLine'))} · {line.payee_name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {line.payee_iban} · {line.reference || t('noReference')}
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
