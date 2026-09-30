'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { accountingApi, type AccountRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import {
  PAYMENT_METHOD_KINDS,
  paymentMethodsApi,
  type PaymentMethod,
  type PaymentMethodKind,
} from '@/lib/api/paymentMethods.api';

const EMPTY_FORM = {
  name: '',
  kind: 'cash' as PaymentMethodKind,
  account_id: '',
  fee_account_id: '',
  fee_percent: '',
  fee_fixed: '',
  payout_match: '',
};

type Form = typeof EMPTY_FORM;

/** Card and web shop money reaches the bank later, minus the provider's fee. */
const hasPayout = (kind: PaymentMethodKind) => kind === 'card' || kind === 'online';

const toNumber = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed;
};

function toPayload(form: Form) {
  const payout = hasPayout(form.kind);
  return {
    name: form.name.trim(),
    kind: form.kind,
    account_id: form.account_id,
    fee_account_id: payout ? form.fee_account_id || null : null,
    fee_percent: payout ? toNumber(form.fee_percent) : null,
    fee_fixed: payout ? toNumber(form.fee_fixed) : null,
    payout_match: payout ? form.payout_match.trim() || null : null,
  };
}

/**
 * Settings → Company: payment methods (cash, card, web shop…) and the asset
 * account each one's money lands on. Used when a payment is registered by hand.
 */
export function PaymentMethodsCard({ canManage }: { canManage: boolean }) {
  const t = useTranslations('paymentMethods');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);

  const assetAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'asset').sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );
  const expenseAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'expense').sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );

  const reload = useCallback(async () => {
    const [nextMethods, nextAccounts] = await Promise.all([
      paymentMethodsApi.list({ includeInactive: true }),
      accountingApi.getAccounts(),
    ]);
    setMethods(nextMethods);
    setAccounts(nextAccounts as AccountRecord[]);
  }, []);

  useEffect(() => {
    reload()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [reload]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await reload();
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const ok = await run('save', () =>
      editingId ? paymentMethodsApi.update(editingId, toPayload(form)) : paymentMethodsApi.create(toPayload(form))
    );
    if (ok) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-slate-200 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-slate-900">{t('title')}</h3>
      <p className="mt-1 text-sm text-slate-500">{t('description')}</p>

      {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="mt-4 text-sm text-slate-500">{t('loading')}</div>
      ) : (
        <div className="mt-4 space-y-2">
          {methods.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">{t('empty')}</div>
          ) : (
            methods.map((method) => (
              <div key={method.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{method.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t(`kind.${method.kind}`)} · {t('account')}: {method.account_code ?? '—'} {method.account_name ?? ''}
                  </div>
                  {hasPayout(method.kind) && (
                    <div className="mt-0.5 text-xs text-slate-500">
                      {method.fee_account_id && method.payout_match
                        ? t('payoutSummary', {
                            match: method.payout_match,
                            percent: method.fee_percent ?? 0,
                            fixed: (method.fee_fixed ?? 0).toFixed(2),
                            account: `${method.fee_account_code ?? ''} ${method.fee_account_name ?? ''}`.trim(),
                          })
                        : t('payoutNotSet')}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${method.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {method.is_active ? t('active') : t('inactive')}
                  </span>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(method.id);
                          setForm({
                            name: method.name,
                            kind: method.kind,
                            account_id: method.account_id,
                            fee_account_id: method.fee_account_id ?? '',
                            fee_percent: method.fee_percent === null ? '' : String(method.fee_percent),
                            fee_fixed: method.fee_fixed === null ? '' : String(method.fee_fixed),
                            payout_match: method.payout_match ?? '',
                          });
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 max-lg:py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {t('edit')}
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void run(`toggle-${method.id}`, () => paymentMethodsApi.update(method.id, { is_active: !method.is_active }))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 max-lg:py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {method.is_active ? t('deactivate') : t('activate')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {canManage && (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('name')}</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={t('namePlaceholder')}
                className="h-11 w-full rounded-lg border border-slate-200 px-4"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('kindLabel')}</span>
              <select
                value={form.kind}
                onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as PaymentMethodKind }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-4"
              >
                {PAYMENT_METHOD_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{t(`kind.${kind}`)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('account')}</span>
              <select
                value={form.account_id}
                onChange={(event) => setForm((current) => ({ ...current, account_id: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-4"
              >
                <option value="">{t('selectAccount')}</option>
                {assetAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('accountHint')}</p>

          {hasPayout(form.kind) && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">{t('payoutTitle')}</div>
              <p className="mt-1 text-xs text-slate-500">{t('payoutDescription')}</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('payoutMatch')}</span>
                  <input
                    value={form.payout_match}
                    onChange={(event) => setForm((current) => ({ ...current, payout_match: event.target.value }))}
                    placeholder={t('payoutMatchPlaceholder')}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('feeAccount')}</span>
                  <select
                    value={form.fee_account_id}
                    onChange={(event) => setForm((current) => ({ ...current, fee_account_id: event.target.value }))}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4"
                  >
                    <option value="">{t('selectFeeAccount')}</option>
                    {expenseAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('feePercent')}</span>
                  <input
                    value={form.fee_percent}
                    onChange={(event) => setForm((current) => ({ ...current, fee_percent: event.target.value }))}
                    inputMode="decimal"
                    placeholder="1,69"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 font-mono"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('feeFixed')}</span>
                  <input
                    value={form.fee_fixed}
                    onChange={(event) => setForm((current) => ({ ...current, fee_fixed: event.target.value }))}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 font-mono"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">{t('payoutHint')}</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!form.name.trim() || !form.account_id || busy !== null}
              className="h-11 rounded-lg bg-[var(--primary)] px-6 font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy === 'save' ? t('saving') : editingId ? t('save') : t('add')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                className="h-11 rounded-lg border border-slate-200 px-6 font-medium transition-colors hover:bg-slate-50"
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
