'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, RotateCcw, Stamp, Wallet } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { paymentsApi, type PaymentDetail, type PaymentListItem } from '@/lib/api/payments.api';

const FILTERS = ['all', 'draft', 'posted', 'reversed'] as const;

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(searchParams.get('payment_id'));
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [reverseReason, setReverseReason] = useState('');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const invoiceFilter = searchParams.get('invoice_id') || undefined;

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => statusFilter === 'all' || payment.status === statusFilter);
  }, [payments, statusFilter]);

  const summary = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        const amount = Number(payment.amount || 0);
        acc.total += amount;
        if (payment.status === 'draft') acc.draft += 1;
        if (payment.status === 'posted') acc.posted += 1;
        if (payment.status === 'reversed') acc.reversed += 1;
        if (payment.direction === 'incoming') acc.incoming += amount;
        if (payment.direction === 'outgoing') acc.outgoing += amount;
        return acc;
      },
      { total: 0, draft: 0, posted: 0, reversed: 0, incoming: 0, outgoing: 0 }
    );
  }, [payments]);

  const loadPayments = async (preferredId?: string | null) => {
    const result = await paymentsApi.listPayments({
      invoice_id: invoiceFilter,
      status: searchParams.get('status') || undefined,
      limit: 200,
    });
    setPayments(result);
    const nextId = preferredId && result.some((payment) => payment.id === preferredId)
      ? preferredId
      : result[0]?.id || null;
    setSelectedPaymentId(nextId);
  };

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        await loadPayments(selectedPaymentId);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, [invoiceFilter, searchParams, selectedPaymentId]);

  useEffect(() => {
    if (!selectedPaymentId) {
      setSelectedPayment(null);
      return;
    }

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setErrorMessage(null);
      try {
        const result = await paymentsApi.getPayment(selectedPaymentId);
        setSelectedPayment(result);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    };

    void loadDetail();
  }, [selectedPaymentId]);

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

  const handlePost = async () => {
    if (!selectedPaymentId) return;
    await runAction('post', async () => {
      await paymentsApi.postPayment(selectedPaymentId);
      setSuccessMessage('Payment posted.');
      await loadPayments(selectedPaymentId);
    });
  };

  const handleReverse = async () => {
    if (!selectedPaymentId) return;
    await runAction('reverse', async () => {
      await paymentsApi.reversePayment(selectedPaymentId, { reason: reverseReason || undefined });
      setSuccessMessage('Payment reversed.');
      setReverseReason('');
      await loadPayments(selectedPaymentId);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Review incoming and outgoing payments, inspect invoice settlement state, and post or reverse payments from one workspace.
          </p>
        </div>
        <button
          onClick={() => void runAction('refresh', async () => {
            await loadPayments(selectedPaymentId);
            setSuccessMessage('Payments refreshed.');
          })}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
        >
          {actionLoading === 'refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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

      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="Draft" value={summary.draft} />
        <Metric label="Posted" value={summary.posted} tone="success" />
        <Metric label="Reversed" value={summary.reversed} tone="danger" />
        <Metric label="Incoming" value={summary.incoming.toFixed(2)} tone="success" />
        <Metric label="Outgoing" value={summary.outgoing.toFixed(2)} tone="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-3 py-2 text-sm transition-colors ${
                    statusFilter === filter
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            {invoiceFilter && (
              <p className="mt-3 text-xs text-slate-500">
                Filtered to invoice <span className="font-mono">{invoiceFilter}</span>
              </p>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Payment list</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {isBootLoading ? (
                <div className="p-4 text-sm text-slate-500">Loading payments...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No payments for the current filter.</div>
              ) : (
                filteredPayments.map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => setSelectedPaymentId(payment.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${selectedPaymentId === payment.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {payment.invoice_number || payment.reference || payment.id.slice(0, 8)}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {payment.partner_name || 'Unknown partner'} · {payment.direction}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-slate-900">
                          {Number(payment.amount || 0).toFixed(2)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{payment.currency}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{payment.payment_date?.slice(0, 10)}</span>
                      <StatePill tone={payment.status === 'posted' ? 'success' : payment.status === 'reversed' ? 'danger' : 'warning'}>
                        {payment.status}
                      </StatePill>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {!selectedPayment ? (
            <div className="card p-8 text-sm text-slate-500">Select a payment to inspect its invoice and settlement detail.</div>
          ) : isDetailLoading ? (
            <div className="card p-8 text-sm text-slate-500">Loading payment detail...</div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {selectedPayment.reference || selectedPayment.invoice_number || selectedPayment.id}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedPayment.partner_name || 'Unknown partner'} · {selectedPayment.direction} · {selectedPayment.payment_date?.slice(0, 10)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold text-slate-900">
                        {Number(selectedPayment.amount || 0).toFixed(2)} {selectedPayment.currency}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Status {selectedPayment.status}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-2 xl:grid-cols-4">
                  <InfoBox label="Invoice" value={selectedPayment.invoice_number || '-'} />
                  <InfoBox label="Invoice status" value={selectedPayment.invoice_status || '-'} />
                  <InfoBox label="Invoice open amount" value={selectedPayment.invoice_open_amount !== null && selectedPayment.invoice_open_amount !== undefined ? Number(selectedPayment.invoice_open_amount).toFixed(2) : '-'} />
                  <InfoBox label="Journal entry" value={selectedPayment.journal_entry_id || '-'} />
                </div>

                <div className="border-t border-slate-200 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Wallet className="h-4 w-4" />
                    <span>Invoice settlement</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoBox label="Invoice total" value={selectedPayment.invoice_total !== null && selectedPayment.invoice_total !== undefined ? Number(selectedPayment.invoice_total).toFixed(2) : '-'} />
                    <InfoBox label="Paid amount" value={selectedPayment.invoice_paid_amount !== null && selectedPayment.invoice_paid_amount !== undefined ? Number(selectedPayment.invoice_paid_amount).toFixed(2) : '-'} />
                    <InfoBox label="Open amount" value={selectedPayment.invoice_open_amount !== null && selectedPayment.invoice_open_amount !== undefined ? Number(selectedPayment.invoice_open_amount).toFixed(2) : '-'} />
                  </div>
                  <div className="mt-4 text-sm text-slate-500">
                    Due {selectedPayment.due_date ? selectedPayment.due_date.slice(0, 10) : '-'} · Payment reference {selectedPayment.payment_reference || '-'}
                  </div>
                  <div className="mt-4">
                    <Link
                      href={`/invoices/${selectedPayment.invoice_id}/preview`}
                      className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Open invoice preview
                    </Link>
                  </div>
                </div>

                <div className="border-t border-slate-200 p-5">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Payment actions</div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handlePost}
                      disabled={selectedPayment.status !== 'draft' || !!actionLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === 'post' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                      <span>Post payment</span>
                    </button>
                    <input
                      value={reverseReason}
                      onChange={(event) => setReverseReason(event.target.value)}
                      placeholder="Reversal reason"
                      className="h-10 min-w-[240px] rounded-lg border border-slate-200 px-3"
                    />
                    <button
                      onClick={handleReverse}
                      disabled={selectedPayment.status !== 'posted' || !!actionLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === 'reverse' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      <span>Reverse payment</span>
                    </button>
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

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-slate-200 bg-white text-slate-700';

  return (
    <div className={`card border p-4 ${toneClass}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-current/80">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function StatePill({ children, tone }: { children: string; tone: 'success' | 'warning' | 'danger' }) {
  const className =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-700'
      : tone === 'danger'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
