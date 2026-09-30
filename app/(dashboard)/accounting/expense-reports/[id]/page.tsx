'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Paperclip, Trash2 } from 'lucide-react';
import { accountingApi, type AccountOption, type PartnerOption } from '@/lib/api/accounting.api';
import { expenseReportsApi, type ExpenseReport } from '@/lib/api/cashExpense.api';
import { getErrorMessage } from '@/lib/api/client';
import { importApi } from '@/lib/api/import.api';
import { paymentMethodsApi, type PaymentMethod } from '@/lib/api/paymentMethods.api';
import { getIsoToday } from '@/lib/utils/date';
import { CashOrderDialog } from '@/components/accounting/cash/CashOrderDialog';
import { EXPENSE_STATUS_TONE } from '@/components/accounting/expenses/status';
import { showToast } from '@/components/ui/Toast';

const money = (value: number) => value.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (value: string) => value.split('-').reverse().join('.');
const VAT_RATES = [24, 22, 13, 9, 0];

const EMPTY_RECEIPT = { vendor: '', receipt_number: '', receipt_date: '', description: '', account_id: '', gross: '', tax_rate: '24' };

export default function ExpenseReportPage() {
  const t = useTranslations('expenseReports');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [cashDesks, setCashDesks] = useState<PaymentMethod[]>([]);
  const [form, setForm] = useState({ ...EMPTY_RECEIPT, receipt_date: getIsoToday() });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cashPayout, setCashPayout] = useState(false);

  const reload = useCallback(() => expenseReportsApi.get(id).then(setReport), [id]);

  useEffect(() => {
    reload().catch((err) => setError(getErrorMessage(err)));
    accountingApi.getAccounts().then(setAccounts).catch(() => {});
    accountingApi.getPartners().then(setPartners).catch(() => {});
    paymentMethodsApi.list().then((rows) => setCashDesks(rows.filter((row) => row.kind === 'cash'))).catch(() => {});
  }, [reload]);

  const expenseAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'expense' || account.type === 'asset').sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );
  const accountLabel = useMemo(() => new Map(accounts.map((a) => [a.id, `${a.code} ${a.name}`])), [accounts]);

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await reload();
      if (success) showToast.success(success);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const addReceipt = () =>
    run('add', async () => {
      const vendorPartner = partners.find((p) => p.name.toLocaleLowerCase('et') === form.vendor.trim().toLocaleLowerCase('et'));
      const updated = await expenseReportsApi.addReceipt(
        id,
        {
          vendor_partner_id: vendorPartner?.id ?? null,
          vendor_name: vendorPartner ? null : form.vendor.trim(),
          receipt_number: form.receipt_number.trim() || null,
          receipt_date: form.receipt_date,
          description: form.description.trim(),
          account_id: form.account_id,
          gross_amount: Number(form.gross.replace(',', '.')),
          tax_rate: Number(form.tax_rate),
        },
        file
      );
      setReport(updated);
      setForm((current) => ({ ...EMPTY_RECEIPT, receipt_date: current.receipt_date, account_id: current.account_id, tax_rate: current.tax_rate }));
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    });

  const openDocument = async (documentId: string) => {
    try {
      const blob = await importApi.downloadDocument(documentId);
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  };

  if (!report) {
    return <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{error ?? t('loading')}</div>;
  }

  const editable = report.status === 'draft' || report.status === 'submitted';
  const gross = Number(form.gross.replace(',', '.'));
  const canAdd = form.vendor.trim() && form.description.trim() && form.account_id && Number.isFinite(gross) && gross > 0 && form.receipt_date;
  const field = 'h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2.5 text-[13px]';

  return (
    <div className="mx-auto w-full max-w-6xl py-4">
      <Link href="/accounting/expense-reports" className="text-[13px] text-[var(--a-accent)] hover:underline">← {t('title')}</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[20px] font-semibold text-[var(--a-text)]">{report.report_number}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${EXPENSE_STATUS_TONE[report.status]}`}>{t(`statusLabel.${report.status}`)}</span>
          </div>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
            {report.employee_name} · {dateText(report.report_date)}{report.description ? ` · ${report.description}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.status === 'draft' && (
            <>
              <button type="button" disabled={!!busy} onClick={() => { if (window.confirm(t('confirmDelete'))) void expenseReportsApi.remove(id).then(() => router.push('/accounting/expense-reports')).catch((err) => setError(getErrorMessage(err))); }} className="inline-flex h-9 items-center rounded-md border border-[var(--a-border)] px-3 text-[13px] text-[var(--a-text-2)] hover:text-[var(--a-neg)]">
                {t('delete')}
              </button>
              <button type="button" disabled={!!busy || report.receipts.length === 0} onClick={() => void run('submit', () => expenseReportsApi.submit(id), t('submitted'))} className="inline-flex h-9 items-center rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium disabled:opacity-50">
                {t('submit')}
              </button>
            </>
          )}
          {editable && (
            <button type="button" disabled={!!busy || report.receipts.length === 0} onClick={() => { if (window.confirm(t('confirmApprove', { total: money(report.total) }))) void run('approve', () => expenseReportsApi.approve(id), t('approved')); }} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
              {busy === 'approve' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('approve')}
            </button>
          )}
          {report.status === 'approved' && (
            <>
              {cashDesks.length > 0 && report.employee_balance > 0.005 && (
                <button type="button" onClick={() => setCashPayout(true)} className="inline-flex h-9 items-center rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium">
                  {t('payFromCash')}
                </button>
              )}
              <button type="button" disabled={!!busy} onClick={() => void run('reimbursed', () => expenseReportsApi.markReimbursed(id), t('markedReimbursed'))} className="inline-flex h-9 items-center rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)]">
                {t('markReimbursed')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 max-sm:grid-flow-row-dense sm:grid-cols-3">
        <Stat label={t('total')} value={`${money(report.total)} €`} />
        <Stat className="col-span-2 sm:col-span-1" label={t('settlementAccount')} value={report.settlement_account ? `${report.settlement_account.code} ${report.settlement_account.name}` : '—'} />
        <Stat label={t('owedToEmployee')} value={`${money(report.employee_balance)} €`} hint={t('owedHint')} />
      </div>

      {error && <div className="mt-4 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      <div className="mt-4 rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        {/* Phones: receipts as two-line cards with the row actions always visible. */}
        <ul className="divide-y divide-[var(--a-border)] md:hidden">
          {report.receipts.map((receipt) => (
            <li key={receipt.id} className="flex items-center gap-2 px-3 py-2.5 text-[12.5px]">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--a-text)]">{receipt.vendor_name ?? '—'}</span>
                  <span className="flex-shrink-0 font-mono text-[13.5px] font-semibold tabular-nums text-[var(--a-text)]">{money(receipt.total)}</span>
                </div>
                <div className="truncate text-[12px] text-[var(--a-text-3)]">
                  <span className="font-mono">{dateText(receipt.receipt_date)}</span>{receipt.receipt_number ? ` · ${receipt.receipt_number}` : ''} · {receipt.description}
                </div>
                <div className="truncate text-[12px] text-[var(--a-text-3)]">
                  {receipt.account_id ? accountLabel.get(receipt.account_id) ?? '' : ''} · {t('vat')} <span className="font-mono tabular-nums">{money(receipt.tax_amount)}</span> ({receipt.tax_rate}%)
                </div>
              </div>
              {receipt.document_id && (
                <button type="button" onClick={() => void openDocument(receipt.document_id!)} title={t('openAttachment')} aria-label={t('openAttachment')} className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-[var(--a-text-3)] hover:text-[var(--a-accent)]">
                  <Paperclip className="h-4 w-4" />
                </button>
              )}
              {editable && (
                <button type="button" disabled={!!busy} onClick={() => void run(`rm-${receipt.id}`, () => expenseReportsApi.removeReceipt(id, receipt.id))} title={t('removeReceipt')} aria-label={t('removeReceipt')} className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-[var(--a-text-3)] hover:text-[var(--a-neg)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
          {report.receipts.length === 0 && <li className="px-3 py-6 text-center text-[12.5px] text-[var(--a-text-3)]">{t('noReceipts')}</li>}
        </ul>
        <table className="hidden w-full border-collapse text-[12.5px] md:table">
          <thead>
            <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
              <th className="px-3 py-2">{t('receiptDate')}</th>
              <th className="px-3 py-2">{t('vendor')}</th>
              <th className="px-3 py-2">{t('receiptNo')}</th>
              <th className="px-3 py-2">{t('description')}</th>
              <th className="px-3 py-2">{t('account')}</th>
              <th className="px-3 py-2 text-right">{t('net')}</th>
              <th className="px-3 py-2 text-right">{t('vat')}</th>
              <th className="px-3 py-2 text-right">{t('gross')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {report.receipts.map((receipt) => (
              <tr key={receipt.id} className="border-b border-[var(--a-border)]">
                <td className="px-3 py-2 font-mono">{dateText(receipt.receipt_date)}</td>
                <td className="px-3 py-2">{receipt.vendor_name ?? '—'}</td>
                <td className="px-3 py-2 font-mono">{receipt.receipt_number ?? ''}</td>
                <td className="px-3 py-2">{receipt.description}</td>
                <td className="px-3 py-2">{receipt.account_id ? accountLabel.get(receipt.account_id) ?? '' : ''}</td>
                <td className="px-3 py-2 text-right font-mono">{money(receipt.subtotal)}</td>
                <td className="px-3 py-2 text-right font-mono">{money(receipt.tax_amount)} <span className="text-[var(--a-text-3)]">({receipt.tax_rate}%)</span></td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{money(receipt.total)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {receipt.document_id && (
                    <button type="button" onClick={() => void openDocument(receipt.document_id!)} title={t('openAttachment')} className="mr-2 text-[var(--a-text-3)] hover:text-[var(--a-accent)]">
                      <Paperclip className="inline h-3.5 w-3.5" />
                    </button>
                  )}
                  {editable && (
                    <button type="button" disabled={!!busy} onClick={() => void run(`rm-${receipt.id}`, () => expenseReportsApi.removeReceipt(id, receipt.id))} title={t('removeReceipt')} className="text-[var(--a-text-3)] hover:text-[var(--a-neg)]">
                      <Trash2 className="inline h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {report.receipts.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-[var(--a-text-3)]">{t('noReceipts')}</td></tr>
            )}
          </tbody>
        </table>

        {editable && (
          <div className="border-t border-[var(--a-border)] bg-[var(--a-surface-2)] p-3">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">{t('addReceipt')}</div>
            <datalist id="expense-vendors">
              {partners.map((partner) => <option key={partner.id} value={partner.name} />)}
            </datalist>
            <div className="grid grid-cols-2 gap-2 max-md:grid-flow-row-dense md:grid-cols-[130px_minmax(0,1.2fr)_110px_minmax(0,1.4fr)] max-md:[&>*]:min-w-0">
              <input type="date" value={form.receipt_date} onChange={(e) => setForm((c) => ({ ...c, receipt_date: e.target.value }))} className={field} />
              <input list="expense-vendors" value={form.vendor} onChange={(e) => setForm((c) => ({ ...c, vendor: e.target.value }))} placeholder={t('vendorPlaceholder')} className={`${field} col-span-2 md:col-span-1`} />
              <input value={form.receipt_number} onChange={(e) => setForm((c) => ({ ...c, receipt_number: e.target.value }))} placeholder={t('receiptNo')} className={field} />
              <input value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder={t('descriptionPlaceholder')} className={`${field} col-span-2 md:col-span-1`} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1.6fr)_110px_90px_minmax(0,1fr)_auto] max-md:[&>*]:min-w-0">
              <select value={form.account_id} onChange={(e) => setForm((c) => ({ ...c, account_id: e.target.value }))} className={`${field} col-span-2 md:col-span-1`}>
                <option value="">{t('selectAccount')}</option>
                {expenseAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
              </select>
              <input value={form.gross} onChange={(e) => setForm((c) => ({ ...c, gross: e.target.value }))} inputMode="decimal" placeholder={t('gross')} className={`${field} font-mono`} />
              <select value={form.tax_rate} onChange={(e) => setForm((c) => ({ ...c, tax_rate: e.target.value }))} className={field}>
                {VAT_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
              </select>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="col-span-2 text-[12px] file:mr-2 file:rounded file:border-0 file:bg-[var(--a-surface)] file:px-2 file:py-1 md:col-span-1" />
              <button type="button" disabled={!canAdd || !!busy} onClick={() => void addReceipt()} className="col-span-2 inline-flex h-10 items-center gap-1.5 rounded-md max-md:justify-center md:col-span-1 md:h-9 bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
                {busy === 'add' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('add')}
              </button>
            </div>
            <p className="mt-2 text-[11.5px] text-[var(--a-text-3)]">{t('receiptHint')}</p>
          </div>
        )}
      </div>

      {report.status === 'approved' && (
        <p className="mt-3 text-[12.5px] leading-5 text-[var(--a-text-2)]">{t('reimburseHint', { account: report.settlement_account?.code ?? '', employee: report.employee_name ?? '' })}</p>
      )}

      {cashPayout && cashDesks[0] && report.settlement_account && (
        <CashOrderDialog
          paymentMethodId={cashDesks[0].id}
          cashAccountId={cashDesks[0].account_id}
          orderType="disbursement"
          preset={{
            counter_account_id: report.settlement_account.id,
            partner_id: report.employee_partner_id,
            amount: report.employee_balance,
            description: `${t('reimbursementOf')} ${report.report_number}`,
          }}
          onClose={() => setCashPayout(false)}
          onCreated={() => reload()}
        />
      )}
    </div>
  );
}

function Stat({ label, value, hint, className = '' }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={`rounded-[10px] max-sm:min-w-0 border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 ${className}`} title={hint}>
      <div className="text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">{label}</div>
      <div className="mt-0.5 truncate text-[14px] font-semibold text-[var(--a-text)]">{value}</div>
    </div>
  );
}
