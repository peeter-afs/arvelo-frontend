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
  type PartnerRegistrySyncLogItem,
} from '@/lib/api/businessRegistry.api';
import {
  accountingApi,
  type JournalEntryRecord,
  type PartnerRecord,
  type PartnerRole,
  type PartnerWithBalance,
  type SupplierBankAccount,
} from '@/lib/api/accounting.api';
import { AddPartnerModal } from '@/components/partners/AddPartnerModal';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { Stat } from '@/components/ui/Stat';
import { StatusPill } from '@/components/ui/StatusPill';
import { SplitPane, SplitPaneDetail } from '@/components/layout/SplitPane';

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
  receipt_responsible_email: string;
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

type TaxArrearsInfo = {
  status?: string | null;
  arrearsAmount?: number | string | null;
  note?: string | null;
} & Record<string, unknown>;

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
  receipt_responsible_email: '',
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

function formatEUR(value: number) {
  return new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(value);
}

function initials(name?: string | null) {
  if (!name) return 'A';
  const parts = name.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || name.slice(0, 2).toUpperCase();
}

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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState<BankAccountDraft>(emptyBankAccountDraft());
  const [registrySyncLog, setRegistrySyncLog] = useState<PartnerRegistrySyncLogItem[]>([]);
  const [includeTaxArrearsOnRefresh, setIncludeTaxArrearsOnRefresh] = useState(false);
  const [latestTaxArrears, setLatestTaxArrears] = useState<TaxArrearsInfo | null>(null);

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

  const selectedPartnerWithBalance = partners.find((partner) => partner.id === selectedPartnerId) || null;
  const customers = partners.filter((partner) => partner.type === 'customer' || partner.type === 'both');
  const suppliers = partners.filter((partner) => partner.type === 'supplier' || partner.type === 'both');
  const receivable = partners.reduce((sum, partner) => sum + Math.max(0, partner.balance), 0);
  const payable = partners.reduce((sum, partner) => sum + Math.max(0, -partner.balance), 0);

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        const result = await accountingApi.listPartnersWithBalances();
        setPartners(result);
        setSelectedPartnerId((current) => current || result[0]?.id || null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!selectedPartnerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPartner(null);
      setRoles([]);
      setBankAccounts([]);
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
  }, [selectedPartnerId]);

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

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-[var(--a-border)] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="micro text-[var(--a-text-3)]">Customers, suppliers, employees</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--a-text)]">{t('businessPartnersTitle')}</h1>
          <p className="mt-2 text-[13px] text-[var(--a-text-2)]">
            {partners.length} contacts · {customers.length} customers · {suppliers.length} suppliers
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void refreshPartners(selectedPartnerId)}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('refreshPartners')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setAddModalOpen(true);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addPartner')}
            <Kbd inverse>N</Kbd>
          </Button>
        </div>
      </div>

      {errorMessage && <Notice tone="danger" icon={<AlertCircle className="h-4 w-4" />}>{errorMessage}</Notice>}
      {successMessage && <Notice tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>{successMessage}</Notice>}

      <div className="grid border-b border-[var(--a-border)] pb-4 md:grid-cols-3">
        <Stat label="Receivable" value={formatEUR(receivable)} subtle={`${customers.filter((partner) => partner.balance > 0).length} customers with balance`} tone="positive" />
        <Stat label="Payable" value={formatEUR(payable)} subtle={`${suppliers.filter((partner) => partner.balance < 0).length} suppliers with balance`} tone="warning" />
        <Stat label="Contacts" value={partners.length} subtle={`${partners.filter((partner) => partner.is_active).length} active`} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--a-text-3)]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('searchPartners')}
            className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] pl-9 pr-3 text-[13px] text-[var(--a-text)] outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          {[
            ['all', t('allPartnerTypes'), partners.length],
            ['customer', t('customerPlural'), customers.length],
            ['supplier', t('supplierPlural'), suppliers.length],
            ['both', t('both'), partners.filter((partner) => partner.type === 'both').length],
          ].map(([id, label, count]) => (
            <button
              key={id as string}
              onClick={() => setTypeFilter(id as typeof typeFilter)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium ${
                typeFilter === id
                  ? 'bg-[var(--a-text)] text-white'
                  : 'text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]'
              }`}
            >
              {label}
              <span className={typeFilter === id ? 'text-white/60' : 'text-[var(--a-text-3)]'}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      <SplitPane className="flex-1">
        <section className="min-h-[520px] overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)]">
          <div className="grid grid-cols-[34px_minmax(220px,1fr)_104px_120px_86px] gap-3 border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]">
            <div />
            <div>Partner</div>
            <div>Type</div>
            <div className="text-right">Balance</div>
            <div>Updated</div>
          </div>
          <div className="max-h-[calc(100vh-390px)] min-h-[430px] overflow-y-auto">
            {isBootLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" />
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="p-8 text-sm text-[var(--a-text-3)]">{t('noPartnersCurrentFilter')}</div>
            ) : (
              filteredPartners.map((partner) => {
                const selected = selectedPartnerId === partner.id;
                const balanceTone = partner.balance > 0 ? 'text-[var(--a-pos)]' : partner.balance < 0 ? 'text-[var(--a-warn)]' : 'text-[var(--a-text-3)]';

                return (
                  <button
                    key={partner.id}
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={`grid w-full grid-cols-[34px_minmax(220px,1fr)_104px_120px_86px] items-center gap-3 border-b border-[var(--a-border)] px-4 py-3 text-left text-[13px] transition-colors ${
                      selected ? 'bg-[var(--a-accent-soft-2)] shadow-[inset_2px_0_0_var(--a-accent)]' : 'hover:bg-[var(--a-surface-2)]'
                    }`}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--a-surface-2)] text-[10px] font-semibold text-[var(--a-text-2)]">
                      {initials(partner.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--a-text)]">{partner.name}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-[var(--a-text-3)]">
                        {partner.vat_number || partner.reg_code || t('noIdentifier')} · {partner.country_code || 'EE'}
                      </span>
                    </span>
                    <PartnerTypeBadge type={partner.type} />
                    <span className={`text-right font-mono text-[13px] font-medium ${balanceTone}`}>
                      {formatEUR(Math.abs(partner.balance))}
                    </span>
                    <span className="font-mono text-[11.5px] text-[var(--a-text-2)]">{shortDate(partner.updated_at)}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2 font-mono text-[11px] text-[var(--a-text-3)]">
            <span>Showing <span className="text-[var(--a-text)]">{filteredPartners.length}</span></span>
            <span>Receivable <span className="text-[var(--a-pos)]">{formatEUR(receivable)}</span></span>
            <span>Payable <span className="text-[var(--a-warn)]">{formatEUR(payable)}</span></span>
            <span className="flex-1" />
            <span>Registry sync enabled</span>
          </div>
        </section>

        <SplitPaneDetail>
          <PartnerDetailPanel
            partner={selectedPartner}
            partnerWithBalance={selectedPartnerWithBalance}
            roles={roles}
            bankAccounts={bankAccounts}
            registrySyncLog={registrySyncLog}
            isLoading={isDetailLoading}
            actionLoading={actionLoading}
            duplicateWarnings={duplicateWarnings}
            form={form}
            setForm={setForm}
            newBankAccount={newBankAccount}
            setNewBankAccount={setNewBankAccount}
            includeTaxArrearsOnRefresh={includeTaxArrearsOnRefresh}
            setIncludeTaxArrearsOnRefresh={setIncludeTaxArrearsOnRefresh}
            latestTaxArrears={latestTaxArrears}
            onSave={handleSavePartner}
            onCheckDuplicates={handleCheckDuplicates}
            onRegistryRefresh={handleRegistryRefresh}
            onAddRole={handleAddRole}
            onCreateBankAccount={handleCreateBankAccount}
            onUpdateBankAccount={handleUpdateBankAccount}
          />
        </SplitPaneDetail>
      </SplitPane>

      <AddPartnerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={(partner) => {
          setAddModalOpen(false);
          setSelectedPartnerId(partner.id);
          void refreshPartners(partner.id);
          setSuccessMessage(t('partnerCreated'));
        }}
      />
    </div>
  );
}

function PartnerDetailPanel({
  partner,
  partnerWithBalance,
  roles,
  bankAccounts,
  registrySyncLog,
  isLoading,
  actionLoading,
  duplicateWarnings,
  form,
  setForm,
  newBankAccount,
  setNewBankAccount,
  includeTaxArrearsOnRefresh,
  setIncludeTaxArrearsOnRefresh,
  latestTaxArrears,
  onSave,
  onCheckDuplicates,
  onRegistryRefresh,
  onAddRole,
  onCreateBankAccount,
  onUpdateBankAccount,
}: {
  partner: PartnerRecord | null;
  partnerWithBalance: PartnerWithBalance | null;
  roles: PartnerRole[];
  bankAccounts: SupplierBankAccount[];
  registrySyncLog: PartnerRegistrySyncLogItem[];
  isLoading: boolean;
  actionLoading: string | null;
  duplicateWarnings: Array<{ partner: PartnerRecord; roles: string[]; match_type: string; severity: string }>;
  form: PartnerFormState;
  setForm: React.Dispatch<React.SetStateAction<PartnerFormState>>;
  newBankAccount: BankAccountDraft;
  setNewBankAccount: React.Dispatch<React.SetStateAction<BankAccountDraft>>;
  includeTaxArrearsOnRefresh: boolean;
  setIncludeTaxArrearsOnRefresh: (value: boolean) => void;
  latestTaxArrears: TaxArrearsInfo | null;
  onSave: () => void;
  onCheckDuplicates: () => void;
  onRegistryRefresh: () => void;
  onAddRole: (role: 'customer' | 'supplier') => void;
  onCreateBankAccount: () => void;
  onUpdateBankAccount: (account: SupplierBankAccount, updates: Partial<BankAccountDraft>) => void;
}) {
  const t = useTranslations('accounting');
  const [recentEntries, setRecentEntries] = useState<JournalEntryRecord[]>([]);

  useEffect(() => {
    if (!partner) return;
    accountingApi.listJournalEntriesByPartner(partner.id, 5)
      .then(setRecentEntries)
      .catch(() => setRecentEntries([]));
  }, [partner]);

  if (!partner) {
    return <div className="p-6 text-sm text-[var(--a-text-3)]">{t('selectPartnerToView')}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" />
      </div>
    );
  }

  const balance = partnerWithBalance?.balance || 0;
  const balanceTone = balance > 0 ? 'text-[var(--a-pos)]' : balance < 0 ? 'text-[var(--a-warn)]' : 'text-[var(--a-text)]';

  return (
    <div className="flex max-h-[calc(100vh-190px)] min-h-[520px] flex-col">
      <div className="border-b border-[var(--a-border)] bg-[linear-gradient(180deg,var(--a-accent-soft-2),var(--a-surface))] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-lg bg-[var(--a-surface-2)] text-base font-semibold text-[var(--a-text-2)]">
            {initials(partner.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-semibold text-[var(--a-text)]">{partner.name}</h2>
            <div className="mt-1 truncate text-[12.5px] text-[var(--a-text-2)]">
              {partner.reg_code || t('noIdentifier')} · {partner.vat_number || 'No VAT'} · {partner.country_code || 'EE'}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PartnerTypeBadge type={partner.type} />
              <StatusPill tone={partner.is_active ? 'success' : 'neutral'}>{partner.is_active ? t('active') : t('inactive')}</StatusPill>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] p-3">
          <div className="micro text-[var(--a-text-3)]">Outstanding balance</div>
          <div className={`mt-1 font-mono text-[22px] font-semibold ${balanceTone}`}>{formatEUR(Math.abs(balance))}</div>
          <div className="mt-1 text-[11.5px] text-[var(--a-text-3)]">
            {balance > 0 ? 'Receivable from partner' : balance < 0 ? 'Payable to partner' : 'Settled'}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <Section label={t('identity')}>
          <Field label={t('type')} value={form.type} onChange={(value) => setForm((current) => ({ ...current, type: value as PartnerFormState['type'] }))} as="select" options={[
            { label: t('customer'), value: 'customer' },
            { label: t('supplier'), value: 'supplier' },
            { label: t('both'), value: 'both' },
          ]} />
          <Field label={t('name')} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <Field label={t('code')} value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} />
        </Section>

        <Section label={t('registration')}>
          <Field label={t('registryCode')} value={form.reg_code} onChange={(value) => setForm((current) => ({ ...current, reg_code: value }))} />
          <Field label={t('vatNumber')} value={form.vat_number} onChange={(value) => setForm((current) => ({ ...current, vat_number: value.toUpperCase() }))} />
        </Section>

        <Section label={t('contact')}>
          <Field label={t('email')} value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
          <Field label={t('phone')} value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <Field label={t('website')} value={form.website} onChange={(value) => setForm((current) => ({ ...current, website: value }))} />
          <Field label={t('address')} value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
        </Section>

        <Section label={t('billing')}>
          <Field label={t('paymentTermsDays')} value={form.payment_terms_days} onChange={(value) => setForm((current) => ({ ...current, payment_terms_days: value }))} />
          <Field label={t('countryCode')} value={form.country_code} onChange={(value) => setForm((current) => ({ ...current, country_code: value.toUpperCase() }))} />
          <Field label={t('receiptResponsibleEmail')} value={form.receipt_responsible_email || ''} onChange={(value) => setForm((current) => ({ ...current, receipt_responsible_email: value }))} />
        </Section>

        <Section label={t('other')}>
          <Field label={t('notes')} value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} as="textarea" />
        </Section>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onCheckDuplicates} disabled={!!actionLoading}>
            {actionLoading === 'check-duplicates' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {t('checkDuplicates')}
          </Button>
          <Button variant="primary" onClick={onSave} disabled={!form.name || !!actionLoading}>
            {actionLoading === 'save-partner' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {t('saveChanges')}
          </Button>
        </div>

        {duplicateWarnings.length > 0 && (
          <div className="rounded-lg border border-[var(--a-warn-soft)] bg-[var(--a-warn-soft)] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--a-warn)]">
              <ShieldAlert className="h-4 w-4" />
              {t('duplicateWarnings')}
            </div>
            <div className="space-y-2">
              {duplicateWarnings.map((warning) => (
                <div key={warning.partner.id} className="rounded-md bg-[var(--a-surface)] p-2 text-[12px] text-[var(--a-text-2)]">
                  <div className="font-medium text-[var(--a-text)]">{warning.partner.name}</div>
                  <div>{warning.match_type} · {warning.severity} · {warning.roles.join(', ') || t('none')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Section label={t('partnerRoles')}>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <StatusPill key={role.id} tone="neutral">{t(role.role)}</StatusPill>
            ))}
            {!roles.some((role) => role.role === 'customer') && (
              <Button className="h-8 text-xs" onClick={() => onAddRole('customer')} disabled={!!actionLoading}>{t('addCustomerRole')}</Button>
            )}
            {!roles.some((role) => role.role === 'supplier') && (
              <Button className="h-8 text-xs" onClick={() => onAddRole('supplier')} disabled={!!actionLoading}>{t('addSupplierRole')}</Button>
            )}
          </div>
        </Section>

        <Section label={t('registryRefresh')}>
          <label className="flex items-center gap-2 text-[12.5px] text-[var(--a-text-2)]">
            <input
              type="checkbox"
              checked={includeTaxArrearsOnRefresh}
              onChange={(event) => setIncludeTaxArrearsOnRefresh(event.target.checked)}
            />
            {t('includeTaxArrearsCheck')}
          </label>
          <Button onClick={onRegistryRefresh} disabled={!partner.reg_code || !!actionLoading}>
            {actionLoading === 'registry-refresh' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t('refreshFromRegistry')}
          </Button>
          {(latestTaxArrears || partner.tax_arrears_status) && (
            <div className="rounded-lg bg-[var(--a-surface-2)] p-3 text-[12px] text-[var(--a-text-2)]">
              {latestTaxArrears?.status || partner.tax_arrears_status || t('notAvailable')} · {String(latestTaxArrears?.arrearsAmount ?? partner.tax_arrears_amount ?? t('notAvailable'))}
            </div>
          )}
        </Section>

        <Section label={t('supplierBankAccounts')} icon={<Wallet className="h-3.5 w-3.5" />}>
          {bankAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--a-border-strong)] bg-[var(--a-surface-2)] p-3 text-sm text-[var(--a-text-3)]">
              {t('noSupplierBankAccountsYet')}
            </div>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map((account) => (
                <BankAccountCard
                  key={account.id}
                  account={account}
                  onToggleDefault={() => onUpdateBankAccount(account, { is_default: !account.is_default || true })}
                  onToggleActive={() => onUpdateBankAccount(account, { is_active: !account.is_active })}
                />
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Field label={t('iban')} value={newBankAccount.iban} onChange={(value) => setNewBankAccount((current) => ({ ...current, iban: value.toUpperCase() }))} />
            <Field label={t('bankName')} value={newBankAccount.bank_name} onChange={(value) => setNewBankAccount((current) => ({ ...current, bank_name: value }))} />
            <Field label={t('bic')} value={newBankAccount.bic} onChange={(value) => setNewBankAccount((current) => ({ ...current, bic: value.toUpperCase() }))} />
            <Field label={t('currency')} value={newBankAccount.currency_code} onChange={(value) => setNewBankAccount((current) => ({ ...current, currency_code: value.toUpperCase() }))} />
          </div>
          <Button onClick={onCreateBankAccount} disabled={!newBankAccount.iban || !!actionLoading}>
            {actionLoading === 'create-bank-account' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t('addBankAccount')}
          </Button>
        </Section>

        <Section label={t('registrySyncLog')}>
          {registrySyncLog.length === 0 ? (
            <div className="text-sm text-[var(--a-text-3)]">{t('noRegistrySyncEventsYet')}</div>
          ) : (
            <div className="space-y-2">
              {registrySyncLog.map((item) => (
                <div key={item.id} className="rounded-lg border border-[var(--a-border)] p-3 text-[12px]">
                  <div className="font-medium text-[var(--a-text)]">{item.sync_type} · {item.status}</div>
                  <div className="mt-1 font-mono text-[11px] text-[var(--a-text-3)]">
                    {item.request_source || t('unknownSource')} · {item.registry_code || t('noRegistryCode')} · {formatDateTime(item.performed_at)}
                  </div>
                  {(item.error_message || item.error_code) && (
                    <div className="mt-1 text-[var(--a-neg)]">{item.error_code ? `${item.error_code}: ` : ''}{item.error_message}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {recentEntries.length > 0 && (
          <Section label={t('recentTransactions')}>
            <div className="space-y-1">
              {recentEntries.map((entry) => {
                const debit = (entry.rows || []).reduce((sum, row) => sum + Number(row.debit || 0), 0);
                const credit = (entry.rows || []).reduce((sum, row) => sum + Number(row.credit || 0), 0);
                const amount = Math.max(debit, credit);
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--a-border)] px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11.5px] font-medium tabular-nums text-[var(--a-text-2)]">{entry.entry_number || entry.id.slice(0, 8)}</span>
                        <span className={`h-1.5 w-1.5 rounded-full ${entry.is_posted ? 'bg-[var(--a-pos)]' : 'bg-[var(--a-warn)]'}`} />
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-[var(--a-text-3)]">{entry.description || entry.entry_type}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[12.5px] font-medium tabular-nums text-[var(--a-text)]">{formatEUR(amount)}</div>
                      <div className="font-mono text-[10.5px] tabular-nums text-[var(--a-text-3)]">{shortDate(entry.entry_date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Notice({ tone, icon, children }: { tone: 'danger' | 'success'; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${tone === 'danger' ? 'border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] text-[var(--a-neg)]' : 'border-[var(--a-pos-soft)] bg-[var(--a-pos-soft)] text-[var(--a-pos)]'}`}>
      <div className="flex items-start gap-2">{icon}<span>{children}</span></div>
    </div>
  );
}

function PartnerTypeBadge({ type }: { type: PartnerRecord['type'] }) {
  const style =
    type === 'customer'
      ? 'bg-[var(--a-accent-soft)] text-[var(--a-accent)]'
      : type === 'supplier'
        ? 'bg-[var(--a-warn-soft)] text-[var(--a-warn)]'
        : 'bg-[#ece4f0] text-[#5a3974]';

  return <span className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold capitalize leading-none ${style}`}>{type}</span>;
}

function Section({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section>
      <div className="micro mb-3 flex items-center gap-1.5 text-[var(--a-text-3)]">{icon}{label}</div>
      <div className="space-y-3">{children}</div>
    </section>
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
    <label className="block space-y-1.5">
      <span className="micro text-[var(--a-text-3)]">{label}</span>
      {as === 'select' ? (
        <select value={String(value)} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] outline-none">
          {options?.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea value={String(value)} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-20 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-[13px] outline-none" />
      ) : (
        <input type={type} value={String(value)} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] outline-none" />
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
    <div className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] p-3">
      <div className="font-mono text-[12px] font-semibold text-[var(--a-text)]">{account.iban}</div>
      <div className="mt-1 text-[11.5px] text-[var(--a-text-3)]">
        {account.account_holder_name || '-'} · {account.bank_name || t('noBankName')} · {account.currency_code || 'EUR'}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill tone={account.is_default ? 'success' : 'neutral'}>{account.is_default ? t('default') : t('secondary')}</StatusPill>
        <StatusPill tone={account.is_active ? 'success' : 'neutral'}>{account.is_active ? t('active') : t('inactive')}</StatusPill>
      </div>
      <div className="mt-3 flex gap-2">
        <Button className="h-8 text-xs" onClick={onToggleDefault}>{t('setDefault')}</Button>
        <Button className="h-8 text-xs" onClick={onToggleActive}>{account.is_active ? t('deactivate') : t('activate')}</Button>
      </div>
    </div>
  );
}

function shortDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit' }).format(date);
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
    receipt_responsible_email: partner.receipt_responsible_email || '',
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
    receipt_responsible_email: form.receipt_responsible_email || undefined,
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
  if (!value) return '-';
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
