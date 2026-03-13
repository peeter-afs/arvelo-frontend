'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  FileX2,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Stamp,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type PartnerOption } from '@/lib/api/accounting.api';
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

type InvoiceListWorkspaceProps = {
  invoiceType: 'sales_invoice' | 'purchase_invoice';
  title: string;
  description: string;
  searchPlaceholder: string;
};

const PURCHASE_APPROVAL_STATUSES = ['pending_approval', 'approved', 'rejected', 'draft', 'payable'] as const;
type StatusTab = {
  id: string;
  label: string;
  count?: number;
};

export default function InvoiceListWorkspace({
  invoiceType,
  title,
  description,
  searchPlaceholder,
}: InvoiceListWorkspaceProps) {
  const isPurchase = invoiceType === 'purchase_invoice';
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const statusTabs = useMemo<StatusTab[]>(() => {
    if (isPurchase) {
      return [
        { id: 'all', label: 'All' },
        ...PURCHASE_APPROVAL_STATUSES.map((status) => ({
          id: status,
          label: humanizeStatus(status),
          count: invoices.filter((invoice) => invoice.status === status).length,
        })),
      ];
    }

    const uniqueStatuses = Array.from(new Set(invoices.map((invoice) => invoice.status).filter(Boolean))).sort();
    return [
      { id: 'all', label: 'All' },
      ...uniqueStatuses.map((status) => ({
        id: status,
        label: humanizeStatus(status),
        count: invoices.filter((invoice) => invoice.status === status).length,
      })),
    ];
  }, [invoices, isPurchase]);

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesTab = activeTab === 'all' ? true : invoice.status === activeTab;
      const partnerName = partners.find((partner) => partner.id === invoice.partner_id)?.name || '';
      const haystack = [
        invoice.invoice_number,
        invoice.notes,
        invoice.payment_reference,
        partnerName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesTab && (!query || haystack.includes(query));
    });
  }, [activeTab, invoices, partners, searchQuery]);

  const summary = useMemo(() => {
    const draft = invoices.filter((invoice) => invoice.status === 'draft').length;
    const approved = invoices.filter((invoice) => invoice.status === 'approved').length;
    const payable = invoices.filter((invoice) => invoice.status === 'payable').length;
    const confirmed = invoices.filter((invoice) => invoice.status === 'confirmed').length;
    const paid = invoices.filter((invoice) => invoice.status === 'paid').length;
    const openTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.open_amount || 0), 0);
    return { draft, approved, payable, confirmed, paid, openTotal };
  }, [invoices]);

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        const [invoiceItems, partnerItems] = await Promise.all([
          invoicesApi.listInvoices({ type: invoiceType, limit: 200 }),
          accountingApi.getPartners(),
        ]);
        setInvoices(invoiceItems);
        setPartners(partnerItems);
        setSelectedInvoiceId((current) => current || invoiceItems[0]?.id || null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, [invoiceType]);

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

  const refreshInvoices = async (preferredId?: string | null) => {
    const invoiceItems = await invoicesApi.listInvoices({ type: invoiceType, limit: 200 });
    setInvoices(invoiceItems);
    const nextSelected = preferredId && invoiceItems.some((invoice) => invoice.id === preferredId)
      ? preferredId
      : invoiceItems[0]?.id || null;
    setSelectedInvoiceId(nextSelected);
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

  const handleSubmitApproval = async () => {
    if (!selectedInvoiceId) return;
    await runAction('submit', async () => {
      await invoicesApi.submitApproval(selectedInvoiceId);
      setSuccessMessage('Invoice submitted for approval.');
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const handleApprove = async () => {
    if (!selectedInvoiceId) return;
    await runAction('approve', async () => {
      await invoicesApi.approve(selectedInvoiceId);
      setSuccessMessage('Invoice approved.');
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const handleReject = async () => {
    if (!selectedInvoiceId) return;
    await runAction('reject', async () => {
      await invoicesApi.reject(selectedInvoiceId, rejectReason || undefined);
      setSuccessMessage('Invoice rejected.');
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const handleConfirm = async () => {
    if (!selectedInvoiceId) return;
    await runAction('confirm', async () => {
      const result = await invoicesApi.confirm(selectedInvoiceId);
      setSuccessMessage(`Invoice posted. Journal entry ${result.journal_entry_id}.`);
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const selectedPartnerName =
    partners.find((partner) => partner.id === selectedInvoiceDetail?.invoice.partner_id)?.name || 'Unknown partner';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          onClick={() => void refreshInvoices(selectedInvoiceId)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
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
        <Metric label="Draft" value={summary.draft} />
        <Metric label={isPurchase ? 'Approved' : 'Confirmed'} value={isPurchase ? summary.approved : summary.confirmed} tone="success" />
        <Metric label={isPurchase ? 'Payable' : 'Paid'} value={isPurchase ? summary.payable : summary.paid} tone="success" />
        <Metric label="Open total" value={summary.openTotal.toFixed(2)} tone="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-3 py-2 text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}{typeof tab.count === 'number' ? ` (${tab.count})` : ''}
                </button>
              ))}
            </div>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3"
              />
            </label>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">{isPurchase ? 'Purchase invoices' : 'Sales invoices'}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {isBootLoading ? (
                <div className="p-4 text-sm text-slate-500">Loading invoices...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No invoices for the current filter.</div>
              ) : (
                filteredInvoices.map((invoice) => (
                  <button
                    key={invoice.id}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${selectedInvoiceId === invoice.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{invoice.invoice_number || invoice.id.slice(0, 8)}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {partners.find((partner) => partner.id === invoice.partner_id)?.name || 'Unknown partner'}
                        </div>
                      </div>
                      <span className="font-mono text-sm text-slate-900">
                        {Number(invoice.total || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {humanizeStatus(invoice.status)} · {invoice.invoice_date}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {!selectedInvoiceDetail ? (
            <div className="card p-8 text-sm text-slate-500">Select an invoice to review its details.</div>
          ) : isDetailLoading ? (
            <div className="card p-8 text-sm text-slate-500">Loading invoice detail...</div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {selectedInvoiceDetail.invoice.invoice_number || selectedInvoiceDetail.invoice.id}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedPartnerName} · invoice date {selectedInvoiceDetail.invoice.invoice_date} · due {selectedInvoiceDetail.invoice.due_date || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold text-slate-900">
                        {Number(selectedInvoiceDetail.invoice.total || 0).toFixed(2)} {selectedInvoiceDetail.invoice.currency}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Status {humanizeStatus(selectedInvoiceDetail.invoice.status)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-2 xl:grid-cols-4">
                  <InfoBox label="Open amount" value={Number(selectedInvoiceDetail.invoice.open_amount || 0).toFixed(2)} />
                  <InfoBox label="Paid amount" value={Number(selectedInvoiceDetail.invoice.paid_amount || 0).toFixed(2)} />
                  <InfoBox label="Payment reference" value={selectedInvoiceDetail.invoice.payment_reference || '-'} />
                  <InfoBox label={isPurchase ? 'Approval requested' : 'Journal entry'} value={isPurchase ? selectedInvoiceDetail.invoice.approval_requested_at || '-' : selectedInvoiceDetail.invoice.journal_entry_id || '-'} />
                </div>

                {isPurchase && (
                  <div className="border-t border-slate-200 p-5">
                    <div className="mb-3 text-sm font-semibold text-slate-900">Workflow actions</div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleSubmitApproval}
                        disabled={!['draft', 'rejected'].includes(selectedInvoiceDetail.invoice.status) || !!actionLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span>Submit approval</span>
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={!['pending_approval', 'draft', 'rejected'].includes(selectedInvoiceDetail.invoice.status) || !!actionLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={!['approved'].includes(selectedInvoiceDetail.invoice.status) || !!actionLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                        <span>Post to payable</span>
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        placeholder="Rejection reason"
                        className="h-10 rounded-lg border border-slate-200 px-3"
                      />
                      <button
                        onClick={handleReject}
                        disabled={!['pending_approval', 'approved'].includes(selectedInvoiceDetail.invoice.status) || !!actionLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileX2 className="h-4 w-4" />}
                        <span>Reject</span>
                      </button>
                    </div>

                    {selectedInvoiceDetail.invoice.rejection_reason && (
                      <div className="mt-3 text-sm text-red-700">
                        Rejection reason: {selectedInvoiceDetail.invoice.rejection_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Invoice lines</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedInvoiceDetail.lines.map((line) => (
                    <div key={line.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_120px_120px_120px]">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{line.description}</div>
                        <div className="mt-1 text-xs text-slate-500">Qty {line.quantity} · VAT {Number(line.tax_rate || 0).toFixed(2)}%</div>
                      </div>
                      <div className="text-sm text-slate-700">{Number(line.unit_price || 0).toFixed(2)}</div>
                      <div className="text-sm text-slate-700">{Number(line.discount_percent || 0).toFixed(2)}%</div>
                      <div className="text-right font-mono text-sm text-slate-900">{Number(line.line_total || 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
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

function humanizeStatus(status: string | null | undefined) {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
