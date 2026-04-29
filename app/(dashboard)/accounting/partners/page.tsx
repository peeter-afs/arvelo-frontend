'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import {
  businessRegistryApi,
  type BusinessRegistryCompany,
  type PartnerRegistrySyncLogItem,
} from '@/lib/api/businessRegistry.api';
import {
  accountingApi,
  type PartnerRecord,
  type PartnerRole,
  type PartnerWithBalance,
  type SupplierBankAccount,
} from '@/lib/api/accounting.api';
import { AddPartnerModal } from '@/components/partners/AddPartnerModal';

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

type BankAccountDraft = {
  id?: string;
  iban: string;
  bank_name: string;
  bic: string;
  currency_code: string;
  account_holder_name: string;
  is_default: boolean;
  is_active: boolean;
  notes: string;
};

const emptyPartnerForm = (): PartnerFormState => ({
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

const emptyBankAccountDraft = (): BankAccountDraft => ({
  iban: '',
  bank_name: '',
  bic: '',
  currency_code: 'EUR',
  account_holder_name: '',
  is_default: false,
  is_active: true,
  notes: '',
});

export default function BusinessPartnersPage() {
  const t = useTranslations('accounting');
  const [partners, setPartners] = useState<PartnerWithBalance[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<PartnerRecord | null>(null);
  const [roles, setRoles] = useState<PartnerRole[]>([]);
  const [bankAccounts, setBankAccounts] = useState<SupplierBankAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'supplier' | 'both'>('all');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Array<{
    partner: PartnerRecord;
    roles: string[];
    match_type: string;
    severity: string;
  }>>([]);
  const [form, setForm] = useState<PartnerFormState>(emptyPartnerForm());
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState<BankAccountDraft>(emptyBankAccountDraft());
  const [selectedRegistryCompany, setSelectedRegistryCompany] = useState<BusinessRegistryCompany | null>(null);
  const [registrySyncLog, setRegistrySyncLog] = useState<PartnerRegistrySyncLogItem[]>([]);
  const [includeTaxArrearsOnRefresh, setIncludeTaxArrearsOnRefresh] = useState(false);
  const [latestTaxArrears, setLatestTaxArrears] = useState<Record<string, any> | null>(null);

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesType = typeFilter === 'all' ? true : partner.type === typeFilter;
      const query = searchQuery.trim().toLowerCase();
      const haystack = [partner.name, partner.email, partner.reg_code, partner.vat_number, partner.city]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesType && (!query || haystack.includes(query));
    });
  }, [partners, searchQuery, typeFilter]);

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        const result = await accountingApi.listPartnersWithBalances();
        setPartners(result);
        if (result[0]?.id) {
          setSelectedPartnerId(result[0].id);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (isCreatingNew) {
      setSelectedPartner(null);
      setRoles([]);
      setBankAccounts([]);
      setForm(emptyPartnerForm());
      setDuplicateWarnings([]);
      setNewBankAccount(emptyBankAccountDraft());
      setSelectedRegistryCompany(null);
      setRegistrySyncLog([]);
      setLatestTaxArrears(null);
      return;
    }

    if (!selectedPartnerId) {
      setSelectedPartner(null);
      return;
    }

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setErrorMessage(null);
      try {
        const [partner, partnerRoles, supplierBankAccounts] = await Promise.all([
          accountingApi.getPartner(selectedPartnerId),
          accountingApi.getPartnerRoles(selectedPartnerId),
          accountingApi.getSupplierBankAccounts(selectedPartnerId),
        ]);
        setSelectedPartner(partner);
        setRoles(partnerRoles);
        setBankAccounts(supplierBankAccounts);
        setForm(mapPartnerToForm(partner));
        setDuplicateWarnings([]);
        setSelectedRegistryCompany(null);
        setLatestTaxArrears(null);

        if (partner.reg_code) {
          const syncLog = await businessRegistryApi.getPartnerSyncLog(selectedPartnerId, { limit: 10 });
          setRegistrySyncLog(syncLog.items);
        } else {
          setRegistrySyncLog([]);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    };

    void loadDetail();
  }, [selectedPartnerId, isCreatingNew]);

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

  const refreshPartners = async (preferredId?: string | null) => {
    const result = await accountingApi.listPartnersWithBalances();
    setPartners(result);
    if (preferredId) {
      setSelectedPartnerId(preferredId);
    } else if (!result.some((partner) => partner.id === selectedPartnerId)) {
      setSelectedPartnerId(result[0]?.id || null);
    }
  };

  const handleSavePartner = async () => {
    if (!selectedPartnerId) return;
    await runAction('save-partner', async () => {
      const payload = buildPartnerPayload(form);
      const savedPartner = await accountingApi.updatePartner(selectedPartnerId, payload);
      setSelectedPartnerId(savedPartner.id);
      await refreshPartners(savedPartner.id);
      setSuccessMessage(t('partnerUpdated'));
    });
  };

  const handleCheckDuplicates = async () => {
    await runAction('check-duplicates', async () => {
      const duplicates = await accountingApi.checkPartnerDuplicates({
        registry_code: form.reg_code || undefined,
        vat_number: form.vat_number || undefined,
        intended_role: form.type === 'both' ? 'supplier' : form.type,
        iban: newBankAccount.iban || undefined,
      });
      setDuplicateWarnings(duplicates);
      setSuccessMessage(duplicates.length > 0 ? t('potentialDuplicatesFound') : t('noPartnerDuplicatesFound'));
    });
  };

  const handleRegistryRefresh = async () => {
    if (!selectedPartnerId) return;

    await runAction('registry-refresh', async () => {
      const result = await businessRegistryApi.refreshPartner(selectedPartnerId, {
        include_tax_arrears: includeTaxArrearsOnRefresh,
        request_source: 'partner_form',
      });
      const refreshedPartner = result.partner as PartnerRecord;
      setSelectedPartner(refreshedPartner);
      setForm(mapPartnerToForm(refreshedPartner));
      setSelectedRegistryCompany(result.company);
      setLatestTaxArrears(result.tax_arrears || null);
      const syncLog = await businessRegistryApi.getPartnerSyncLog(selectedPartnerId, { limit: 10 });
      setRegistrySyncLog(syncLog.items);
      await refreshPartners(selectedPartnerId);
      setSuccessMessage(t('partnerRefreshedFromRegistry'));
    });
  };

  const handleAddRole = async (role: 'customer' | 'supplier') => {
    if (!selectedPartnerId) return;
    await runAction(`add-role-${role}`, async () => {
      await accountingApi.addPartnerRole(selectedPartnerId, role);
      const [partnerRoles, partner] = await Promise.all([
        accountingApi.getPartnerRoles(selectedPartnerId),
        accountingApi.getPartner(selectedPartnerId),
      ]);
      setRoles(partnerRoles);
      setSelectedPartner(partner);
      setForm(mapPartnerToForm(partner));
      await refreshPartners(selectedPartnerId);
      setSuccessMessage(t('partnerRoleAdded', { role: t(role) }));
    });
  };

  const handleCreateBankAccount = async () => {
    if (!selectedPartnerId) return;
    await runAction('create-bank-account', async () => {
      const created = await accountingApi.createSupplierBankAccount(selectedPartnerId, {
        iban: newBankAccount.iban,
        bank_name: newBankAccount.bank_name || undefined,
        bic: newBankAccount.bic || undefined,
        currency_code: newBankAccount.currency_code || undefined,
        account_holder_name: newBankAccount.account_holder_name || undefined,
        is_default: newBankAccount.is_default,
        is_active: newBankAccount.is_active,
        notes: newBankAccount.notes || undefined,
      });
      setBankAccounts((current) => sortBankAccounts([...current, created]));
      setNewBankAccount(emptyBankAccountDraft());
      await refreshPartners(selectedPartnerId);
      setSuccessMessage(t('supplierBankAccountAdded'));
    });
  };

  const handleUpdateBankAccount = async (account: SupplierBankAccount, updates: Partial<BankAccountDraft>) => {
    if (!selectedPartnerId) return;
    await runAction(`update-bank-${account.id}`, async () => {
      const updated = await accountingApi.updateSupplierBankAccount(selectedPartnerId, account.id, updates);
      setBankAccounts((current) => sortBankAccounts(current.map((item) => item.id === updated.id ? updated : item)));
      setSuccessMessage(t('supplierBankAccountUpdated'));
    });
  };

  const canManageBankAccounts = !!selectedPartnerId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('businessPartnersTitle')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('businessPartnersDescription')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => void refreshPartners(selectedPartnerId)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t('refreshPartners')}</span>
          </button>
          <button
            onClick={() => {
              setAddModalOpen(true);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addPartner')}</span>
          </button>
        </div>
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

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="grid gap-3">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('searchPartners')}
                  className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3"
                />
              </label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="h-11 rounded-lg border border-slate-200 px-3"
              >
                <option value="all">{t('allPartnerTypes')}</option>
                <option value="customer">{t('customerPlural')}</option>
                <option value="supplier">{t('supplierPlural')}</option>
                <option value="both">{t('both')}</option>
              </select>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">{t('partners')}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {isBootLoading ? (
                <div className="p-4 text-sm text-slate-500">{t('loadingPartners')}</div>
              ) : filteredPartners.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">{t('noPartnersCurrentFilter')}</div>
              ) : (
                filteredPartners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => {
                      setIsCreatingNew(false);
                      setSelectedPartnerId(partner.id);
                    }}
                    className={`block w-full px-4 py-3 text-left transition-colors ${selectedPartnerId === partner.id && !isCreatingNew ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{partner.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {t(partner.type)} · {partner.email || partner.reg_code || t('noIdentifier')}
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${partner.balance < 0 ? 'text-emerald-600' : partner.balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {partner.balance.toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {!selectedPartnerId && !isCreatingNew ? (
            <div className="card p-8 text-sm text-slate-500">{t('selectPartnerToView')}</div>
          ) : (
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {selectedPartner?.name || t('partnerDetail')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t('partnerDetailDescription')}
                  </p>
                </div>
                {selectedPartner?.reg_code && (
                  <button
                    onClick={handleRegistryRefresh}
                    disabled={!!actionLoading}
                    title={t('refreshFromBusinessRegistry')}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'registry-refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            {isDetailLoading ? (
              <div className="p-6 text-sm text-slate-500">{t('loadingPartnerDetail')}</div>
            ) : (
              <div className="space-y-4 p-4">
                {/* Identity */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{t('identity')}</div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label={t('type')} value={form.type} onChange={(value) => setForm((current) => ({ ...current, type: value as PartnerFormState['type'] }))} as="select" options={[
                      { label: t('customer'), value: 'customer' },
                      { label: t('supplier'), value: 'supplier' },
                      { label: t('both'), value: 'both' },
                    ]} />
                    <Field label={t('name')} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                    <Field label={t('code')} value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} />
                  </div>
                </div>

                {/* Registration */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">{t('registration')}</div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label={t('registryCode')} value={form.reg_code} onChange={(value) => setForm((current) => ({ ...current, reg_code: value }))} />
                    <Field label={t('vatNumber')} value={form.vat_number} onChange={(value) => setForm((current) => ({ ...current, vat_number: value.toUpperCase() }))} />
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">{t('contact')}</div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label={t('email')} value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
                    <Field label={t('phone')} value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                    <Field label={t('website')} value={form.website} onChange={(value) => setForm((current) => ({ ...current, website: value }))} />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">{t('location')}</div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label={t('countryCode')} value={form.country_code} onChange={(value) => setForm((current) => ({ ...current, country_code: value.toUpperCase() }))} />
                    <Field label={t('city')} value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
                    <Field label={t('postalCode')} value={form.postal_code} onChange={(value) => setForm((current) => ({ ...current, postal_code: value }))} />
                  </div>
                  <div className="mt-3">
                    <Field label={t('address')} value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
                  </div>
                </div>

                {/* Billing */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">{t('billing')}</div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label={t('paymentTermsDays')} value={form.payment_terms_days} onChange={(value) => setForm((current) => ({ ...current, payment_terms_days: value }))} />
                  </div>
                </div>

                {/* Other */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">{t('other')}</div>
                  <Field label={t('notes')} value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} as="textarea" />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleCheckDuplicates}
                    disabled={!!actionLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'check-duplicates' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    <span>{t('checkDuplicates')}</span>
                  </button>
                  <button
                    onClick={handleSavePartner}
                    disabled={!form.name || !!actionLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'save-partner' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{t('saveChanges')}</span>
                  </button>
                </div>

                {duplicateWarnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <ShieldAlert className="h-4 w-4" />
                      <span>{t('duplicateWarnings')}</span>
                    </div>
                    <div className="space-y-3">
                      {duplicateWarnings.map((warning) => (
                        <div key={warning.partner.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-900">
                          <div className="font-medium">{warning.partner.name}</div>
                          <div className="mt-1 text-xs text-amber-700">
                            {warning.match_type} · {t('severityValue', { value: warning.severity })} · {t('rolesValue', { roles: warning.roles.join(', ') || t('none') })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPartnerId && (
                  <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-900">{t('partnerRoles')}</div>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((role) => (
                          <span key={role.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {t(role.role)}
                          </span>
                        ))}
                        {!roles.some((role) => role.role === 'customer') && (
                          <button
                            onClick={() => handleAddRole('customer')}
                            disabled={!!actionLoading}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {t('addCustomerRole')}
                          </button>
                        )}
                        {!roles.some((role) => role.role === 'supplier') && (
                          <button
                            onClick={() => handleAddRole('supplier')}
                            disabled={!!actionLoading}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {t('addSupplierRole')}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-900">{t('registryRefresh')}</div>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={includeTaxArrearsOnRefresh}
                            onChange={(event) => setIncludeTaxArrearsOnRefresh(event.target.checked)}
                          />
                          <span>{t('includeTaxArrearsCheck')}</span>
                        </label>
                        <button
                          onClick={handleRegistryRefresh}
                          disabled={!selectedPartner?.reg_code || !!actionLoading}
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === 'registry-refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          <span>{t('refreshFromRegistry')}</span>
                        </button>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        {selectedPartner?.reg_code ? t('usingRegistryCode', { code: selectedPartner.reg_code }) : t('partnerHasNoRegistryCode')}
                      </div>

                      {(latestTaxArrears || selectedPartner?.tax_arrears_status) && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          <div className="font-medium text-slate-900">{t('latestTaxArrearsStatus')}</div>
                          <div className="mt-1 text-xs text-slate-600">
                            {t('statusValue', { value: latestTaxArrears?.status || selectedPartner?.tax_arrears_status || t('notAvailable') })} ·
                            {' '}
                            {t('amountValue', { value: String(latestTaxArrears?.arrearsAmount ?? selectedPartner?.tax_arrears_amount ?? t('notAvailable')) })} ·
                            {' '}
                            {t('noteValue', { value: latestTaxArrears?.note || selectedPartner?.tax_arrears_note || t('notAvailable') })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{t('supplierBankAccounts')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('supplierBankAccountsDescription')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {!canManageBankAccounts ? (
                <div className="text-sm text-slate-500">{t('createOrSelectPartnerFirst')}</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {bankAccounts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        {t('noSupplierBankAccountsYet')}
                      </div>
                    ) : (
                      bankAccounts.map((account) => (
                        <BankAccountCard
                          key={account.id}
                          account={account}
                          onToggleDefault={() => handleUpdateBankAccount(account, { is_default: !account.is_default || true })}
                          onToggleActive={() => handleUpdateBankAccount(account, { is_active: !account.is_active })}
                        />
                      ))
                    )}
                  </div>

                  {selectedPartnerId && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{t('addSupplierBankAccount')}</div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label={t('iban')} value={newBankAccount.iban} onChange={(value) => setNewBankAccount((current) => ({ ...current, iban: value.toUpperCase() }))} />
                        <Field label={t('bankName')} value={newBankAccount.bank_name} onChange={(value) => setNewBankAccount((current) => ({ ...current, bank_name: value }))} />
                        <Field label={t('bic')} value={newBankAccount.bic} onChange={(value) => setNewBankAccount((current) => ({ ...current, bic: value.toUpperCase() }))} />
                        <Field label={t('currency')} value={newBankAccount.currency_code} onChange={(value) => setNewBankAccount((current) => ({ ...current, currency_code: value.toUpperCase() }))} />
                        <Field label={t('accountHolder')} value={newBankAccount.account_holder_name} onChange={(value) => setNewBankAccount((current) => ({ ...current, account_holder_name: value }))} />
                        <Field label={t('notes')} value={newBankAccount.notes} onChange={(value) => setNewBankAccount((current) => ({ ...current, notes: value }))} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={newBankAccount.is_default}
                            onChange={(event) => setNewBankAccount((current) => ({ ...current, is_default: event.target.checked }))}
                          />
                          <span>{t('defaultAccount')}</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={newBankAccount.is_active}
                            onChange={(event) => setNewBankAccount((current) => ({ ...current, is_active: event.target.checked }))}
                          />
                          <span>{t('active')}</span>
                        </label>
                      </div>
                      <button
                        onClick={handleCreateBankAccount}
                        disabled={!newBankAccount.iban || !!actionLoading}
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'create-bank-account' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        <span>{t('addBankAccount')}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {selectedPartnerId && (
            <div className="card overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">{t('registrySyncLog')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('registrySyncLogDescription')}</p>
              </div>

              <div className="divide-y divide-slate-100">
                {registrySyncLog.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">{t('noRegistrySyncEventsYet')}</div>
                ) : (
                  registrySyncLog.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {item.sync_type} · {item.status}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.request_source || t('unknownSource')} · {item.registry_code || t('noRegistryCode')} · {formatDateTime(item.performed_at)}
                          </div>
                          {(item.error_message || item.error_code) && (
                            <div className="mt-2 text-xs text-red-600">
                              {item.error_code ? `${item.error_code}: ` : ''}{item.error_message}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          <div>{t('durationMs', { value: String(item.duration_ms ?? t('notAvailable')) })}</div>
                          <div>{t('actorValue', { value: item.performed_by || t('notAvailable') })}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <AddPartnerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={(partner) => {
          setAddModalOpen(false);
          setIsCreatingNew(false);
          setSelectedPartnerId(partner.id);
          void refreshPartners(partner.id);
          setSuccessMessage(t('partnerCreated'));
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  as = 'input',
  options,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | boolean;
  onChange: (value: string) => void;
  as?: 'input' | 'select' | 'textarea';
  options?: Array<{ label: string; value: string }>;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {as === 'select' ? (
        <select value={String(value)} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3">
          {options?.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea value={String(value)} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2" />
      ) : (
        <input type={type} value={String(value)} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-lg border border-slate-200 px-3" />
      )}
    </label>
  );
}

function BankAccountCard({
  account,
  onToggleDefault,
  onToggleActive,
}: {
  account: SupplierBankAccount;
  onToggleDefault: () => void;
  onToggleActive: () => void;
}) {
  const t = useTranslations('accounting');
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">{account.iban}</div>
          <div className="mt-1 text-xs text-slate-500">
            {account.account_holder_name || '-'} · {account.bank_name || t('noBankName')} · {account.currency_code || 'EUR'}
          </div>
          {account.notes && <div className="mt-2 text-xs text-slate-500">{account.notes}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${account.is_default ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
            {account.is_default ? t('default') : t('secondary')}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${account.is_active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
            {account.is_active ? t('active') : t('inactive')}
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onToggleDefault} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {t('setDefault')}
        </button>
        <button onClick={onToggleActive} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {account.is_active ? t('deactivate') : t('activate')}
        </button>
      </div>
    </div>
  );
}

function mapPartnerToForm(partner: PartnerRecord): PartnerFormState {
  return {
    type: partner.type,
    name: partner.name || '',
    code: partner.code || '',
    reg_code: partner.reg_code || '',
    vat_number: partner.vat_number || '',
    email: partner.email || '',
    phone: partner.phone || '',
    address: partner.address || '',
    postal_code: partner.postal_code || '',
    city: partner.city || '',
    website: partner.website || '',
    notes: partner.notes || '',
    country_code: partner.country_code || 'EE',
    payment_terms_days: partner.payment_terms_days !== null && partner.payment_terms_days !== undefined ? String(partner.payment_terms_days) : '',
    is_active: partner.is_active,
  };
}

function buildPartnerPayload(form: PartnerFormState) {
  return {
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
}

function sortBankAccounts(accounts: SupplierBankAccount[]) {
  return [...accounts].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
