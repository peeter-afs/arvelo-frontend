'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import {
  businessRegistryApi,
  type BusinessRegistryCompany,
  type BusinessRegistrySearchItem,
} from '@/lib/api/businessRegistry.api';
import {
  accountingApi,
  type PartnerRecord,
} from '@/lib/api/accounting.api';

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
  is_active: true,
});

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (partner: PartnerRecord) => void;
};

export function AddPartnerModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [registryQuery, setRegistryQuery] = useState('');
  const [registryResults, setRegistryResults] = useState<BusinessRegistrySearchItem[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<BusinessRegistryCompany | null>(null);
  const [form, setForm] = useState<PartnerFormState>(emptyForm());
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
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
      setStep(1);
      setRegistryQuery('');
      setRegistryResults([]);
      setSelectedCompany(null);
      setForm(emptyForm());
      setDuplicateWarnings([]);
      setErrorMessage(null);
    }
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleRegistrySearch = async () => {
    setLoading('search');
    setErrorMessage(null);
    try {
      const result = await businessRegistryApi.searchCompanies(registryQuery);
      setRegistryResults(result.items);
      if (result.items.length === 0) {
        setErrorMessage('No Business Registry matches found.');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

  const handleSelectCompany = async (item: BusinessRegistrySearchItem) => {
    if (!item.registryCode) {
      setErrorMessage('Selected result has no registry code.');
      return;
    }
    setLoading(`company-${item.registryCode}`);
    setErrorMessage(null);
    try {
      const result = await businessRegistryApi.getCompany(item.registryCode);
      const company = result.company;
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
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

  const handleCreateManually = () => {
    setSelectedCompany(null);
    setForm(emptyForm());
    setStep(2);
  };

  const handleCheckDuplicates = async () => {
    setLoading('check-duplicates');
    setErrorMessage(null);
    try {
      const duplicates = await accountingApi.checkPartnerDuplicates({
        registry_code: form.reg_code || undefined,
        vat_number: form.vat_number || undefined,
        intended_role: form.type === 'both' ? 'supplier' : form.type,
      });
      setDuplicateWarnings(duplicates);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

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
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm open:flex open:items-end open:justify-center sm:open:items-center"
    >
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-200 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-[560px] sm:rounded-2xl">
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {step === 1 ? 'Add New Partner' : selectedCompany ? 'Create Partner' : 'Create Partner Manually'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {step === 1
                  ? 'Search the Estonian Business Registry to auto-fill company details, or create a partner manually.'
                  : selectedCompany
                    ? `Pre-filled from ${selectedCompany.name || selectedCompany.registryCode}. Review and adjust.`
                    : 'Fill in the partner details below.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {step === 1 ? (
            <StepOne
              registryQuery={registryQuery}
              setRegistryQuery={setRegistryQuery}
              registryResults={registryResults}
              loading={loading}
              onSearch={handleRegistrySearch}
              onSelectCompany={handleSelectCompany}
              onCreateManually={handleCreateManually}
            />
          ) : (
            <StepTwo
              form={form}
              setForm={setForm}
              duplicateWarnings={duplicateWarnings}
              loading={loading}
              onBack={() => setStep(1)}
              onCheckDuplicates={handleCheckDuplicates}
              onCreate={handleCreate}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}

function StepOne({
  registryQuery,
  setRegistryQuery,
  registryResults,
  loading,
  onSearch,
  onSelectCompany,
  onCreateManually,
}: {
  registryQuery: string;
  setRegistryQuery: (q: string) => void;
  registryResults: BusinessRegistrySearchItem[];
  loading: string | null;
  onSearch: () => void;
  onSelectCompany: (item: BusinessRegistrySearchItem) => void;
  onCreateManually: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={registryQuery}
          onChange={(e) => setRegistryQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && registryQuery.trim().length >= 2) onSearch();
          }}
          placeholder="Company name or registry code"
          className="h-11 rounded-lg border border-slate-200 px-3"
          autoFocus
        />
        <button
          onClick={onSearch}
          disabled={registryQuery.trim().length < 2 || loading === 'search'}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === 'search' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span>Search registry</span>
        </button>
      </div>

      {registryResults.length > 0 && (
        <div className="space-y-2">
          {registryResults.map((item) => (
            <button
              key={`${item.registryCode}-${item.name}`}
              onClick={() => onSelectCompany(item)}
              disabled={!item.registryCode || !!loading}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-[var(--primary)] hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">{item.name || 'Unnamed company'}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.registryCode || 'No registry code'} · {item.vatNumber || 'No VAT'} · {item.registryStatus || 'No status'}
                </div>
              </div>
              {loading === `company-${item.registryCode}` ? (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-400" />
              ) : (
                <Plus className="h-4 w-4 flex-shrink-0 text-slate-400" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-sm text-slate-400 before:flex-1 before:h-px before:bg-slate-200 after:flex-1 after:h-px after:bg-slate-200">
        or
      </div>

      <button
        onClick={onCreateManually}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Create manually
      </button>
    </div>
  );
}

function StepTwo({
  form,
  setForm,
  duplicateWarnings,
  loading,
  onBack,
  onCheckDuplicates,
  onCreate,
}: {
  form: PartnerFormState;
  setForm: React.Dispatch<React.SetStateAction<PartnerFormState>>;
  duplicateWarnings: Array<{ partner: PartnerRecord; roles: string[]; match_type: string; severity: string }>;
  loading: string | null;
  onBack: () => void;
  onCheckDuplicates: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Identity */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Identity</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModalField label="Type" value={form.type} onChange={(v) => setForm((c) => ({ ...c, type: v as PartnerFormState['type'] }))} as="select" options={[
            { label: 'Customer', value: 'customer' },
            { label: 'Supplier', value: 'supplier' },
            { label: 'Both', value: 'both' },
          ]} />
          <ModalField label="Name" value={form.name} onChange={(v) => setForm((c) => ({ ...c, name: v }))} />
          <ModalField label="Code" value={form.code} onChange={(v) => setForm((c) => ({ ...c, code: v }))} />
        </div>
      </div>

      {/* Registration */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">Registration</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModalField label="Registry code" value={form.reg_code} onChange={(v) => setForm((c) => ({ ...c, reg_code: v }))} />
          <ModalField label="VAT number" value={form.vat_number} onChange={(v) => setForm((c) => ({ ...c, vat_number: v.toUpperCase() }))} />
        </div>
      </div>

      {/* Contact */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">Contact</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModalField label="Email" value={form.email} onChange={(v) => setForm((c) => ({ ...c, email: v }))} />
          <ModalField label="Phone" value={form.phone} onChange={(v) => setForm((c) => ({ ...c, phone: v }))} />
          <ModalField label="Website" value={form.website} onChange={(v) => setForm((c) => ({ ...c, website: v }))} />
        </div>
      </div>

      {/* Location */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">Location</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModalField label="Country code" value={form.country_code} onChange={(v) => setForm((c) => ({ ...c, country_code: v.toUpperCase() }))} />
          <ModalField label="City" value={form.city} onChange={(v) => setForm((c) => ({ ...c, city: v }))} />
          <ModalField label="Postal code" value={form.postal_code} onChange={(v) => setForm((c) => ({ ...c, postal_code: v }))} />
        </div>
        <div className="mt-3">
          <ModalField label="Address" value={form.address} onChange={(v) => setForm((c) => ({ ...c, address: v }))} />
        </div>
      </div>

      {/* Billing */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">Billing</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModalField label="Payment terms days" value={form.payment_terms_days} onChange={(v) => setForm((c) => ({ ...c, payment_terms_days: v }))} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">Other</div>
        <ModalField label="Notes" value={form.notes} onChange={(v) => setForm((c) => ({ ...c, notes: v }))} as="textarea" />
      </div>

      {/* Duplicate warnings */}
      {duplicateWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <ShieldAlert className="h-4 w-4" />
            <span>Potential duplicates found</span>
          </div>
          <div className="space-y-2">
            {duplicateWarnings.map((w) => (
              <div key={w.partner.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-900">
                <div className="font-medium">{w.partner.name}</div>
                <div className="mt-1 text-xs text-amber-700">
                  {w.match_type} · severity {w.severity} · roles {w.roles.join(', ') || 'none'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={onBack}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="flex gap-3">
          <button
            onClick={onCheckDuplicates}
            disabled={!!loading}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'check-duplicates' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            <span>Check duplicates</span>
          </button>
          <button
            onClick={onCreate}
            disabled={!form.name || !!loading}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Create partner</span>
          </button>
        </div>
      </div>
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
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3">
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : as === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3" />
      )}
    </label>
  );
}
