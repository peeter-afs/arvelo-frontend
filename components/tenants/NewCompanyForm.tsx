'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import type { BusinessRegistryCompany } from '@/lib/api/businessRegistry.api';
import type { CompanyInput } from '@/lib/api/tenants.api';
import { Button } from '@/components/ui/Button';
import {
  RegistryCompanySearch,
  formatRegistryAddress,
} from '@/components/business-registry/RegistryCompanySearch';

type FormState = {
  name: string;
  registry_code: string;
  vat_number: string;
  is_vat_registered: boolean;
  legal_form: string;
  address: string;
  email: string;
  phone: string;
};

const EMPTY: FormState = {
  name: '',
  registry_code: '',
  vat_number: '',
  is_vat_registered: false,
  legal_form: '',
  address: '',
  email: '',
  phone: '',
};

const fieldInput =
  'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)] disabled:opacity-60';

type Props = {
  onSubmit: (payload: CompanyInput) => Promise<void>;
  submitLabel: string;
  onCancel?: () => void;
};

/**
 * New company (tenant): search äriregister first, then review the prefilled
 * details. Runs without a tenant context, so it uses the lookup endpoints.
 */
export function NewCompanyForm({ onSubmit, submitLabel, onCancel }: Props) {
  const t = useTranslations('clients');
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSelect = (company: BusinessRegistryCompany) => {
    setForm({
      ...EMPTY,
      name: company.name || '',
      registry_code: company.registryCode || '',
      vat_number: company.vatNumber || '',
      // A VAT number in the registry is the evidence of VAT registration.
      is_vat_registered: Boolean(company.vatNumber),
      legal_form: company.legalForm || '',
      address: formatRegistryAddress(company),
    });
    setPrefilledFrom(company.name || company.registryCode);
    setError(null);
    setStep('details');
  };

  const handleManual = () => {
    setForm(EMPTY);
    setPrefilledFrom(null);
    setError(null);
    setStep('details');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        registry_code: form.registry_code.trim() || undefined,
        vat_number: form.vat_number.trim() || undefined,
        is_vat_registered: form.is_vat_registered,
        legal_form: form.legal_form.trim() || undefined,
        address: form.address.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kept mounted on the details step so "Back" returns to the same results. */}
      <div className={step === 'search' ? 'space-y-3' : 'hidden'}>
        <p className="text-[12.5px] text-[var(--a-text-2)]">{t('searchStepHint')}</p>
        <RegistryCompanySearch
          mode="lookup"
          onSelect={handleSelect}
          onCreateManually={handleManual}
          manualLabel={t('enterManually')}
        />
        {onCancel && (
          <div className="flex justify-end">
            <Button onClick={onCancel}>{t('cancel')}</Button>
          </div>
        )}
      </div>

      {step === 'details' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {prefilledFrom && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--a-accent-soft-2)] px-3 py-2 text-[12.5px] text-[var(--a-text-2)]">
              <Building2 className="h-4 w-4 shrink-0 text-[var(--a-accent)]" />
              <span>{t('prefilledFrom', { company: prefilledFrom })}</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-3 py-2.5 text-[12.5px] text-[var(--a-neg)]">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('name')} required className="sm:col-span-2">
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={fieldInput}
                disabled={submitting}
                autoFocus
              />
            </Field>
            <Field label={t('registryCode')}>
              <input value={form.registry_code} onChange={(e) => set('registry_code', e.target.value)} className={fieldInput} disabled={submitting} />
            </Field>
            <Field label={t('legalForm')}>
              <input value={form.legal_form} onChange={(e) => set('legal_form', e.target.value)} placeholder="OÜ" className={fieldInput} disabled={submitting} />
            </Field>
            <Field label={t('vatNumber')}>
              <input value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} placeholder="EE123456789" className={fieldInput} disabled={submitting} />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-[13px] text-[var(--a-text)]">
              <input
                type="checkbox"
                checked={form.is_vat_registered}
                onChange={(e) => set('is_vat_registered', e.target.checked)}
                className="h-4 w-4 rounded border-[var(--a-border)]"
                disabled={submitting}
              />
              <span>{t('vatRegistered')}</span>
            </label>
            <Field label={t('address')} className="sm:col-span-2">
              <input value={form.address} onChange={(e) => set('address', e.target.value)} className={fieldInput} disabled={submitting} />
            </Field>
            <Field label={t('email')}>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={fieldInput} disabled={submitting} />
            </Field>
            <Field label={t('phone')}>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={fieldInput} disabled={submitting} />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--a-border)] pt-4">
            <Button onClick={() => setStep('search')} disabled={submitting}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('back')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !form.name.trim()}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">
        {label} {required && <span className="text-[var(--a-neg)]">*</span>}
      </span>
      {children}
    </label>
  );
}
