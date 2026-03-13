'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
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
  type BusinessRegistrySearchItem,
} from '@/lib/api/businessRegistry.api';
import {
  accountingApi,
  type PartnerRecord,
  type PartnerRole,
  type PartnerWithBalance,
  type SupplierBankAccount,
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
  const [newBankAccount, setNewBankAccount] = useState<BankAccountDraft>(emptyBankAccountDraft());
  const [registryQuery, setRegistryQuery] = useState('');
  const [registrySearchResults, setRegistrySearchResults] = useState<BusinessRegistrySearchItem[]>([]);
  const [selectedRegistryCompany, setSelectedRegistryCompany] = useState<BusinessRegistryCompany | null>(null);

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
      setRegistryQuery('');
      setRegistrySearchResults([]);
      setSelectedRegistryCompany(null);
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
    await runAction('save-partner', async () => {
      const payload = buildPartnerPayload(form);
      const savedPartner = isCreatingNew
        ? await accountingApi.createPartner(payload)
        : await accountingApi.updatePartner(selectedPartnerId as string, payload);

      setIsCreatingNew(false);
      setSelectedPartnerId(savedPartner.id);
      await refreshPartners(savedPartner.id);
      setSuccessMessage(isCreatingNew ? 'Partner created.' : 'Partner updated.');
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
      setSuccessMessage(duplicates.length > 0 ? 'Potential duplicates found.' : 'No partner duplicates found.');
    });
  };

  const handleRegistrySearch = async () => {
    await runAction('registry-search', async () => {
      const result = await businessRegistryApi.searchCompanies(registryQuery);
      setRegistrySearchResults(result.items);
      setSuccessMessage(result.items.length > 0 ? 'Business Registry results loaded.' : 'No Business Registry matches found.');
    });
  };

  const handleRegistryAutofill = async (item: BusinessRegistrySearchItem) => {
    if (!item.registryCode) {
      setErrorMessage('Selected Business Registry result has no registry code.');
      return;
    }

    await runAction(`registry-company-${item.registryCode}`, async () => {
      const result = await businessRegistryApi.getCompany(item.registryCode as string);
      const company = result.company;
      setSelectedRegistryCompany(company);
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
      setSuccessMessage(`Autofilled partner data from Business Registry for ${company.registryCode || company.name || 'selected company'}.`);
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
      setSuccessMessage(`Role ${role} added.`);
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
      setSuccessMessage('Supplier bank account added.');
    });
  };

  const handleUpdateBankAccount = async (account: SupplierBankAccount, updates: Partial<BankAccountDraft>) => {
    if (!selectedPartnerId) return;
    await runAction(`update-bank-${account.id}`, async () => {
      const updated = await accountingApi.updateSupplierBankAccount(selectedPartnerId, account.id, updates);
      setBankAccounts((current) => sortBankAccounts(current.map((item) => item.id === updated.id ? updated : item)));
      setSuccessMessage('Supplier bank account updated.');
    });
  };

  const canManageBankAccounts = isCreatingNew ? form.type !== 'customer' : !!selectedPartnerId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Business Partners</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customers and suppliers, maintain core master data, and store supplier bank accounts used by payment batches.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => void refreshPartners(selectedPartnerId)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setIsCreatingNew(true);
              setSelectedPartnerId(null);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Partner</span>
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
                  placeholder="Search partners"
                  className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3"
                />
              </label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="h-11 rounded-lg border border-slate-200 px-3"
              >
                <option value="all">All partner types</option>
                <option value="customer">Customers</option>
                <option value="supplier">Suppliers</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Partners</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {isBootLoading ? (
                <div className="p-4 text-sm text-slate-500">Loading partners…</div>
              ) : filteredPartners.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No partners for the current filter.</div>
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
                          {partner.type} · {partner.email || partner.reg_code || 'No identifier'}
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
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {isCreatingNew ? 'New partner' : selectedPartner?.name || 'Partner detail'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Core partner details, supplier/customer role state, and duplicate checks.
              </p>
            </div>

            {isDetailLoading ? (
              <div className="p-6 text-sm text-slate-500">Loading partner detail…</div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Business Registry lookup</div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      value={registryQuery}
                      onChange={(event) => setRegistryQuery(event.target.value)}
                      placeholder="Company name or registry code"
                      className="h-11 rounded-lg border border-slate-200 px-3"
                    />
                    <button
                      onClick={handleRegistrySearch}
                      disabled={registryQuery.trim().length < 2 || !!actionLoading}
                      className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === 'registry-search' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span>Search registry</span>
                    </button>
                  </div>

                  {selectedRegistryCompany && (
                    <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                      Autofill source: {selectedRegistryCompany.name || '-'} · {selectedRegistryCompany.registryCode || '-'} · {selectedRegistryCompany.sourceTimestamp}
                    </div>
                  )}

                  {registrySearchResults.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {registrySearchResults.map((item) => (
                        <div key={`${item.registryCode}-${item.name}`} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{item.name || 'Unnamed company'}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.registryCode || 'No registry code'} · {item.vatNumber || 'No VAT'} · {item.registryStatus || 'No status'}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRegistryAutofill(item)}
                            disabled={!item.registryCode || !!actionLoading}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionLoading === `registry-company-${item.registryCode}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            <span>Use this company</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Type" value={form.type} onChange={(value) => setForm((current) => ({ ...current, type: value as PartnerFormState['type'] }))} as="select" options={[
                    { label: 'Customer', value: 'customer' },
                    { label: 'Supplier', value: 'supplier' },
                    { label: 'Both', value: 'both' },
                  ]} />
                  <Field label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                  <Field label="Code" value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} />
                  <Field label="Registry code" value={form.reg_code} onChange={(value) => setForm((current) => ({ ...current, reg_code: value }))} />
                  <Field label="VAT number" value={form.vat_number} onChange={(value) => setForm((current) => ({ ...current, vat_number: value.toUpperCase() }))} />
                  <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
                  <Field label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                  <Field label="Website" value={form.website} onChange={(value) => setForm((current) => ({ ...current, website: value }))} />
                  <Field label="Country code" value={form.country_code} onChange={(value) => setForm((current) => ({ ...current, country_code: value.toUpperCase() }))} />
                  <Field label="City" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
                  <Field label="Postal code" value={form.postal_code} onChange={(value) => setForm((current) => ({ ...current, postal_code: value }))} />
                  <Field label="Payment terms days" value={form.payment_terms_days} onChange={(value) => setForm((current) => ({ ...current, payment_terms_days: value }))} />
                </div>

                <Field label="Address" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
                <Field label="Notes" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} as="textarea" />

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleCheckDuplicates}
                    disabled={!!actionLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'check-duplicates' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    <span>Check duplicates</span>
                  </button>
                  <button
                    onClick={handleSavePartner}
                    disabled={!form.name || !!actionLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === 'save-partner' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{isCreatingNew ? 'Create partner' : 'Save changes'}</span>
                  </button>
                </div>

                {duplicateWarnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Duplicate warnings</span>
                    </div>
                    <div className="space-y-3">
                      {duplicateWarnings.map((warning) => (
                        <div key={warning.partner.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-900">
                          <div className="font-medium">{warning.partner.name}</div>
                          <div className="mt-1 text-xs text-amber-700">
                            {warning.match_type} · severity {warning.severity} · roles {warning.roles.join(', ') || 'none'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isCreatingNew && selectedPartnerId && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 text-sm font-semibold text-slate-900">Partner roles</div>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <span key={role.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {role.role}
                        </span>
                      ))}
                      {!roles.some((role) => role.role === 'customer') && (
                        <button
                          onClick={() => handleAddRole('customer')}
                          disabled={!!actionLoading}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Add customer role
                        </button>
                      )}
                      {!roles.some((role) => role.role === 'supplier') && (
                        <button
                          onClick={() => handleAddRole('supplier')}
                          disabled={!!actionLoading}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Add supplier role
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Supplier bank accounts</h2>
                  <p className="mt-1 text-sm text-slate-500">Manage multiple IBANs and one default account for supplier payouts.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {!canManageBankAccounts ? (
                <div className="text-sm text-slate-500">Create or select a partner first.</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {bankAccounts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        No supplier bank accounts yet.
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

                  {!isCreatingNew && selectedPartnerId && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-4 text-sm font-semibold text-slate-900">Add supplier bank account</div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="IBAN" value={newBankAccount.iban} onChange={(value) => setNewBankAccount((current) => ({ ...current, iban: value.toUpperCase() }))} />
                        <Field label="Bank name" value={newBankAccount.bank_name} onChange={(value) => setNewBankAccount((current) => ({ ...current, bank_name: value }))} />
                        <Field label="BIC" value={newBankAccount.bic} onChange={(value) => setNewBankAccount((current) => ({ ...current, bic: value.toUpperCase() }))} />
                        <Field label="Currency" value={newBankAccount.currency_code} onChange={(value) => setNewBankAccount((current) => ({ ...current, currency_code: value.toUpperCase() }))} />
                        <Field label="Account holder" value={newBankAccount.account_holder_name} onChange={(value) => setNewBankAccount((current) => ({ ...current, account_holder_name: value }))} />
                        <Field label="Notes" value={newBankAccount.notes} onChange={(value) => setNewBankAccount((current) => ({ ...current, notes: value }))} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={newBankAccount.is_default}
                            onChange={(event) => setNewBankAccount((current) => ({ ...current, is_default: event.target.checked }))}
                          />
                          <span>Default account</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={newBankAccount.is_active}
                            onChange={(event) => setNewBankAccount((current) => ({ ...current, is_active: event.target.checked }))}
                          />
                          <span>Active</span>
                        </label>
                      </div>
                      <button
                        onClick={handleCreateBankAccount}
                        disabled={!newBankAccount.iban || !!actionLoading}
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'create-bank-account' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        <span>Add bank account</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
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
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">{account.iban}</div>
          <div className="mt-1 text-xs text-slate-500">
            {account.account_holder_name || '-'} · {account.bank_name || 'No bank name'} · {account.currency_code || 'EUR'}
          </div>
          {account.notes && <div className="mt-2 text-xs text-slate-500">{account.notes}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${account.is_default ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
            {account.is_default ? 'Default' : 'Secondary'}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${account.is_active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
            {account.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onToggleDefault} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Set default
        </button>
        <button onClick={onToggleActive} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {account.is_active ? 'Deactivate' : 'Activate'}
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
