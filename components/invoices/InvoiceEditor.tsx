'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { accountingApi, type AccountOption, type PartnerOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { invoicesApi, type InvoiceDraftPayload } from '@/lib/api/invoices.api';
import { recurringExpensesApi, type ExpenseFrequency } from '@/lib/api/recurringExpenses.api';
import { getIsoToday } from '@/lib/utils/date';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { CommandBar } from '@/components/layout/CommandBar';
import InvoiceLinesEditor, {
  computeTotals,
  emptyEditorLine,
  type EditorLine,
  type SupplyType,
} from '@/components/invoices/InvoiceLinesEditor';
import { ProductModal } from '@/components/invoices/ProductModal';
import { productsApi, type Product } from '@/lib/api/products.api';

type InvoiceType = 'sales_invoice' | 'purchase_invoice' | 'sales_credit_note' | 'purchase_credit_note';

type AiPrefillData = {
  partner_id?: string;
  invoice_date?: string | null;
  due_date?: string | null;
  currency?: string;
  notes?: string | null;
  lines?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>;
};

type InvoiceEditorProps = {
  mode: 'create' | 'edit';
  invoiceId?: string;
  defaultType?: InvoiceType;
  creditNoteForInvoiceId?: string;
  prefill?: AiPrefillData;
};

export default function InvoiceEditor({ mode, invoiceId, defaultType = 'sales_invoice', creditNoteForInvoiceId, prefill }: InvoiceEditorProps) {
  const t = useTranslations('invoices');
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [salesDefaults, setSalesDefaults] = useState<Partial<Record<SupplyType, string>>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [quickAddLine, setQuickAddLine] = useState<EditorLine | null>(null);
  const [type, setType] = useState<InvoiceType>(defaultType);
  const isCreditNote = type === 'sales_credit_note' || type === 'purchase_credit_note';
  const [partnerId, setPartnerId] = useState(prefill?.partner_id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useClientDateInput(() => prefill?.invoice_date || getIsoToday());
  const [dueDate, setDueDate] = useState(prefill?.due_date || '');
  const [currency, setCurrency] = useState(prefill?.currency || 'EUR');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState(prefill?.notes || '');
  const [lines, setLines] = useState<EditorLine[]>(
    prefill?.lines && prefill.lines.length > 0
      ? prefill.lines.map((l) => ({
          description: l.description,
          code: '',
          account_id: '',
          quantity: String(l.quantity),
          unit_price: String(l.unit_price),
          discount_percent: '0',
          tax_rate: String(l.tax_rate),
          supply_type: 'domestic' as const,
        }))
      : [emptyEditorLine()]
  );
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Recurring toggle (purchase invoices only)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMaxSum, setRecurringMaxSum] = useState('');
  const [recurringExpectedDay, setRecurringExpectedDay] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<ExpenseFrequency>('monthly');

  useEffect(() => {
    const loadBase = async () => {
      try {
        const [partnerItems, accountItems, settings, productItems] = await Promise.all([
          accountingApi.getPartners(),
          accountingApi.getAccounts(),
          accountingApi.getAccountingSettings().catch(() => null),
          productsApi.list().catch(() => [] as Product[]),
        ]);
        setPartners(partnerItems);
        setAccounts(accountItems);
        setProducts(productItems);
        if (settings) {
          const map: Partial<Record<SupplyType, string>> = {};
          if (settings.default_sales_account_id_domestic) map.domestic = settings.default_sales_account_id_domestic;
          if (settings.default_sales_account_id_intra_community) map.intra_community = settings.default_sales_account_id_intra_community;
          if (settings.default_sales_account_id_reverse_charge) map.reverse_charge = settings.default_sales_account_id_reverse_charge;
          if (settings.default_sales_account_id_third_country) map.third_country = settings.default_sales_account_id_third_country;
          setSalesDefaults(map);
        }
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
        setType(result.invoice.type as InvoiceType);
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
                code: (line.meta?.code as string) || '',
                account_id: line.account_id || '',
                quantity: String(line.quantity ?? 1),
                unit_price: String(line.unit_price ?? ''),
                discount_percent: String(line.discount_percent ?? 0),
                tax_rate: String(line.tax_rate ?? 0),
                supply_type: (line.supply_type as SupplyType) || 'domestic',
              }))
            : [emptyEditorLine()]
        );
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadInvoice();
  }, [invoiceId, mode]);

  const totals = useMemo(() => computeTotals(lines), [lines]);

  const buildPayload = (): InvoiceDraftPayload => ({
    type,
    partner_id: partnerId || undefined,
    invoice_number: invoiceNumber || undefined,
    invoice_date: invoiceDate,
    due_date: dueDate || undefined,
    currency,
    payment_reference: paymentReference || undefined,
    notes: notes || undefined,
    credit_note_for_invoice_id: creditNoteForInvoiceId || undefined,
    lines: lines.map((line) => ({
      description: line.description,
      account_id: line.account_id || undefined,
      quantity: Number(line.quantity || 0),
      unit_price: Number(line.unit_price || 0),
      discount_percent: Number(line.discount_percent || 0),
      tax_rate: Number(line.tax_rate || 0),
      supply_type: line.supply_type || 'domestic',
      meta: line.code ? { code: line.code } : undefined,
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

      // If recurring is ticked on a purchase invoice, upsert the recurring expense entry
      if (isRecurring && type === 'purchase_invoice' && partnerId) {
        const invoiceTotal = totals.total;
        const dominantAccountId = lines.find((l) => l.account_id)?.account_id || null;
        const partnerName = partners.find((p) => p.id === partnerId)?.name || '';
        const expectedDay = Number(recurringExpectedDay) || new Date(invoiceDate).getDate();
        const maxSum = Number(recurringMaxSum) || invoiceTotal;

        const { created } = await recurringExpensesApi.upsertFromInvoice({
          partner_id: partnerId,
          account_id: dominantAccountId,
          label: partnerName,
          expected_amount: invoiceTotal,
          max_amount: maxSum,
          currency_code: currency,
          expected_day_of_month: expectedDay,
          frequency: recurringFrequency,
          start_date: invoiceDate,
        });

        const tRecurring = created ? 'Created new recurring expense entry' : 'Updated existing recurring expense entry';
        setSuccessMessage((mode === 'create' ? t('invoiceDraftCreated') : t('invoiceDraftUpdated')) + ` · ${tRecurring}`);
      } else {
        setSuccessMessage(mode === 'create' ? t('invoiceDraftCreated') : t('invoiceDraftUpdated'));
      }

      const isSalesType = result.invoice.type === 'sales_invoice' || result.invoice.type === 'sales_credit_note';
      router.push(isSalesType ? '/invoices/sales' : '/invoices/purchase');
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const title = mode === 'create'
    ? (isCreditNote ? t('newCreditNote') : t('newInvoiceDraft'))
    : (isCreditNote ? t('editCreditNote') : t('editInvoiceDraft'));

  // Sales account pickers list only real revenue accounts (no fallback to all).
  const productAccounts = accounts.filter((a) => a.is_active && a.type === 'revenue');

  const saveAction = (
    <Button variant="primary" onClick={() => void handleSave()} disabled={isSaving || isLoading}>
      {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {mode === 'create' ? t('createDraft') : t('saveDraft')}
      <Kbd inverse>⌘S</Kbd>
    </Button>
  );

  return (
    <div className="flex min-h-full flex-col bg-[var(--a-surface)]">
      <CommandBar crumbs={[t('overview'), title]} actions={saveAction} />

      <div className="flex-1 space-y-5 px-4 pb-10 pt-4 sm:px-6 lg:px-7">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[var(--a-text)]">{title}</h1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
            {mode === 'create'
              ? (isCreditNote ? t('createCreditNoteDescription') : t('createInvoiceDraftDescription'))
              : t('editInvoiceDraftDescription')}
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-4 py-3 text-[13px] text-[var(--a-neg)]">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-[var(--a-pos-soft)] bg-[var(--a-pos-soft)] px-4 py-3 text-[13px] text-[var(--a-pos)]">
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-[10px] border border-[var(--a-border)] p-8 text-[13px] text-[var(--a-text-3)]">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('loadingInvoiceDraft')}
          </div>
        ) : (
          <>
            {/* Header detail card */}
            <div className="rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label={t('invoiceType')}>
                  <select value={type} onChange={(e) => setType(e.target.value as InvoiceType)} disabled={mode === 'edit'} className={`${selectClass} disabled:bg-[var(--a-surface-2)] disabled:text-[var(--a-text-3)]`}>
                    <option value="sales_invoice">{t('salesList')}</option>
                    <option value="purchase_invoice">{t('purchaseList')}</option>
                    <option value="sales_credit_note">{t('salesCreditNote')}</option>
                    <option value="purchase_credit_note">{t('purchaseCreditNote')}</option>
                  </select>
                </Field>
                <Field label={t('partner')}>
                  <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className={selectClass}>
                    <option value="">{t('selectPartner')}</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>{partner.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('invoiceNumber')}>
                  <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={inputClass} />
                </Field>
                <Field label={t('currency')}>
                  <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className={inputClass} />
                </Field>
                <Field label={t('invoiceDate')}>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label={t('dueDate')}>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label={t('paymentReference')}>
                  <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className={inputClass} />
                </Field>
                <Field label={t('notes')}>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
                </Field>
              </div>

              {/* Recurring toggle — purchase invoices only */}
              {type === 'purchase_invoice' && (
                <div className="mt-4 border-t border-[var(--a-border)] pt-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => {
                        setIsRecurring(e.target.checked);
                        if (e.target.checked) {
                          if (!recurringMaxSum) setRecurringMaxSum(totals.total.toFixed(2));
                          if (!recurringExpectedDay) setRecurringExpectedDay(String(new Date(invoiceDate).getDate() || 1));
                        }
                      }}
                      className="h-4 w-4 rounded border-[var(--a-border)] text-[var(--a-accent)]"
                    />
                    <span className="text-[13px] font-medium text-[var(--a-text)]">Recurring</span>
                  </label>

                  {isRecurring && (
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <Field label="Max sum">
                        <input type="number" value={recurringMaxSum} onChange={(e) => setRecurringMaxSum(e.target.value)} placeholder={totals.total.toFixed(2)} className={inputClass} />
                      </Field>
                      <Field label="Expected day of month">
                        <input type="number" min={1} max={31} value={recurringExpectedDay} onChange={(e) => setRecurringExpectedDay(e.target.value)} placeholder={String(new Date(invoiceDate).getDate() || 1)} className={inputClass} />
                      </Field>
                      <Field label="Frequency">
                        <select value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value as ExpenseFrequency)} className={selectClass}>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annual">Annual</option>
                        </select>
                      </Field>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lines */}
            <div>
              <div className="micro mb-2 text-[var(--a-text-3)]">{t('invoiceLines')}</div>
              <InvoiceLinesEditor
                lines={lines}
                onChange={setLines}
                accounts={accounts}
                showSupplyType
                currency={currency}
                accountFilterType={type === 'purchase_invoice' || type === 'purchase_credit_note' ? 'expense' : 'revenue'}
                supplyTypeDefaults={type === 'purchase_invoice' || type === 'purchase_credit_note' ? undefined : salesDefaults}
                products={products}
                onQuickAdd={(line) => setQuickAddLine(line)}
              />
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {mode === 'create' ? t('createDraft') : t('saveDraft')}
              </Button>
            </div>
          </>
        )}

        {quickAddLine && (
          <ProductModal
            initial={{
              name: quickAddLine.description,
              description: quickAddLine.description,
              unit_price: Number(quickAddLine.unit_price) || null,
              tax_rate: Number(quickAddLine.tax_rate) || null,
              supply_type: quickAddLine.supply_type,
              sales_account_id: quickAddLine.account_id || '',
            }}
            accounts={productAccounts}
            onClose={() => setQuickAddLine(null)}
            onSaved={async () => {
              setQuickAddLine(null);
              const items = await productsApi.list().catch(() => [] as Product[]);
              setProducts(items);
            }}
          />
        )}
      </div>
    </div>
  );
}

const inputClass =
  'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]';
const selectClass = inputClass;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="micro mb-1.5 text-[var(--a-text-3)]">{label}</div>
      {children}
    </label>
  );
}
