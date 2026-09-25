'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { duplicateMatchLabel } from './duplicateMatchLabel';
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import type { BusinessRegistryCompany } from '@/lib/api/businessRegistry.api';
import { RegistryCompanySearch } from '@/components/business-registry/RegistryCompanySearch';
import {
  accountingApi,
  type AccountOption,
  type PartnerRecord,
} from '@/lib/api/accounting.api';
import { Button } from '@/components/ui/Button';

type PartnerFormState = {
  type: 'customer' | 'supplier' | 'both';
  name: string;
  code: string;
  reg_code: string;
  vat_number: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  website: string;
  notes: string;
  country_code: string;
  payment_terms_days: string;
  contact_name: string;
  credit_limit: string;
  default_expense_account_id: string;
  vat_input_account_id: string;
  accounts_payable_account_id: string;
  vat_deduction_pct: string;
  is_active: boolean;
};

const emptyForm = (): PartnerFormState => ({
  type: 'customer',
  name: '',
  code: '',
  reg_code: '',
  vat_number: '',
  email: '',
  phone: '',
  address: '',
  postal_code: '',
  city: '',
  website: '',
  notes: '',
  country_code: 'EE',
  payment_terms_days: '',
  contact_name: '',
  credit_limit: '',
  default_expense_account_id: '',
  vat_input_account_id: '',
  accounts_payable_account_id: '',
  vat_deduction_pct: '',
  is_active: true,
});

const fieldInput =
  'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (partner: PartnerRecord) => void;
  /** Partner type to start on. Defaults to customer, as on the partners page. */
  defaultType?: PartnerFormState['type'];
  /** Seeds both the registry search and the form name (e.g. a bank counterparty). */
  prefillName?: string;
  /** Where the prefill came from — shown as one extra line in the header. */
  sourceNote?: string;
};

export function AddPartnerModal({ open, onClose, onCreated, defaultType, prefillName, sourceNote }: Props) {
  const t = useTranslations('accounting');
  const [step, setStep] = useState<1 | 2>(1);
  const [registryQuery, setRegistryQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<BusinessRegistryCompany | null>(null);
  const [form, setForm] = useState<PartnerFormState>(emptyForm());
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  useEffect(() => { accountingApi.getAccounts().then(setAccounts).catch(() => setAccounts([])); }, []);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Array<{
    partner: PartnerRecord;
    roles: string[];
    match_type: string;
    severity: string;
  }>>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // The caller's prefill, read through a ref so the reset effect below stays
  // keyed on `open` alone — a prefill that changes while the modal is open must
  // not wipe what the user has typed.
  const seedRef = useRef({ defaultType, prefillName });
  seedRef.current = { defaultType, prefillName };

  // Reset to a clean form every time the modal opens, so the previously
  // created partner's data never carries over to the next one. (The close
  // branch above can't do this: the component returns null while closed, so
  // the dialog ref is gone and the effect would never run.)
  useEffect(() => {
    if (!open) return;
    const seededName = seedRef.current.prefillName?.trim() || '';
    setStep(1);
    // Seed the registry query too: with a name in hand the accountant is one
    // click from pulling the reg code and address out of the registry.
    setRegistryQuery(seededName);
    setSelectedCompany(null);
    setForm({ ...emptyForm(), type: seedRef.current.defaultType ?? 'customer', name: seededName });
    setDuplicateWarnings([]);
    setErrorMessage(null);
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleSelectCompany = (company: BusinessRegistryCompany) => {
    setErrorMessage(null);
    setSelectedCompany(company);
    setForm((current) => ({
      ...current,
      name: company.name || current.name,
      reg_code: company.registryCode || current.reg_code,
      vat_number: company.vatNumber || current.vat_number,
      address: company.legalAddress || current.address,
      postal_code: company.postalCode || current.postal_code,
      city: company.city || current.city,
      country_code: company.countryCode || current.country_code,
    }));
    setStep(2);
  };

  const handleCreateManually = () => {
    setSelectedCompany(null);
    // Keep whatever the caller seeded (type + name); only registry-derived
    // fields are cleared, since we are explicitly not using the registry.
    setForm({
      ...emptyForm(),
      type: seedRef.current.defaultType ?? 'customer',
      name: seedRef.current.prefillName?.trim() || '',
    });
    setStep(2);
  };

  const runDuplicateCheck = useCallback(
    async (regCode: string, vat: string, type: PartnerFormState['type'], name: string) => {
      // The name alone is enough to check: it is what catches "Motoral Eesti
      // Aktsiaselts" when "MOTORAL EESTI AS" already exists without a reg code.
      if (!regCode && !vat && name.trim().length < 3) {
        setDuplicateWarnings([]);
        return;
      }
      try {
        const duplicates = await accountingApi.checkPartnerDuplicates({
          registry_code: regCode || undefined,
          vat_number: vat || undefined,
          intended_role: type === 'both' ? 'supplier' : type,
          name: name.trim() || undefined,
        });
        setDuplicateWarnings(duplicates);
      } catch {
        // Duplicate check is advisory — never block partner creation on its failure.
      }
    },
    [],
  );

  // Check for duplicates automatically (debounced) once on step 2 whenever the
  // registry code / VAT / role changes — no separate button needed.
  useEffect(() => {
    if (!open || step !== 2) return;
    const handle = setTimeout(() => {
      runDuplicateCheck(form.reg_code.trim(), form.vat_number.trim(), form.type, form.name);
    }, 400);
    return () => clearTimeout(handle);
  }, [open, step, form.reg_code, form.vat_number, form.type, form.name, runDuplicateCheck]);

  const handleCreate = async () => {
    setLoading('create');
    setErrorMessage(null);
    try {
      const payload = {
        type: form.type,
        name: form.name,
        code: form.code || undefined,
        reg_code: form.reg_code || undefined,
        vat_number: form.vat_number || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        postal_code: form.postal_code || undefined,
        city: form.city || undefined,
        website: form.website || undefined,
        notes: form.notes || undefined,
        country_code: form.country_code || undefined,
        payment_terms_days: form.payment_terms_days ? Number(form.payment_terms_days) : undefined,
        contact_name: form.contact_name || undefined,
        credit_limit: form.credit_limit.trim() ? Number(form.credit_limit.replace(',', '.')) : undefined,
        default_expense_account_id: form.default_expense_account_id || undefined,
        vat_input_account_id: form.vat_input_account_id || undefined,
        accounts_payable_account_id: form.accounts_payable_account_id || undefined,
        vat_deduction_pct: form.vat_deduction_pct.trim() ? Number(form.vat_deduction_pct.replace(',', '.')) : undefined,
        is_active: form.is_active,
      };
      const partner = await accountingApi.createPartner(payload);
      onCreated(partner);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={onClose}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm open:flex open:items-end open:justify-center sm:open:items-center sm:p-4"
    >
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[88vh] sm:max-w-[640px] sm:rounded-2xl">
        {/* Handle bar for mobile */}
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[var(--a-border-strong)]" />
        </div>

        {/* Sticky header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--a-border)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--a-text)]">
              {step === 1 ? t('addNewPartner') : selectedCompany ? t('createPartner') : t('createPartnerManually')}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--a-text-2)]">
              {step === 1
                ? t('addPartnerStepOneDescription')
                : selectedCompany
                  ? t('prefilledFromCompany', { company: selectedCompany.name || selectedCompany.registryCode || '' })
                  : t('fillPartnerDetailsBelow')}
            </p>
            {sourceNote && (
              <p className="mt-1 truncate font-mono text-[11.5px] text-[var(--a-text-3)]" title={sourceNote}>
                {t('partnerSource')} · {sourceNote}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-3 py-2.5 text-[12.5px] text-[var(--a-neg)]">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Kept mounted on step 2 so "Back" returns to the same results. */}
          <div className={step === 1 ? undefined : 'hidden'}>
            <RegistryCompanySearch
              key={registryQuery}
              initialQuery={registryQuery}
              onSelect={handleSelectCompany}
              onCreateManually={handleCreateManually}
            />
          </div>
          {step === 2 && (
            <StepTwo form={form} setForm={setForm} accounts={accounts} duplicateWarnings={duplicateWarnings} />
          )}
        </div>

        {/* Sticky footer (step 2 actions) */}
        {step === 2 && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--a-border)] px-6 py-3.5">
            <Button onClick={() => setStep(1)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('back')}
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!form.name || !!loading}>
              {loading === 'create' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {t('createPartnerButton')}
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}

function StepTwo({
  form,
  setForm,
  accounts,
  duplicateWarnings,
}: {
  form: PartnerFormState;
  setForm: React.Dispatch<React.SetStateAction<PartnerFormState>>;
  accounts: AccountOption[];
  duplicateWarnings: Array<{ partner: PartnerRecord; roles: string[]; match_type: string; severity: string }>;
}) {
  const t = useTranslations('accounting');
  return (
    <div className="space-y-5">
      <Section label={t('identity')}>
        <ModalField label={t('type')} value={form.type} onChange={(v) => setForm((c) => ({ ...c, type: v as PartnerFormState['type'] }))} as="select" options={[
          { label: t('customer'), value: 'customer' },
          { label: t('supplier'), value: 'supplier' },
          { label: t('both'), value: 'both' },
        ]} />
        <ModalField label={t('name')} value={form.name} onChange={(v) => setForm((c) => ({ ...c, name: v }))} />
        <ModalField label={t('code')} value={form.code} onChange={(v) => setForm((c) => ({ ...c, code: v }))} />
        <ModalField label={t('registryCode')} value={form.reg_code} onChange={(v) => setForm((c) => ({ ...c, reg_code: v }))} />
        <ModalField label={t('vatNumber')} value={form.vat_number} onChange={(v) => setForm((c) => ({ ...c, vat_number: v.toUpperCase() }))} />
      </Section>

      <Section label={t('contact')}>
        <ModalField label={t('contactName')} value={form.contact_name} onChange={(v) => setForm((c) => ({ ...c, contact_name: v }))} />
        <ModalField label={t('email')} value={form.email} onChange={(v) => setForm((c) => ({ ...c, email: v }))} />
        <ModalField label={t('phone')} value={form.phone} onChange={(v) => setForm((c) => ({ ...c, phone: v }))} />
        <ModalField label={t('website')} value={form.website} onChange={(v) => setForm((c) => ({ ...c, website: v }))} />
      </Section>

      <Section label={t('location')}>
        <ModalField label={t('countryCode')} value={form.country_code} onChange={(v) => setForm((c) => ({ ...c, country_code: v.toUpperCase() }))} />
        <ModalField label={t('city')} value={form.city} onChange={(v) => setForm((c) => ({ ...c, city: v }))} />
        <ModalField label={t('postalCode')} value={form.postal_code} onChange={(v) => setForm((c) => ({ ...c, postal_code: v }))} />
        <ModalField label={t('paymentTermsDays')} value={form.payment_terms_days} onChange={(v) => setForm((c) => ({ ...c, payment_terms_days: v }))} />
        <ModalField label={t('creditLimit')} value={form.credit_limit} onChange={(v) => setForm((c) => ({ ...c, credit_limit: v }))} />
        {form.type !== 'customer' && (
          <>
            <ModalField label={t('defaultExpenseAccount')} value={form.default_expense_account_id} onChange={(v) => setForm((c) => ({ ...c, default_expense_account_id: v }))} as="select" options={[{ label: `— ${t('fromSettings')}`, value: '' }, ...accounts.filter((a) => a.is_active && (a.type === 'expense' || a.type === 'asset')).map((a) => ({ label: `${a.code} ${a.name}`, value: a.id }))]} />
            <ModalField label={t('vatDeductionPct')} value={form.vat_deduction_pct} onChange={(v) => setForm((c) => ({ ...c, vat_deduction_pct: v }))} />
          </>
        )}
        <div className="sm:col-span-2">
          <ModalField label={t('address')} value={form.address} onChange={(v) => setForm((c) => ({ ...c, address: v }))} />
        </div>
      </Section>

      <Section label={t('other')}>
        <div className="sm:col-span-2">
          <ModalField label={t('notes')} value={form.notes} onChange={(v) => setForm((c) => ({ ...c, notes: v }))} as="textarea" />
        </div>
      </Section>

      {duplicateWarnings.length > 0 && (
        <div className="rounded-lg border border-[var(--a-warn-soft)] bg-[var(--a-warn-soft)] p-3.5">
          <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--a-warn)]">
            <ShieldAlert className="h-4 w-4" />
            <span>{t('potentialDuplicatesFound')}</span>
          </div>
          <div className="space-y-2">
            {duplicateWarnings.map((w) => (
              <div key={w.partner.id} className="rounded-lg border border-[var(--a-warn-soft)] bg-[var(--a-surface)] p-3 text-[12.5px] text-[var(--a-text)]">
                <div className="font-medium">{w.partner.name}</div>
                <div className="mt-1 text-[11.5px] text-[var(--a-text-3)]">
                  {duplicateMatchLabel(t, w.match_type)} · {t('severityValue', { value: w.severity })} · {t('rolesValue', { roles: w.roles.join(', ') || t('none') })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="micro mb-2 text-[var(--a-text-3)]">{label}</div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ModalField({
  label,
  value,
  onChange,
  as = 'input',
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  as?: 'input' | 'select' | 'textarea';
  options?: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="micro mb-1.5 block text-[var(--a-text-3)]">{label}</span>
      {as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldInput}>
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : as === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldInput} min-h-[68px] py-2`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={fieldInput} />
      )}
    </label>
  );
}
