'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, ExternalLink, FileCheck2, FileX2, Loader2, RefreshCw, Send, Stamp } from 'lucide-react';
import { accountingApi, type PartnerRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';

type InvoiceDetail = {
  invoice: InvoiceListItem;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number | string;
    discount_percent?: number | string | null;
    tax_rate?: number | string | null;
    line_total: number | string;
    account_id?: string | null;
    meta?: Record<string, any> | null;
  }>;
};

const QUEUE_FILTERS = ['pending_approval', 'approved', 'rejected', 'draft', 'payable'] as const;

export default function PurchaseApprovalQueuePage() {
  const t = useTranslations('invoices');
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [queueFilter, setQueueFilter] = useState<(typeof QUEUE_FILTERS)[number]>('pending_approval');
  const [rejectReason, setRejectReason] = useState('');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const queueInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === queueFilter),
    [invoices, queueFilter]
  );

  const summary = useMemo(() => {
    const pending = invoices.filter((invoice) => invoice.status === 'pending_approval');
    const approved = invoices.filter((invoice) => invoice.status === 'approved');
    const rejected = invoices.filter((invoice) => invoice.status === 'rejected');
    const payable = invoices.filter((invoice) => invoice.status === 'payable');
    return {
      pendingCount: pending.length,
      pendingTotal: pending.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      payableCount: payable.length,
    };
  }, [invoices]);

  const selectedPartner = partners.find((partner) => partner.id === selectedInvoiceDetail?.invoice.partner_id) || null;

  const loadInvoices = async (preferredId?: string | null) => {
    const [invoiceItems, partnerItems] = await Promise.all([
      invoicesApi.listInvoices({ type: 'purchase_invoice', limit: 200 }),
      accountingApi.listPartners(),
    ]);
    setInvoices(invoiceItems);
    setPartners(partnerItems);
    const nextSelected = preferredId && invoiceItems.some((invoice) => invoice.id === preferredId)
      ? preferredId
      : invoiceItems.find((invoice) => invoice.status === queueFilter)?.id
        || invoiceItems[0]?.id
        || null;
    setSelectedInvoiceId(nextSelected);
  };

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        await loadInvoices(selectedInvoiceId);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!selectedInvoiceId) {
      setSelectedInvoiceDetail(null);
      return;
    }

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setErrorMessage(null);
      try {
        const result = await invoicesApi.getInvoice(selectedInvoiceId);
        setSelectedInvoiceDetail(result);
        setRejectReason(result.invoice.rejection_reason || '');
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    };

    void loadDetail();
  }, [selectedInvoiceId]);

  useEffect(() => {
    if (!selectedInvoiceId && queueInvoices[0]?.id) {
      setSelectedInvoiceId(queueInvoices[0].id);
      return;
    }

    if (selectedInvoiceId && !queueInvoices.some((invoice) => invoice.id === selectedInvoiceId)) {
      setSelectedInvoiceId(queueInvoices[0]?.id || null);
    }
  }, [queueInvoices, selectedInvoiceId]);

  const runAction = async (key: string, action: () => Promise<void>) => {
    setActionLoading(key);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await action();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const refresh = async (preferredId?: string | null) => {
    await loadInvoices(preferredId);
  };

  const handleSubmitApproval = async () => {
    if (!selectedInvoiceId) return;
    await runAction('submit', async () => {
      await invoicesApi.submitApproval(selectedInvoiceId);
      setSuccessMessage(t('invoiceSubmittedForApproval'));
      await refresh(selectedInvoiceId);
    });
  };

  const handleApprove = async () => {
    if (!selectedInvoiceId) return;
    await runAction('approve', async () => {
      await invoicesApi.approve(selectedInvoiceId);
      setSuccessMessage(t('invoiceApproved'));
      await refresh(selectedInvoiceId);
    });
  };

  const handleReject = async () => {
    if (!selectedInvoiceId) return;
    await runAction('reject', async () => {
      await invoicesApi.reject(selectedInvoiceId, rejectReason || undefined);
      setSuccessMessage(t('invoiceRejected'));
      await refresh(selectedInvoiceId);
    });
  };

  const handlePostToPayable = async () => {
    if (!selectedInvoiceId) return;
    await runAction('confirm', async () => {
      const result = await invoicesApi.confirm(selectedInvoiceId);
      setSuccessMessage(t('invoicePostedToPayableJournal', { id: result.journal_entry_id }));
      await refresh(selectedInvoiceId);
    });
  };

  const selectedInvoice = selectedInvoiceDetail?.invoice;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('purchaseApprovals')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {t('purchaseApprovalsDescription')}
          </p>
        </div>
        <button
          onClick={() => void runAction('refresh', async () => {
            await refresh(selectedInvoiceId);
            setSuccessMessage(t('approvalQueueRefreshed'));
          })}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
        >
          {actionLoading === 'refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span>{t('refresh')}</span>
        </button>
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

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label={t('pendingApproval')} value={summary.pendingCount} helper={`${summary.pendingTotal.toFixed(2)} ${t('openTotal').toLowerCase()}`} tone="warning" />
        <MetricCard label={t('approved')} value={summary.approvedCount} helper={t('readyForPosting')} tone="success" />
        <MetricCard label={t('rejected')} value={summary.rejectedCount} helper={t('needsCorrection')} tone="danger" />
        <MetricCard label={t('payable')} value={summary.payableCount} helper={t('postedSupplierInvoices')} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex flex-wrap gap-2">
              {QUEUE_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setQueueFilter(filter)}
                  className={`rounded-full px-3 py-2 text-sm transition-colors ${
                    queueFilter === filter
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {humanizeStatus(filter)} ({invoices.filter((invoice) => invoice.status === filter).length})
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">{humanizeStatus(queueFilter)} {t('invoicesListLabel')}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {isBootLoading ? (
                <div className="p-4 text-sm text-slate-500">{t('loadingQueue')}</div>
              ) : queueInvoices.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">{t('noInvoicesApprovalState')}</div>
              ) : (
                queueInvoices.map((invoice) => (
                  <button
                    key={invoice.id}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${selectedInvoiceId === invoice.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{invoice.invoice_number || invoice.id.slice(0, 8)}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {partners.find((partner) => partner.id === invoice.partner_id)?.name || t('unknownSupplier')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-slate-900">{Number(invoice.total || 0).toFixed(2)}</div>
                        <div className="mt-1 text-xs text-slate-500">{invoice.currency}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {t('due')} {invoice.due_date || '-'} · {approvalAgeLabel(invoice, {
                        ageUnavailable: t('ageUnavailable'),
                        today: t('today'),
                        daysInQueue: (count) => t('daysInQueue', { count }),
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {!selectedInvoice ? (
            <div className="card p-8 text-sm text-slate-500">{t('selectPurchaseInvoiceToReview')}</div>
          ) : isDetailLoading ? (
            <div className="card p-8 text-sm text-slate-500">{t('loadingInvoiceDetail')}</div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{selectedInvoice.invoice_number || selectedInvoice.id}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedPartner?.name || t('unknownSupplier')} · {t('invoiceDateLabel')} {selectedInvoice.invoice_date} · {t('due')} {selectedInvoice.due_date || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold text-slate-900">
                        {Number(selectedInvoice.total || 0).toFixed(2)} {selectedInvoice.currency}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{t('status')} {humanizeStatus(selectedInvoice.status)}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                  <InfoBox label={t('supplier')} value={selectedPartner?.name || '-'} />
                  <InfoBox label={t('openAmount')} value={Number(selectedInvoice.open_amount || 0).toFixed(2)} />
                  <InfoBox label={t('approvalRequested')} value={selectedInvoice.approval_requested_at || '-'} />
                  <InfoBox label={t('rejectionReason')} value={selectedInvoice.rejection_reason || '-'} />
                </div>

                <div className="border-t border-slate-200 p-5">
                  <div className="mb-3 text-sm font-semibold text-slate-900">{t('approvalActions')}</div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSubmitApproval}
                      disabled={!['draft', 'rejected'].includes(selectedInvoice.status) || !!actionLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span>{t('submitApproval')}</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={!['pending_approval', 'draft', 'rejected'].includes(selectedInvoice.status) || !!actionLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                      <span>{t('approveAction')}</span>
                    </button>
                    <button
                      onClick={handlePostToPayable}
                      disabled={!['approved'].includes(selectedInvoice.status) || !!actionLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                      <span>{t('postToPayable')}</span>
                    </button>
                    <Link
                      href={`/invoices/purchase`}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>{t('openFullPurchaseWorkspace')}</span>
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder={t('rejectionReason')}
                      className="h-10 rounded-lg border border-slate-200 px-3"
                    />
                    <button
                      onClick={handleReject}
                      disabled={!['pending_approval', 'approved'].includes(selectedInvoice.status) || !!actionLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileX2 className="h-4 w-4" />}
                      <span>{t('rejectAction')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="card overflow-hidden">
                  <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">{t('invoiceLines')}</h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectedInvoiceDetail?.lines.map((line) => (
                      <div key={line.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_100px_100px_110px]">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{line.description}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {t('qty')} {line.quantity} · {t('vatRate')} {Number(line.tax_rate || 0).toFixed(2)}% · {t('account')} {line.account_id || '-'}
                          </div>
                        </div>
                        <div className="text-sm text-slate-700">{Number(line.unit_price || 0).toFixed(2)}</div>
                        <div className="text-sm text-slate-700">{Number(line.discount_percent || 0).toFixed(2)}%</div>
                        <div className="text-right font-mono text-sm text-slate-900">{Number(line.line_total || 0).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card overflow-hidden">
                  <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">{t('reviewContext')}</h2>
                  </div>
                  <div className="space-y-4 p-5">
                    <InfoBox label={t('supplierEmail')} value={selectedPartner?.email || '-'} />
                    <InfoBox label={t('supplierRegistryCode')} value={selectedPartner?.reg_code || '-'} />
                    <InfoBox label={t('notes')} value={selectedInvoice.notes || t('noNotes')} />
                    <InfoBox label={t('requestedBy')} value={selectedInvoice.approval_requested_by_user_id || '-'} />
                    <InfoBox label={t('approvedBy')} value={selectedInvoice.approved_by_user_id || '-'} />
                    <InfoBox label={t('rejectedBy')} value={selectedInvoice.rejected_by_user_id || '-'} />
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const color =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-red-700'
          : 'text-slate-900';

  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{helper}</div>
    </div>
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

function humanizeStatus(status: string) {
  return status
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function approvalAgeLabel(
  invoice: InvoiceListItem,
  labels: {
    ageUnavailable: string;
    today: string;
    daysInQueue: (count: string) => string;
  }
) {
  const anchor = invoice.approval_requested_at || invoice.created_at;
  const anchorDate = new Date(anchor);
  if (Number.isNaN(anchorDate.getTime())) {
    return labels.ageUnavailable;
  }
  const today = new Date();
  anchorDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.max(0, Math.round((today.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)));
  return diff === 0 ? labels.today : labels.daysInQueue(String(diff));
}
