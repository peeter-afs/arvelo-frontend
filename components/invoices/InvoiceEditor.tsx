'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { accountingApi, type AccountOption, type PartnerOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { invoicesApi, type InvoiceDraftPayload } from '@/lib/api/invoices.api';

type DraftLine = {
  description: string;
  account_id: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_rate: string;
};

type InvoiceEditorProps = {
  mode: 'create' | 'edit';
  invoiceId?: string;
  defaultType?: 'sales_invoice' | 'purchase_invoice';
};

const emptyLine = (): DraftLine => ({
  description: '',
  account_id: '',
  quantity: '1',
  unit_price: '',
  discount_percent: '0',
  tax_rate: '22',
});

export default function InvoiceEditor({ mode, invoiceId, defaultType = 'sales_invoice' }: InvoiceEditorProps) {
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [type, setType] = useState<'sales_invoice' | 'purchase_invoice'>(defaultType);
  const [partnerId, setPartnerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadBase = async () => {
      try {
        const [partnerItems, accountItems] = await Promise.all([
          accountingApi.getPartners(),
          accountingApi.getAccounts(),
        ]);
        setPartners(partnerItems);
        setAccounts(accountItems);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    };

    void loadBase();
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !invoiceId) return;

    const loadInvoice = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await invoicesApi.getInvoice(invoiceId);
        setType(result.invoice.type as 'sales_invoice' | 'purchase_invoice');
        setPartnerId(result.invoice.partner_id || '');
        setInvoiceNumber(result.invoice.invoice_number || '');
        setInvoiceDate(String(result.invoice.invoice_date).slice(0, 10));
        setDueDate(result.invoice.due_date ? String(result.invoice.due_date).slice(0, 10) : '');
        setCurrency(result.invoice.currency || 'EUR');
        setPaymentReference(result.invoice.payment_reference || '');
        setNotes(result.invoice.notes || '');
        setLines(
          result.lines.length > 0
            ? result.lines.map((line) => ({
                description: line.description || '',
                account_id: line.account_id || '',
                quantity: String(line.quantity ?? 1),
                unit_price: String(line.unit_price ?? ''),
                discount_percent: String(line.discount_percent ?? 0),
                tax_rate: String(line.tax_rate ?? 0),
              }))
            : [emptyLine()]
        );
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadInvoice();
  }, [invoiceId, mode]);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        const quantity = Number(line.quantity || 0);
        const unitPrice = Number(line.unit_price || 0);
        const discountPercent = Number(line.discount_percent || 0);
        const taxRate = Number(line.tax_rate || 0);
        const net = quantity * unitPrice * (1 - discountPercent / 100);
        const tax = net * (taxRate / 100);
        acc.subtotal += Number.isFinite(net) ? net : 0;
        acc.tax += Number.isFinite(tax) ? tax : 0;
        return acc;
      },
      { subtotal: 0, tax: 0 }
    );
  }, [lines]);

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    setLines((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  };

  const buildPayload = (): InvoiceDraftPayload => ({
    type,
    partner_id: partnerId || undefined,
    invoice_number: invoiceNumber || undefined,
    invoice_date: invoiceDate,
    due_date: dueDate || undefined,
    currency,
    payment_reference: paymentReference || undefined,
    notes: notes || undefined,
    lines: lines.map((line) => ({
      description: line.description,
      account_id: line.account_id || undefined,
      quantity: Number(line.quantity || 0),
      unit_price: Number(line.unit_price || 0),
      discount_percent: Number(line.discount_percent || 0),
      tax_rate: Number(line.tax_rate || 0),
    })),
  });

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = buildPayload();
      const result = mode === 'create'
        ? await invoicesApi.createInvoice(payload)
        : await invoicesApi.updateInvoice(invoiceId!, payload);
      setSuccessMessage(mode === 'create' ? 'Invoice draft created.' : 'Invoice draft updated.');
      router.push(result.invoice.type === 'purchase_invoice' ? '/invoices/purchase' : '/invoices/sales');
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{mode === 'create' ? 'New Invoice Draft' : 'Edit Invoice Draft'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'create'
              ? 'Create a new sales or purchase invoice draft with live line totals.'
              : 'Edit a draft or rejected invoice before posting or approval.'}
          </p>
        </div>
        <Link
          href={type === 'purchase_invoice' ? '/invoices/purchase' : '/invoices/sales'}
          className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
        >
          Back to list
        </Link>
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

      {isLoading ? (
        <div className="card p-8 text-sm text-slate-500">Loading invoice draft...</div>
      ) : (
        <>
          <div className="card p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Invoice type">
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as 'sales_invoice' | 'purchase_invoice')}
                  disabled={mode === 'edit'}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 disabled:bg-slate-50"
                >
                  <option value="sales_invoice">Sales invoice</option>
                  <option value="purchase_invoice">Purchase invoice</option>
                </select>
              </Field>
              <Field label="Partner">
                <select value={partnerId} onChange={(event) => setPartnerId(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3">
                  <option value="">Select partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Invoice number">
                <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3" />
              </Field>
              <Field label="Currency">
                <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} className="h-11 w-full rounded-lg border border-slate-200 px-3" />
              </Field>
              <Field label="Invoice date">
                <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3" />
              </Field>
              <Field label="Due date">
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3" />
              </Field>
              <Field label="Payment reference">
                <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3" />
              </Field>
              <Field label="Notes">
                <input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3" />
              </Field>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Invoice lines</h2>
              <button
                onClick={() => setLines((current) => [...current, emptyLine()])}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                <span>Add line</span>
              </button>
            </div>
            <div className="space-y-4 p-5">
              {lines.map((line, index) => (
                <div key={`${index}-${line.description}`} className="rounded-2xl border border-slate-200 p-4">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_180px_110px_140px_120px_120px_auto]">
                    <input
                      value={line.description}
                      onChange={(event) => updateLine(index, { description: event.target.value })}
                      placeholder="Description"
                      className="h-11 rounded-lg border border-slate-200 px-3"
                    />
                    <select
                      value={line.account_id}
                      onChange={(event) => updateLine(index, { account_id: event.target.value })}
                      className="h-11 rounded-lg border border-slate-200 px-3"
                    >
                      <option value="">Account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.code} {account.name}</option>
                      ))}
                    </select>
                    <input value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} placeholder="Qty" className="h-11 rounded-lg border border-slate-200 px-3" />
                    <input value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: event.target.value })} placeholder="Unit price" className="h-11 rounded-lg border border-slate-200 px-3" />
                    <input value={line.discount_percent} onChange={(event) => updateLine(index, { discount_percent: event.target.value })} placeholder="Discount %" className="h-11 rounded-lg border border-slate-200 px-3" />
                    <input value={line.tax_rate} onChange={(event) => updateLine(index, { tax_rate: event.target.value })} placeholder="VAT %" className="h-11 rounded-lg border border-slate-200 px-3" />
                    <button
                      onClick={() => removeLine(index)}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-red-200 px-3 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Subtotal" value={totals.subtotal} />
            <SummaryCard label="Tax" value={totals.tax} />
            <SummaryCard label="Total" value={totals.subtotal + totals.tax} />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{mode === 'create' ? 'Create draft' : 'Save draft'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold text-slate-900">{value.toFixed(2)}</div>
    </div>
  );
}
