'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileX2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Stamp,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type PartnerRecord } from '@/lib/api/accounting.api';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';
import { paymentsApi, type PaymentListItem } from '@/lib/api/payments.api';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { Stat } from '@/components/ui/Stat';
import { StatusPill } from '@/components/ui/StatusPill';
import { SplitPane, SplitPaneDetail } from '@/components/layout/SplitPane';
import AiInvoicePanel from '@/components/invoices/AiInvoicePanel';
import { aiInvoiceApi, type AiSettings } from '@/lib/api/aiInvoice.api';
import { futursoftApi } from '@/lib/api/futursoft.api';

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
    meta?: Record<string, unknown> | null;
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

function formatMoney(value: number | string | null | undefined, currency = 'EUR') {
  return new Intl.NumberFormat('et-EE', { style: 'currency', currency }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'A';
}

export default function InvoiceListWorkspace({
  invoiceType,
  title,
  description,
  searchPlaceholder,
}: InvoiceListWorkspaceProps) {
  const t = useTranslations('invoices');
  const tAccounting = useTranslations('accounting');
  const isPurchase = invoiceType === 'purchase_invoice';
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentListItem[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPaymentHistoryLoading, setIsPaymentHistoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  const partnerMap = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);

  const statusTabs = useMemo<StatusTab[]>(() => {
    if (isPurchase) {
      const missingReceiptCount = invoices.filter((i) => i.source === 'bank_missing_receipt' && i.receipt_reminder_state === 'active').length;
      return [
        { id: 'all', label: 'All', count: invoices.length },
        ...PURCHASE_APPROVAL_STATUSES.map((status) => ({
          id: status,
          label: humanizeStatus(status),
          count: invoices.filter((invoice) => invoice.status === status).length,
        })),
        ...(missingReceiptCount > 0 ? [{ id: 'missing_receipt', label: tAccounting('missingReceiptDraft'), count: missingReceiptCount }] : []),
      ];
    }

    return [
      { id: 'all', label: t('all'), count: invoices.length },
      { id: 'draft', label: t('draft'), count: invoices.filter((invoice) => invoice.status === 'draft').length },
      { id: 'sent', label: t('sent'), count: invoices.filter((invoice) => ['sent', 'partially_paid'].includes(invoice.status)).length },
      { id: 'paid', label: t('paid'), count: invoices.filter((invoice) => invoice.status === 'paid').length },
      { id: 'overdue', label: t('overdue'), count: invoices.filter((invoice) => isOverdue(invoice)).length },
      { id: 'cancelled', label: t('cancelled'), count: invoices.filter((invoice) => invoice.status === 'cancelled').length },
    ];
  }, [invoices, isPurchase, t, tAccounting]);

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesTab = matchesInvoiceTab(invoice, activeTab, isPurchase);
      const partnerName = invoice.partner_name || partnerMap.get(invoice.partner_id || '')?.name || '';
      const haystack = [invoice.invoice_number, invoice.notes, invoice.payment_reference, partnerName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesTab && (!query || haystack.includes(query));
    });
  }, [activeTab, invoices, isPurchase, partnerMap, searchQuery]);

  const summary = useMemo(() => {
    const draft = invoices.filter((invoice) => invoice.status === 'draft').length;
    const approved = invoices.filter((invoice) => invoice.status === 'approved').length;
    const payable = invoices.filter((invoice) => invoice.status === 'payable').length;
    const paid = invoices.filter((invoice) => invoice.status === 'paid').length;
    const openTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.open_amount || 0), 0);
    const overdue = invoices.filter((invoice) => isOverdue(invoice)).length;
    const open = invoices.filter((invoice) => isOpenInvoice(invoice)).length;

    // Spec §6.5 sales stat strip: Total outstanding · Overdue · (receivables age) · Drafts.
    const openInvoices = invoices.filter((invoice) => isOpenInvoice(invoice));
    const overdueInvoices = invoices.filter((invoice) => isOverdue(invoice));
    const outstandingTotal = openInvoices.reduce((sum, invoice) => sum + Number(invoice.open_amount || 0), 0);
    const overdueTotal = overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.open_amount || 0), 0);
    // True DSO needs a payment date the list API does not expose; this is the average
    // age of currently-open receivables (today − invoice_date), an honest derivable proxy.
    const avgDaysOutstanding = averageReceivablesAge(openInvoices);

    return { draft, approved, payable, paid, openTotal, overdue, open, outstandingTotal, overdueTotal, avgDaysOutstanding };
  }, [invoices]);

  useEffect(() => {
    if (isPurchase) return;
    aiInvoiceApi.getSettings().then(s => setAiEnabled(s.ai_provider !== 'disabled')).catch(() => {});
  }, [isPurchase]);

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        const creditNoteType = invoiceType === 'sales_invoice' ? 'sales_credit_note' : 'purchase_credit_note';
        const [invoiceItems, creditNoteItems] = await Promise.all([
          invoicesApi.listInvoices({ type: invoiceType, limit: 200 }),
          invoicesApi.listInvoices({ type: creditNoteType, limit: 200 }),
        ]);
        const allItems = [...invoiceItems, ...creditNoteItems].sort(
          (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
        );
        setInvoices(allItems);
        // Load partners in the background for AI panel and send-email features.
        accountingApi.listPartners({ is_active: true }).then(setPartners).catch(() => {});
        setSelectedInvoiceId((current) => current || invoiceItems[0]?.id || null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, [invoiceType]);

  // Lazy on-access Futursoft sync: when opening the sales-invoices view, trigger an
  // import if the tenant's last sync is >1h old (the backend throttles to ~1×/hour).
  // Fire-and-forget so a Futursoft outage can never block or break the list.
  useEffect(() => {
    if (isPurchase) return;
    let cancelled = false;
    futursoftApi
      .sync({ trigger: 'on_access' })
      .then((result) => {
        if (!cancelled && result.status === 'success' && result.imported_count > 0) {
          void refreshInvoices();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceType, isPurchase]);

  useEffect(() => {
    if (!selectedInvoiceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        const selectedPartner = partnerMap.get(result.invoice.partner_id || '');
        setSendRecipient(selectedPartner?.email || '');
        setSendMessage('');
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    };

    void loadDetail();
  }, [partnerMap, selectedInvoiceId]);

  useEffect(() => {
    if (!selectedInvoiceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaymentHistory([]);
      return;
    }

    const loadPayments = async () => {
      setIsPaymentHistoryLoading(true);
      try {
        const result = await paymentsApi.listPayments({ invoice_id: selectedInvoiceId, limit: 20 });
        setPaymentHistory(result);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsPaymentHistoryLoading(false);
      }
    };

    void loadPayments();
  }, [selectedInvoiceId]);

  const refreshInvoices = async (preferredId?: string | null) => {
    const creditNoteType = invoiceType === 'sales_invoice' ? 'sales_credit_note' : 'purchase_credit_note';
    const [invoiceItems, creditNoteItems] = await Promise.all([
      invoicesApi.listInvoices({ type: invoiceType, limit: 200 }),
      invoicesApi.listInvoices({ type: creditNoteType, limit: 200 }),
    ]);
    const allItems = [...invoiceItems, ...creditNoteItems].sort(
      (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    );
    setInvoices(allItems);
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
      setSuccessMessage(t('invoiceSubmittedForApproval'));
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const handleApprove = async () => {
    if (!selectedInvoiceId) return;
    await runAction('approve', async () => {
      await invoicesApi.approve(selectedInvoiceId);
      setSuccessMessage(t('invoiceApproved'));
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const handleReject = async () => {
    if (!selectedInvoiceId) return;
    await runAction('reject', async () => {
      await invoicesApi.reject(selectedInvoiceId, rejectReason || undefined);
      setSuccessMessage(t('invoiceRejected'));
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const handleConfirm = async () => {
    if (!selectedInvoiceId) return;
    await runAction('confirm', async () => {
      const result = await invoicesApi.confirm(selectedInvoiceId);
      setSuccessMessage(t('invoicePostedJournalEntry', { id: result.journal_entry_id }));
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const handleSend = async () => {
    if (!selectedInvoiceId) return;
    await runAction('send', async () => {
      const result = await invoicesApi.sendInvoice(selectedInvoiceId, {
        to: sendRecipient || undefined,
        message: sendMessage || undefined,
      });
      setSuccessMessage(t('invoiceSentTo', { recipient: result.sent_to }));
      await refreshInvoices(selectedInvoiceId);
    });
  };

  const handleExport = async (format: 'pdf' | 'html' | 'json') => {
    if (!selectedInvoiceId) return;
    await runAction(`export-${format}`, async () => {
      const result = await invoicesApi.exportInvoice(selectedInvoiceId, format);
      const url = window.URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMessage(t('invoiceExportedAs', { filename: result.filename }));
    });
  };

  const selectedPartnerName = selectedInvoiceDetail?.invoice.partner_name
    || partnerMap.get(selectedInvoiceDetail?.invoice.partner_id || '')?.name
    || t('unknownPartner');
  const selectedPartner = partnerMap.get(selectedInvoiceDetail?.invoice.partner_id || '');

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-[var(--a-border)] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="micro text-[var(--a-text-3)]">{isPurchase ? 'Accounts payable' : 'Accounts receivable'}</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--a-text)]">{title}</h1>
          <p className="mt-2 text-[13px] text-[var(--a-text-2)]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {aiEnabled && !isPurchase && (
            <button
              onClick={() => setAiPanelOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--a-accent)] bg-[var(--a-accent)] px-3 text-[13px] font-medium text-white hover:bg-[#e74324]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('aiInvoice')}
            </button>
          )}
          <Link
            href={`/invoices/new?type=${invoiceType}`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--a-accent)] bg-[var(--a-accent)] px-3 text-[13px] font-medium text-white hover:bg-[#e74324]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('newInvoice')}
            <Kbd inverse>U</Kbd>
          </Link>
          <Link
            href={`/invoices/new?type=${invoiceType === 'sales_invoice' ? 'sales_credit_note' : 'purchase_credit_note'}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--a-warn-soft)] bg-[var(--a-warn-soft)] px-3 text-[13px] font-medium text-[var(--a-warn)]"
          >
            {t('newCreditNote')}
          </Link>
          <Button onClick={() => void refreshInvoices(selectedInvoiceId)}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {errorMessage && <Notice tone="danger" icon={<AlertCircle className="h-4 w-4" />}>{errorMessage}</Notice>}
      {successMessage && <Notice tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>{successMessage}</Notice>}

      <div className="grid border-b border-[var(--a-border)] pb-4 md:grid-cols-4">
        {isPurchase ? (
          <>
            <Stat label={t('draft')} value={summary.draft} subtle="not posted" />
            <Stat label={t('approved')} value={summary.approved} subtle="ready for payable" tone="positive" />
            <Stat label={t('payable')} value={summary.payable} subtle="awaiting payment" tone="warning" />
            <Stat label={t('openTotal')} value={formatMoney(summary.openTotal)} subtle={`${summary.paid} paid`} />
          </>
        ) : (
          <>
            <Stat label={t('totalOutstanding')} value={formatMoney(summary.outstandingTotal)} subtle={`${summary.open} ${t('openLower')}`} />
            <Stat label={t('overdue')} value={formatMoney(summary.overdueTotal)} subtle={`${summary.overdue} ${t('invoicesLower')}`} tone="danger" />
            <Stat label={t('avgDso')} value={`${summary.avgDaysOutstanding}d`} subtle={t('receivablesAge')} />
            <Stat label={t('draft')} value={summary.draft} subtle={t('notSent')} tone="warning" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium ${
                activeTab === tab.id
                  ? 'bg-[var(--a-text)] text-white'
                  : 'text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className={activeTab === tab.id ? 'text-white/60' : tab.id === 'overdue' ? 'text-[var(--a-accent)]' : 'text-[var(--a-text-3)]'}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <label className="relative block w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--a-text-3)]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] pl-9 pr-3 text-[13px] text-[var(--a-text)] outline-none"
          />
        </label>
      </div>

      <SplitPane className="flex-1">
        <section className="min-h-[520px] overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)]">
          <div className="grid grid-cols-[24px_132px_minmax(180px,1fr)_110px_108px_120px_100px] gap-3 border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]">
            <div />
            <div>Invoice</div>
            <div>{isPurchase ? 'Supplier' : 'Customer'}</div>
            <div className="text-right">Amount</div>
            <div>Issued</div>
            <div>Due</div>
            <div className="text-right">Status</div>
          </div>

          <div className="max-h-[calc(100vh-390px)] min-h-[430px] overflow-y-auto">
            {isBootLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-8 text-sm text-[var(--a-text-3)]">{t('noInvoicesCurrentFilter')}</div>
            ) : (
              filteredInvoices.map((invoice, index) => {
                const selected = selectedInvoiceId === invoice.id;
                const partnerDisplayName = invoice.partner_name || partnerMap.get(invoice.partner_id || '')?.name || null;
                const partner = { name: partnerDisplayName };
                const status = invoiceStatus(invoice, isPurchase);
                const paidPct = Number(invoice.total || 0) > 0 ? (Number(invoice.paid_amount || 0) / Number(invoice.total || 0)) * 100 : 0;

                return (
                  <button
                    key={invoice.id}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                    className={`grid w-full grid-cols-[24px_132px_minmax(180px,1fr)_110px_108px_120px_100px] items-center gap-3 border-b border-[var(--a-border)] px-4 py-3 text-left text-[13px] transition-colors ${
                      selected ? 'bg-[var(--a-accent-soft-2)] shadow-[inset_2px_0_0_var(--a-accent)]' : 'hover:bg-[var(--a-surface-2)]'
                    }`}
                  >
                    <span className={`font-mono text-[10.5px] ${selected ? 'font-semibold text-[var(--a-accent)]' : 'text-[var(--a-text-3)]'}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12px] font-medium text-[var(--a-accent)]">
                        {invoice.invoice_number || invoice.id.slice(0, 8)}
                      </span>
                      {(invoice.type === 'sales_credit_note' || invoice.type === 'purchase_credit_note') && (
                        <span className="mt-1 inline-flex rounded bg-[var(--a-warn-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--a-warn)]">
                          {t('creditNoteAbbrev')}
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar name={partner?.name || t('unknownPartner')} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[var(--a-text)]">{partner?.name || t('unknownPartner')}</span>
                        <span className="mt-0.5 block h-1 rounded-full bg-[var(--a-surface-2)]">
                          <span className="block h-1 rounded-full bg-[var(--a-pos)]" style={{ width: `${Math.min(100, paidPct)}%` }} />
                        </span>
                      </span>
                    </span>
                    <span className="text-right font-mono text-[13px] font-medium tabular-nums text-[var(--a-text)]">{formatMoney(invoice.total, invoice.currency)}</span>
                    <span className="font-mono text-[11.5px] tabular-nums text-[var(--a-text-2)]">{formatDate(invoice.invoice_date)}</span>
                    <span>
                      <span className="block font-mono text-[11.5px] tabular-nums text-[var(--a-text-2)]">{formatDate(invoice.due_date)}</span>
                      <span className="text-[10.5px] font-medium text-[var(--a-text-3)]">{status.label}</span>
                    </span>
                    <span className="flex items-center justify-end gap-1.5">
                      <StatusPill tone={status.tone} meta={status.meta}>{status.label}</StatusPill>
                      {invoice.source === 'bank_missing_receipt' && invoice.receipt_reminder_state === 'active' && (
                        <StatusPill tone="warning">{tAccounting('missingReceiptDraft')}</StatusPill>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2 font-mono text-[11px] text-[var(--a-text-3)]">
            <span>Showing <span className="text-[var(--a-text)]">{filteredInvoices.length}</span></span>
            <span>Open <span className="text-[var(--a-text)]">{formatMoney(summary.openTotal)}</span></span>
            {summary.overdue > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[var(--a-neg)]">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {summary.overdue} overdue
              </span>
            )}
            <span className="flex-1" />
            <span>Sync live</span>
          </div>
        </section>

        <SplitPaneDetail>
          <InvoiceDetailPanel
            detail={selectedInvoiceDetail}
            selectedPartnerName={selectedPartnerName}
            selectedPartner={selectedPartner}
            isPurchase={isPurchase}
            isLoading={isDetailLoading}
            actionLoading={actionLoading}
            paymentHistory={paymentHistory}
            isPaymentHistoryLoading={isPaymentHistoryLoading}
            rejectReason={rejectReason}
            sendRecipient={sendRecipient}
            sendMessage={sendMessage}
            onRejectReasonChange={setRejectReason}
            onSendRecipientChange={setSendRecipient}
            onSendMessageChange={setSendMessage}
            onSubmitApproval={handleSubmitApproval}
            onApprove={handleApprove}
            onReject={handleReject}
            onConfirm={handleConfirm}
            onSend={handleSend}
            onExport={handleExport}
          />
        </SplitPaneDetail>
      </SplitPane>

      {aiEnabled && !isPurchase && (
        <AiInvoicePanel
          open={aiPanelOpen}
          onOpenChange={setAiPanelOpen}
          onDraftCreated={() => void refreshInvoices(selectedInvoiceId)}
          partners={partners.map(p => ({ id: p.id, name: p.name }))}
        />
      )}
    </div>
  );
}

function InvoiceDetailPanel({
  detail,
  selectedPartnerName,
  selectedPartner,
  isPurchase,
  isLoading,
  actionLoading,
  paymentHistory,
  isPaymentHistoryLoading,
  rejectReason,
  sendRecipient,
  sendMessage,
  onRejectReasonChange,
  onSendRecipientChange,
  onSendMessageChange,
  onSubmitApproval,
  onApprove,
  onReject,
  onConfirm,
  onSend,
  onExport,
}: {
  detail: InvoiceDetail | null;
  selectedPartnerName: string;
  selectedPartner?: PartnerRecord;
  isPurchase: boolean;
  isLoading: boolean;
  actionLoading: string | null;
  paymentHistory: PaymentListItem[];
  isPaymentHistoryLoading: boolean;
  rejectReason: string;
  sendRecipient: string;
  sendMessage: string;
  onRejectReasonChange: (value: string) => void;
  onSendRecipientChange: (value: string) => void;
  onSendMessageChange: (value: string) => void;
  onSubmitApproval: () => void;
  onApprove: () => void;
  onReject: () => void;
  onConfirm: () => void;
  onSend: () => void;
  onExport: (format: 'pdf' | 'html' | 'json') => void;
}) {
  const t = useTranslations('invoices');

  if (!detail) {
    return <div className="p-6 text-sm text-[var(--a-text-3)]">{t('selectInvoiceToReview')}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" />
      </div>
    );
  }

  const invoice = detail.invoice;
  const status = invoiceStatus(invoice, isPurchase);

  return (
    <div className="flex max-h-[calc(100vh-190px)] min-h-[520px] flex-col">
      <div className="border-b border-[var(--a-border)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[12px] text-[var(--a-accent)]">{invoice.invoice_number || invoice.id.slice(0, 8)}</div>
            <h2 className="mt-2 truncate text-[17px] font-semibold text-[var(--a-text)]">{selectedPartnerName}</h2>
            <div className="mt-1.5 text-[12.5px] text-[var(--a-text-2)]">
              {formatDate(invoice.invoice_date)} · {t('due')} {formatDate(invoice.due_date)}
            </div>
          </div>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
      </div>

      <div className="border-b border-[var(--a-border)] bg-[var(--a-bg)] px-5 py-4">
        <div className="micro text-[var(--a-text-3)]">{t('invoiceTotal')}</div>
        <div className="mt-1 font-mono text-[30px] font-semibold leading-none text-[var(--a-text)] tabular-nums">
          {formatMoney(invoice.total, invoice.currency)}
        </div>
        <div className="mt-2 text-[12px] text-[var(--a-text-3)]">
          Open <span className="font-mono text-[var(--a-text)]">{formatMoney(invoice.open_amount, invoice.currency)}</span> · Paid{' '}
          <span className="font-mono text-[var(--a-pos)]">{formatMoney(invoice.paid_amount, invoice.currency)}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          <InfoBox label={t('paymentReference')} value={invoice.payment_reference || '-'} />
          <InfoBox label={isPurchase ? t('approvalRequested') : t('journalEntry')} value={isPurchase ? invoice.approval_requested_at || '-' : invoice.journal_entry_id || '-'} />
          <InfoBox label={t('subtotal')} value={formatMoney(invoice.subtotal, invoice.currency)} />
          <InfoBox label={t('taxTotal')} value={formatMoney(invoice.tax_amount, invoice.currency)} />
        </div>

        <section className="mt-5">
          <div className="micro mb-3 text-[var(--a-text-3)]">{isPurchase ? t('supplierContext') : t('customerContext')}</div>
          <div className="space-y-2 text-[12.5px]">
            <KV label={t('name')} value={selectedPartnerName} />
            <KV label={t('email')} value={selectedPartner?.email || '-'} />
            <KV label={t('registryCode')} value={selectedPartner?.reg_code || '-'} />
            <KV label={t('vatNumber')} value={selectedPartner?.vat_number || '-'} />
          </div>
        </section>

        <section className="mt-5">
          <div className="micro mb-3 text-[var(--a-text-3)]">{t('invoiceLines')}</div>
          <div className="space-y-2">
            {detail.lines.map((line) => (
              <div key={line.id} className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-[var(--a-text)]">{line.description}</div>
                    <div className="mt-1 text-[11.5px] text-[var(--a-text-3)]">
                      {t('qty')} {line.quantity} · {t('vatRate')} {Number(line.tax_rate || 0).toFixed(2)}% · {t('account')} {line.account_id || '-'}
                    </div>
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-[var(--a-text)]">{formatMoney(line.line_total, invoice.currency)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="micro mb-3 text-[var(--a-text-3)]">{t('paymentHistory')}</div>
          {isPaymentHistoryLoading ? (
            <div className="text-sm text-[var(--a-text-3)]">{t('loadingPaymentHistory')}</div>
          ) : paymentHistory.length === 0 ? (
            <div className="text-sm text-[var(--a-text-3)]">{t('noPaymentsRecordedYet')}</div>
          ) : (
            <div className="space-y-2">
              {paymentHistory.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--a-text)]">{payment.reference || payment.id.slice(0, 8)}</div>
                    <div className="font-mono text-[11px] text-[var(--a-text-3)]">{formatDate(payment.payment_date)}</div>
                  </div>
                  <div className="font-mono text-[var(--a-text)]">{formatMoney(payment.amount, payment.currency)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!isPurchase && (
          <section className="mt-5 space-y-2">
            <div className="micro text-[var(--a-text-3)]">{t('sendInvoice')}</div>
            <input
              value={sendRecipient}
              onChange={(event) => onSendRecipientChange(event.target.value)}
              placeholder={t('recipientEmail')}
              className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] outline-none"
            />
            <input
              value={sendMessage}
              onChange={(event) => onSendMessageChange(event.target.value)}
              placeholder={t('optionalMessage')}
              className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] outline-none"
            />
            <Button variant="primary" className="w-full" disabled={!!actionLoading} onClick={onSend}>
              {actionLoading === 'send' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t('sendInvoice')}
            </Button>
          </section>
        )}

        {isPurchase && (
          <section className="mt-5 space-y-2">
            <div className="micro text-[var(--a-text-3)]">{t('workflowActions')}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={!!actionLoading} onClick={onSubmitApproval}>
                {actionLoading === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {t('submitApproval')}
              </Button>
              <Button disabled={!!actionLoading} onClick={onApprove}>
                {actionLoading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5" />}
                {t('approveAction')}
              </Button>
              <Button variant="primary" disabled={!!actionLoading} onClick={onConfirm}>
                {actionLoading === 'confirm' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stamp className="h-3.5 w-3.5" />}
                {t('postToPayable')}
              </Button>
              <Button variant="danger" disabled={!!actionLoading} onClick={onReject}>
                {actionLoading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileX2 className="h-3.5 w-3.5" />}
                {t('rejectAction')}
              </Button>
            </div>
            <input
              value={rejectReason}
              onChange={(event) => onRejectReasonChange(event.target.value)}
              placeholder={t('rejectionReason')}
              className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] outline-none"
            />
          </section>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2.5">
        {canEditInvoice(invoice) && (
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-xs font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('editDraft')}
          </Link>
        )}
        <Link
          href={`/invoices/${invoice.id}/preview`}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-xs font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('previewPdf')}
        </Link>
        <Button className="h-8 text-xs" onClick={() => onExport('pdf')} disabled={!!actionLoading}>
          {actionLoading === 'export-pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          PDF
        </Button>
        <Button className="h-8 text-xs" onClick={() => onExport('json')} disabled={!!actionLoading}>
          JSON
        </Button>
      </div>
    </div>
  );
}

function Notice({ tone, icon, children }: { tone: 'danger' | 'success'; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        tone === 'danger'
          ? 'border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] text-[var(--a-neg)]'
          : 'border-[var(--a-pos-soft)] bg-[var(--a-pos-soft)] text-[var(--a-pos)]'
      }`}
    >
      <div className="flex items-start gap-2">
        {icon}
        <span>{children}</span>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--a-surface-2)] text-[10px] font-semibold text-[var(--a-text-2)]">
      {initials(name)}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--a-surface-2)] p-3">
      <div className="micro text-[var(--a-text-3)]">{label}</div>
      <div className="mt-1 truncate text-[12.5px] text-[var(--a-text)]">{value}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--a-border)] pb-2 last:border-0">
      <span className="text-[12px] text-[var(--a-text-3)]">{label}</span>
      <span className="max-w-[65%] truncate text-right text-[12.5px] text-[var(--a-text)]">{value}</span>
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

function matchesInvoiceTab(invoice: InvoiceListItem, activeTab: string, isPurchase: boolean) {
  if (activeTab === 'all') return true;
  if (activeTab === 'missing_receipt') return invoice.source === 'bank_missing_receipt' && invoice.receipt_reminder_state === 'active';
  if (isPurchase) return invoice.status === activeTab;
  if (activeTab === 'overdue') return isOverdue(invoice);
  if (activeTab === 'open') return isOpenInvoice(invoice);
  if (activeTab === 'sent') return ['sent', 'partially_paid'].includes(invoice.status);
  return invoice.status === activeTab;
}

function isOpenInvoice(invoice: InvoiceListItem) {
  return Number(invoice.open_amount || 0) > 0 && !['paid', 'cancelled'].includes(invoice.status);
}

function isOverdue(invoice: InvoiceListItem) {
  if (!invoice.due_date) return false;
  if (!isOpenInvoice(invoice)) return false;
  const due = new Date(invoice.due_date);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function averageReceivablesAge(openInvoices: InvoiceListItem[]) {
  if (!openInvoices.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = openInvoices.reduce((sum, invoice) => {
    const issued = new Date(invoice.invoice_date);
    issued.setHours(0, 0, 0, 0);
    return sum + Math.max(0, (today.getTime() - issued.getTime()) / 86400000);
  }, 0);
  return Math.round(totalDays / openInvoices.length);
}

function daysPastDue(invoice: InvoiceListItem) {
  if (!invoice.due_date) return 0;
  const due = new Date(invoice.due_date);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86400000));
}

function invoiceStatus(invoice: InvoiceListItem, isPurchase: boolean): { label: string; tone: 'posted' | 'draft' | 'open' | 'paid' | 'overdue' | 'neutral' | 'danger' | 'warning' | 'success'; meta?: string } {
  if (isPurchase) {
    if (invoice.status === 'approved' || invoice.status === 'paid') return { label: humanizeStatus(invoice.status), tone: 'success' };
    if (invoice.status === 'rejected') return { label: humanizeStatus(invoice.status), tone: 'danger' };
    if (invoice.status === 'draft' || invoice.status === 'pending_approval') return { label: humanizeStatus(invoice.status), tone: 'warning' };
    return { label: humanizeStatus(invoice.status), tone: 'neutral' };
  }

  if (invoice.status === 'draft') return { label: 'Draft', tone: 'draft' };
  if (invoice.status === 'paid') return { label: 'Paid', tone: 'paid' };
  if (isOverdue(invoice)) return { label: 'Overdue', tone: 'overdue', meta: `${daysPastDue(invoice)}d` };
  if (isOpenInvoice(invoice)) return { label: 'Open', tone: 'open' };
  return { label: humanizeStatus(invoice.status), tone: 'neutral' };
}

function canEditInvoice(invoice: InvoiceListItem) {
  return ['draft', 'rejected'].includes(invoice.status) && !invoice.journal_entry_id;
}
