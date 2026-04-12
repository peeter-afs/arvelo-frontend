'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Tenant } from '@/lib/types/auth.types';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth.api';
import { tenantsApi } from '@/lib/api/tenants.api';
import { useAuthStore } from '@/lib/stores/auth.store';

const DEFAULT_FORM = {
  name: '',
  registry_code: '',
  vat_number: '',
  is_vat_registered: true,
  address: '',
  email: '',
  phone: '',
};

export default function CreateCompanyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, tenant, setTenant, setTokens } = useAuthStore();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [availableTenants, setAvailableTenants] = useState<Array<{
    tenant: { id: string; name: string; base_currency: string };
    role: 'owner' | 'admin' | 'accountant' | 'viewer';
    is_default: boolean;
  }>>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fromRegister = searchParams.get('source') === 'register';

  const checklist = useMemo(
    () => [
      'A fiscal year and 12 accounting periods for the current year',
      'Core journals for sales, purchases, bank, and general entries',
      'Default VAT rates and system accounts',
      'Accounting settings and billing defaults',
      'Owner access to the new company immediately',
    ],
    []
  );

  const handleChange = (field: keyof typeof DEFAULT_FORM, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (tenant) {
      return;
    }

    const loadTenants = async () => {
      setIsLoadingTenants(true);
      try {
        const memberships = await tenantsApi.listUserTenants();
        setAvailableTenants(memberships);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoadingTenants(false);
      }
    };

    void loadTenants();
  }, [tenant]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.name.trim()) {
      setErrorMessage('Company name is required.');
      return;
    }

    setActionLoading('create');
    try {
      const createdTenant = await tenantsApi.createTenant({
        name: form.name.trim(),
        registry_code: form.registry_code.trim() || undefined,
        vat_number: form.vat_number.trim() || undefined,
        is_vat_registered: form.is_vat_registered,
        address: form.address.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });

      const switched = await authApi.switchTenant(createdTenant.id);
      setTokens(switched.access_token, switched.refresh_token);
      setTenant(createdTenant, 'owner');
      setSuccessMessage(`Company ${createdTenant.name} created. Redirecting to your dashboard...`);

      setTimeout(() => {
        router.push('/');
      }, 250);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSwitchTenant = async (tenantId: string, tenantName: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setActionLoading(`switch-${tenantId}`);
    try {
      const switched = await authApi.switchTenant(tenantId);
      const memberships = availableTenants.find((item) => item.tenant.id === tenantId);
      setTokens(switched.access_token, switched.refresh_token);
      setTenant((memberships?.tenant ?? null) as Tenant | null, memberships?.role || null);
      setSuccessMessage(`Switched to ${tenantName}. Redirecting...`);
      setTimeout(() => {
        router.push('/');
      }, 250);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  if (tenant) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Company already selected</h1>
              <p className="mt-1 text-sm text-slate-600">
                You are currently working in <strong>{tenant.name}</strong>. Open the dashboard to continue.
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                <span>Go to dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="card overflow-hidden border-slate-200">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant bootstrap</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Create your company workspace</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Finish the real backend bootstrap now. This creates the tenant, fiscal year, journals, default accounts,
            VAT settings, and owner access in one step.
          </p>
          {fromRegister && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Your account is ready. Finish company setup now, or switch into an existing invited company below if one is already available.
            </div>
          )}
          {user && (
            <p className="mt-3 text-xs text-slate-500">
              Signed in as <strong>{user.email}</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Company name" required>
              <input
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Your Company OÜ"
                className="h-11 w-full rounded-xl border border-slate-200 px-4"
                disabled={actionLoading !== null}
              />
            </FormField>

            <FormField label="Registry code">
              <input
                value={form.registry_code}
                onChange={(event) => handleChange('registry_code', event.target.value)}
                placeholder="12345678"
                className="h-11 w-full rounded-xl border border-slate-200 px-4"
                disabled={actionLoading !== null}
              />
            </FormField>

            <FormField label="VAT number">
              <input
                value={form.vat_number}
                onChange={(event) => handleChange('vat_number', event.target.value)}
                placeholder="EE123456789"
                className="h-11 w-full rounded-xl border border-slate-200 px-4"
                disabled={actionLoading !== null}
              />
            </FormField>

            <FormField label="Company email">
              <input
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                placeholder="finance@company.ee"
                className="h-11 w-full rounded-xl border border-slate-200 px-4"
                disabled={actionLoading !== null}
              />
            </FormField>

            <FormField label="Phone">
              <input
                value={form.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                placeholder="+372 5555 5555"
                className="h-11 w-full rounded-xl border border-slate-200 px-4"
                disabled={actionLoading !== null}
              />
            </FormField>

            <FormField label="Address">
              <input
                value={form.address}
                onChange={(event) => handleChange('address', event.target.value)}
                placeholder="Street, city"
                className="h-11 w-full rounded-xl border border-slate-200 px-4"
                disabled={actionLoading !== null}
              />
            </FormField>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_vat_registered}
              onChange={(event) => handleChange('is_vat_registered', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              disabled={actionLoading !== null}
            />
            <span>
              Mark this company as VAT registered from the start. You can change account and VAT configuration later in settings.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={actionLoading !== null}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Create company workspace</span>
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-6">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Existing access</h2>
                <p className="mt-1 text-xs text-slate-500">Use an existing company if you were invited already.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAvailableTenants([]);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setIsLoadingTenants(true);
                  void tenantsApi.listUserTenants()
                    .then((memberships) => setAvailableTenants(memberships))
                    .catch((error) => setErrorMessage(getErrorMessage(error)))
                    .finally(() => setIsLoadingTenants(false));
                }}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
              >
                {isLoadingTenants ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="space-y-3 p-5">
            {isLoadingTenants ? (
              <div className="text-sm text-slate-500">Checking company memberships...</div>
            ) : availableTenants.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
                No existing company access found for this account.
              </div>
            ) : (
              availableTenants.map((membership) => (
                <div key={membership.tenant.id} className="rounded-xl border border-slate-100 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{membership.tenant.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Role {membership.role} · Base currency {membership.tenant.base_currency}
                      </div>
                    </div>
                    {membership.is_default && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Default
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSwitchTenant(membership.tenant.id, membership.tenant.name)}
                    disabled={actionLoading !== null}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {actionLoading === `switch-${membership.tenant.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    <span>Open this company</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">What happens next</h2>
          </div>
          <div className="space-y-3 p-5">
            {checklist.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
          <h2 className="text-base font-semibold text-slate-900">If you were expecting an invite</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            An existing owner or admin can add you to a company later. This screen is only for creating a new tenant workspace.
          </p>
        </div>
      </aside>
    </div>
  );
}

function FormField({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}
