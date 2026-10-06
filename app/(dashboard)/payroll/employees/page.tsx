'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CalendarOff, Loader2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { accountingApi, type AccountOption, type PartnerOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { costCentersApi, dimensionLabel, projectsApi, type CostCenter, type Project } from '@/lib/api/dimensions.api';
import {
  payrollApi,
  type ContractInput,
  type ContractType,
  type LeaveBalance,
  type PayrollContract,
  type PayrollEmployee,
} from '@/lib/api/payroll.api';
import { getIsoToday } from '@/lib/utils/date';
import { dateText, money, parseAmount } from '@/components/payroll/format';

const field = 'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-2.5 text-[13px]';
const label = 'mb-1 block text-[12px] font-medium text-[var(--a-text-2)]';

type Lookups = { accounts: AccountOption[]; costCenters: CostCenter[]; projects: Project[] };

export default function PayrollEmployeesPage() {
  const t = useTranslations('payroll');
  const [employees, setEmployees] = useState<PayrollEmployee[] | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayrollEmployee | 'new' | null>(null);
  const [lookups, setLookups] = useState<Lookups>({ accounts: [], costCenters: [], projects: [] });

  const load = () =>
    payrollApi
      .employees({ all: showInactive })
      .then(setEmployees)
      .catch((err) => {
        setEmployees([]);
        setError(getErrorMessage(err));
      });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  useEffect(() => {
    Promise.all([
      accountingApi.getAccounts().catch(() => [] as AccountOption[]),
      costCentersApi.list().catch(() => [] as CostCenter[]),
      projectsApi.list().catch(() => [] as Project[]),
    ]).then(([accounts, costCenters, projects]) => setLookups({ accounts, costCenters, projects }));
  }, []);

  const monthlyTotal = (employee: PayrollEmployee) =>
    employee.contracts
      .filter((c) => !c.end_date || c.end_date >= getIsoToday())
      .reduce((sum, c) => sum + (c.pay_basis === 'hourly' ? c.base_amount * (c.default_hours || 0) : c.base_amount), 0);

  return (
    <div className="mx-auto w-full max-w-5xl py-4">
      <Link href="/payroll" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-[var(--a-text-3)] hover:text-[var(--a-text)]">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('title')}
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('employees')}</h1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{t('employeesSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--a-text-2)]">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            {t('showInactive')}
          </label>
          <button type="button" onClick={() => setEditing('new')} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)]">
            <Plus className="h-3.5 w-3.5" />
            {t('addEmployee')}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        {employees === null ? (
          <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>
        ) : employees.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-7 w-7 text-[var(--a-text-3)]" />
            <p className="mt-2 text-[13.5px] text-[var(--a-text-2)]">{t('emptyEmployees')}</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                <th className="px-4 py-2">{t('name')}</th>
                <th className="hidden px-4 py-2 md:table-cell">{t('personalCode')}</th>
                <th className="hidden px-4 py-2 md:table-cell">{t('contracts')}</th>
                <th className="hidden px-4 py-2 md:table-cell">{t('pensionRate')}</th>
                <th className="px-4 py-2 text-right">{t('monthlyGross')}</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className={`border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-surface-2)] ${employee.is_active ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-2">
                    <button type="button" onClick={() => setEditing(employee)} className="text-left font-medium text-[var(--a-accent)] hover:underline">{employee.name ?? '—'}</button>
                    {(!employee.personal_code_masked || !employee.iban) && (
                      <div className="text-[11.5px] text-[var(--a-warn)]">
                        {!employee.personal_code_masked ? t('warning.noPersonalCode') : t('warning.noIban')}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-2 font-mono md:table-cell">{employee.personal_code_masked ?? '—'}</td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    {employee.contracts.length === 0
                      ? '—'
                      : employee.contracts.map((c) => (
                          <div key={c.id} className="text-[12.5px]">
                            {t(`contractType.${c.contract_type}`)}
                            {c.title ? ` · ${c.title}` : ''}
                            {c.end_date ? <span className="text-[var(--a-text-3)]"> · {t('until')} {dateText(c.end_date)}</span> : null}
                          </div>
                        ))}
                  </td>
                  <td className="hidden px-4 py-2 md:table-cell">{employee.pension_rate}%</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{money(monthlyTotal(employee))}</td>
                  <td className="px-2 py-2 text-right">
                    <button type="button" onClick={() => setEditing(employee)} aria-label={t('edit')} className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EmployeeDialog
          employee={editing === 'new' ? null : editing}
          lookups={lookups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function emptyContract(): ContractInput {
  return {
    contract_type: 'employment',
    title: null,
    start_date: getIsoToday(),
    end_date: null,
    pay_basis: 'monthly',
    base_amount: 0,
    default_hours: null,
    expense_account_id: null,
    cost_center_id: null,
    project_id: null,
  };
}

function EmployeeDialog({
  employee,
  lookups,
  onClose,
  onSaved,
}: {
  employee: PayrollEmployee | null;
  lookups: Lookups;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('payroll');
  const isNew = !employee;
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [name, setName] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [personalCode, setPersonalCode] = useState('');
  const [iban, setIban] = useState(employee?.iban ?? '');
  const [pensionRate, setPensionRate] = useState(employee?.pension_rate ?? 2);
  const [pensionAge, setPensionAge] = useState(employee?.pension_age ?? false);
  const [applyExemption, setApplyExemption] = useState(employee?.apply_tax_exemption ?? true);
  const [exemptionAmount, setExemptionAmount] = useState(employee?.tax_exemption_amount === null || employee?.tax_exemption_amount === undefined ? '' : String(employee.tax_exemption_amount));
  const [applyMin, setApplyMin] = useState(employee?.apply_min_social_tax ?? true);
  const [isActive, setIsActive] = useState(employee?.is_active ?? true);
  const [contract, setContract] = useState<ContractInput>(emptyContract());
  const [contracts, setContracts] = useState<PayrollContract[]>(employee?.contracts ?? []);
  const [editingContract, setEditingContract] = useState<PayrollContract | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  useEffect(() => {
    if (isNew) accountingApi.getPartners().then(setPartners).catch(() => {});
    else payrollApi.leaveBalance(employee.id).then(setBalances).catch(() => {});
  }, [isNew, employee]);

  const matches = useMemo(() => {
    const needle = name.trim().toLocaleLowerCase('et');
    if (!needle || partnerId) return [];
    return partners.filter((p) => p.name.toLocaleLowerCase('et').includes(needle)).slice(0, 8);
  }, [partners, name, partnerId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const common = {
      iban: iban.trim() || null,
      pension_rate: pensionRate,
      pension_age: pensionAge,
      apply_tax_exemption: applyExemption,
      tax_exemption_amount: exemptionAmount.trim() === '' ? null : parseAmount(exemptionAmount),
      apply_min_social_tax: applyMin,
      is_active: isActive,
      ...(personalCode.trim() ? { personal_code: personalCode.trim() } : {}),
    };
    try {
      if (isNew) {
        await payrollApi.createEmployee({
          ...common,
          partner_id: partnerId || null,
          name: partnerId ? null : name.trim(),
          contract: contract.base_amount > 0 || contract.title ? contract : null,
        });
      } else {
        await payrollApi.updateEmployee(employee.id, common);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const reloadContracts = async () => {
    if (!employee) return;
    const list = await payrollApi.employees({ all: true });
    setContracts(list.find((e) => e.id === employee.id)?.contracts ?? []);
  };

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[90dvh] sm:rounded-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold text-[var(--a-text)]">{isNew ? t('addEmployee') : employee.name}</div>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-[13px]">
          <div className="grid gap-3 sm:grid-cols-2">
            {isNew && (
              <label className="block sm:col-span-2">
                <span className={label}>{t('name')}</span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setPartnerId('');
                  }}
                  placeholder={t('namePlaceholder')}
                  className={field}
                />
                {matches.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--a-border)]">
                    {matches.map((partner) => (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => {
                          setPartnerId(partner.id);
                          setName(partner.name);
                        }}
                        className="block w-full px-3 py-1.5 text-left hover:bg-[var(--a-surface-2)]"
                      >
                        {partner.name}
                      </button>
                    ))}
                  </div>
                )}
                <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">{partnerId ? t('existingPartner') : t('newPartnerHint')}</span>
              </label>
            )}
            <label className="block">
              <span className={label}>{t('personalCode')}</span>
              <input
                value={personalCode}
                onChange={(e) => setPersonalCode(e.target.value)}
                placeholder={employee?.personal_code_masked ?? '38001010000'}
                inputMode="numeric"
                autoComplete="off"
                className={`${field} font-mono`}
              />
              {employee?.personal_code_masked && <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">{t('personalCodeKeep')}</span>}
            </label>
            <label className="block">
              <span className={label}>IBAN</span>
              <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="EE…" autoComplete="off" className={`${field} font-mono`} />
            </label>
            <label className="block">
              <span className={label}>{t('pensionRate')}</span>
              <select value={pensionRate} onChange={(e) => setPensionRate(Number(e.target.value))} className={field}>
                {[0, 2, 4, 6].map((rate) => (
                  <option key={rate} value={rate}>{rate === 0 ? t('pensionNone') : `${rate}%`}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>{t('exemptionAmount')}</span>
              <input
                value={exemptionAmount}
                onChange={(e) => setExemptionAmount(e.target.value)}
                disabled={!applyExemption}
                placeholder={t('exemptionFull')}
                inputMode="decimal"
                className={`${field} disabled:opacity-50`}
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <Check checked={applyExemption} onChange={setApplyExemption} text={t('applyExemption')} />
            <Check checked={pensionAge} onChange={setPensionAge} text={t('pensionAge')} hint={t('pensionAgeHint')} />
            <Check checked={applyMin} onChange={setApplyMin} text={t('applyMinSocialTax')} hint={t('applyMinSocialTaxHint')} />
            {!isNew && <Check checked={isActive} onChange={setIsActive} text={t('active')} />}
          </div>

          {isNew ? (
            <div className="rounded-lg border border-[var(--a-border)] p-3">
              <div className="mb-2 text-[12.5px] font-semibold text-[var(--a-text)]">{t('firstContract')}</div>
              <ContractFields value={contract} onChange={setContract} lookups={lookups} />
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--a-border)]">
              <div className="flex items-center justify-between border-b border-[var(--a-border)] px-3 py-2">
                <div className="text-[12.5px] font-semibold text-[var(--a-text)]">{t('contracts')}</div>
                <button type="button" onClick={() => setEditingContract('new')} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--a-accent)]">
                  <Plus className="h-3.5 w-3.5" />
                  {t('addContract')}
                </button>
              </div>
              {contracts.length === 0 ? (
                <div className="px-3 py-3 text-[12.5px] text-[var(--a-text-3)]">{t('noContracts')}</div>
              ) : (
                <ul className="divide-y divide-[var(--a-border)]">
                  {contracts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div>
                        <div className="font-medium">
                          {t(`contractType.${c.contract_type}`)}
                          {c.title ? ` · ${c.title}` : ''}
                        </div>
                        <div className="text-[12px] text-[var(--a-text-3)]">
                          {dateText(c.start_date)} – {c.end_date ? dateText(c.end_date) : t('ongoing')} ·{' '}
                          {c.pay_basis === 'hourly' ? `${money(c.base_amount)} €/h` : `${money(c.base_amount)} €`}
                        </div>
                      </div>
                      <button type="button" onClick={() => setEditingContract(c)} aria-label={t('edit')} className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!isNew && (
            <div className="rounded-lg border border-[var(--a-border)]">
              <div className="flex items-center justify-between border-b border-[var(--a-border)] px-3 py-2">
                <div className="text-[12.5px] font-semibold text-[var(--a-text)]">{t('leave.title')}</div>
                <Link href={`/payroll/absences?employee=${employee.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--a-accent)]">
                  <CalendarOff className="h-3.5 w-3.5" />
                  {t('absences')}
                </Link>
              </div>
              {balances.length === 0 ? (
                <div className="px-3 py-3 text-[12.5px] text-[var(--a-text-3)]">{t('leave.none')}</div>
              ) : (
                <ul className="divide-y divide-[var(--a-border)]">
                  {balances.map((b) => (
                    <li key={b.contract_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                      <span className="text-[var(--a-text-2)]">{b.title || t('contractType.employment')} · {t('leave.perYear', { days: b.annual_days })}</span>
                      <span className="text-[var(--a-text-3)]">
                        {t('leave.summary', { opening: b.opening, accrued: b.accrued, used: b.used })}
                        {b.planned > 0 ? ` · ${t('leave.planned', { days: b.planned })}` : ''}
                      </span>
                      <span className="font-semibold text-[var(--a-text)]">{t('leave.balance', { days: b.balance })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
        </div>
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-[var(--a-border)] px-4 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
          <button
            type="button"
            disabled={saving || (isNew && !name.trim())}
            onClick={() => void save()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('save')}
          </button>
        </div>
      </div>

      {editingContract && employee && (
        <ContractDialog
          employeeId={employee.id}
          contract={editingContract === 'new' ? null : editingContract}
          lookups={lookups}
          onClose={() => setEditingContract(null)}
          onSaved={async () => {
            setEditingContract(null);
            await reloadContracts();
          }}
        />
      )}
    </div>
  );
}

function Check({ checked, onChange, text, hint }: { checked: boolean; onChange: (value: boolean) => void; text: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="text-[13px] text-[var(--a-text)]">{text}</span>
        {hint && <span className="block text-[11.5px] text-[var(--a-text-3)]">{hint}</span>}
      </span>
    </label>
  );
}

function ContractFields({ value, onChange, lookups }: { value: ContractInput; onChange: (value: ContractInput) => void; lookups: Lookups }) {
  const t = useTranslations('payroll');
  const set = <K extends keyof ContractInput>(key: K, v: ContractInput[K]) => onChange({ ...value, [key]: v });
  const expenseAccounts = lookups.accounts.filter((a) => a.is_active && a.code.startsWith('4'));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className={label}>{t('contractTypeLabel')}</span>
        <select value={value.contract_type} onChange={(e) => set('contract_type', e.target.value as ContractType)} className={field}>
          {(['employment', 'board_member', 'service'] as const).map((type) => (
            <option key={type} value={type}>{t(`contractType.${type}`)}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>{t('jobTitle')}</span>
        <input value={value.title ?? ''} onChange={(e) => set('title', e.target.value || null)} className={field} />
      </label>
      <label className="block">
        <span className={label}>{t('startDate')}</span>
        <input type="date" value={value.start_date} onChange={(e) => set('start_date', e.target.value)} className={field} />
      </label>
      <label className="block">
        <span className={label}>{t('endDate')}</span>
        <input type="date" value={value.end_date ?? ''} onChange={(e) => set('end_date', e.target.value || null)} className={field} />
      </label>
      <label className="block">
        <span className={label}>{t('payBasis')}</span>
        <select value={value.pay_basis} onChange={(e) => set('pay_basis', e.target.value as 'monthly' | 'hourly')} className={field}>
          <option value="monthly">{t('payBasisMonthly')}</option>
          <option value="hourly">{t('payBasisHourly')}</option>
        </select>
      </label>
      <label className="block">
        <span className={label}>{value.pay_basis === 'hourly' ? t('hourlyRate') : t('monthlySalary')}</span>
        <input
          defaultValue={value.base_amount ? String(value.base_amount) : ''}
          onChange={(e) => set('base_amount', parseAmount(e.target.value))}
          inputMode="decimal"
          className={`${field} text-right font-mono`}
        />
      </label>
      {value.pay_basis === 'hourly' && (
        <label className="block">
          <span className={label}>{t('defaultHours')}</span>
          <input
            defaultValue={value.default_hours ?? ''}
            onChange={(e) => set('default_hours', e.target.value === '' ? null : parseAmount(e.target.value))}
            inputMode="decimal"
            className={`${field} text-right font-mono`}
          />
        </label>
      )}
      <label className="block">
        <span className={label}>{t('expenseAccount')}</span>
        <select value={value.expense_account_id ?? ''} onChange={(e) => set('expense_account_id', e.target.value || null)} className={field}>
          <option value="">{t('defaultAccount')}</option>
          {expenseAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
          ))}
        </select>
      </label>
      {value.contract_type === 'employment' && (
        <>
          <label className="block">
            <span className={label}>{t('leave.annualDays')}</span>
            <input
              defaultValue={value.annual_leave_days ?? 28}
              onChange={(e) => set('annual_leave_days', e.target.value === '' ? 28 : Math.round(parseAmount(e.target.value)))}
              inputMode="numeric"
              className={`${field} text-right font-mono`}
            />
          </label>
          <label className="block">
            <span className={label}>{t('leave.opening')}</span>
            <div className="flex gap-2">
              <input
                defaultValue={value.leave_opening_days ? String(value.leave_opening_days) : ''}
                onChange={(e) => set('leave_opening_days', parseAmount(e.target.value))}
                placeholder="0"
                inputMode="decimal"
                className={`${field} w-20 text-right font-mono`}
              />
              <input type="date" value={value.leave_opening_date ?? ''} onChange={(e) => set('leave_opening_date', e.target.value || null)} className={field} />
            </div>
            <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">{t('leave.openingHint')}</span>
          </label>
        </>
      )}
      {lookups.costCenters.length > 0 && (
        <label className="block">
          <span className={label}>{t('costCenter')}</span>
          <select value={value.cost_center_id ?? ''} onChange={(e) => set('cost_center_id', e.target.value || null)} className={field}>
            <option value="">—</option>
            {lookups.costCenters.filter((c) => c.is_active).map((c) => (
              <option key={c.id} value={c.id}>{dimensionLabel(c)}</option>
            ))}
          </select>
        </label>
      )}
      {lookups.projects.length > 0 && (
        <label className="block">
          <span className={label}>{t('project')}</span>
          <select value={value.project_id ?? ''} onChange={(e) => set('project_id', e.target.value || null)} className={field}>
            <option value="">—</option>
            {lookups.projects.filter((p) => p.is_active).map((p) => (
              <option key={p.id} value={p.id}>{dimensionLabel(p)}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function ContractDialog({
  employeeId,
  contract,
  lookups,
  onClose,
  onSaved,
}: {
  employeeId: string;
  contract: PayrollContract | null;
  lookups: Lookups;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useTranslations('payroll');
  const [value, setValue] = useState<ContractInput>(
    contract
      ? {
          contract_type: contract.contract_type,
          title: contract.title,
          start_date: contract.start_date,
          end_date: contract.end_date,
          pay_basis: contract.pay_basis,
          base_amount: contract.base_amount,
          default_hours: contract.default_hours,
          expense_account_id: contract.expense_account_id,
          cost_center_id: contract.cost_center_id,
          project_id: contract.project_id,
          annual_leave_days: contract.annual_leave_days,
          leave_opening_days: contract.leave_opening_days,
          leave_opening_date: contract.leave_opening_date,
        }
      : emptyContract()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold">{contract ? t('editContract') : t('addContract')}</div>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-[13px]">
          <ContractFields value={value} onChange={setValue} lookups={lookups} />
          {error && <div className="mt-3 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[var(--a-border)] px-4 py-3">
          <div>
            {contract && (
              <button type="button" disabled={busy} onClick={() => void run(() => payrollApi.deleteContract(employeeId, contract.id))} className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] text-[var(--a-neg)] hover:bg-[var(--a-neg-soft)]">
                <Trash2 className="h-3.5 w-3.5" />
                {t('delete')}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => (contract ? payrollApi.updateContract(employeeId, contract.id, value) : payrollApi.createContract(employeeId, value)))}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
