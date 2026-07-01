'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getErrorMessage } from '@/lib/api/client';
import { bankingApi, type DraftExclusionRule } from '@/lib/api/banking.api';
import { billingApi, type BillingInvoice, type BillingPlan, type BillingSubscription, type BillingEntitlement, type BillingSettings, type BillingReminderHistoryItem, type BillingReminderOperationItem, type BillingAnnualBalanceHistoryItem, type BillingAnnualBalanceMismatchItem, type BillingAnnualBalanceNotificationItem, type BillingAnnualBalanceReport, type BillingMessagePreview } from '@/lib/api/billing.api';
import { getIsoCurrentYearStart, getIsoToday } from '@/lib/utils/date';
import { BillingField, ReportStat, TabFeedback } from '../_components/fields';

export function BillingTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations('settings');
  const { tenant } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingAction, setBillingAction] = useState<string | null>(null);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [billingSubscription, setBillingSubscription] = useState<BillingSubscription | null>(null);
  const [billingInvoices, setBillingInvoices] = useState<BillingInvoice[]>([]);
  const [billingReminderOperations, setBillingReminderOperations] = useState<BillingReminderOperationItem[]>([]);
  const [billingReminderHistory, setBillingReminderHistory] = useState<BillingReminderHistoryItem[]>([]);
  const [billingAnnualBalanceHistory, setBillingAnnualBalanceHistory] = useState<BillingAnnualBalanceHistoryItem[]>([]);
  const [billingAnnualBalanceMismatches, setBillingAnnualBalanceMismatches] = useState<BillingAnnualBalanceMismatchItem[]>([]);
  const [billingAnnualBalanceNotifications, setBillingAnnualBalanceNotifications] = useState<BillingAnnualBalanceNotificationItem[]>([]);
  const [billingMismatchFilter, setBillingMismatchFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [billingEntitlement, setBillingEntitlement] = useState<BillingEntitlement | null>(null);
  const [billingSettingsState, setBillingSettingsState] = useState<BillingSettings | null>(null);
  const [billingMessagePreview, setBillingMessagePreview] = useState<BillingMessagePreview | null>(null);
  const [mismatchResolutionNotes, setMismatchResolutionNotes] = useState<Record<string, string>>({});
  const [annualBalanceReport, setAnnualBalanceReport] = useState<BillingAnnualBalanceReport | null>(null);
  const [billingForm, setBillingForm] = useState({
    bill_to_name: '',
    bill_to_registry_code: '',
    bill_to_vat_number: '',
    bill_to_address: '',
    bill_to_email: '',
    invoice_due_days: '14',
    reminders_enabled: true,
    reminder_weekday: '2',
    reminder_frequency_days: '7',
    reminder_start_after_days: '7',
    reminder_template_first: 'Hello {{bill_to_name}}, this is a gentle reminder that invoice #{{invoice_no}} for {{total}} was due on {{due_date}}.',
    reminder_template_second: 'Reminder {{reminder_index}}: invoice #{{invoice_no}} for {{total}} is still unpaid. The due date was {{due_date}}.',
    reminder_template_third: 'Final reminder: invoice #{{invoice_no}} for {{total}} remains overdue since {{due_date}}. Please arrange payment as soon as possible.',
    annual_balance_template: 'Hello {{bill_to_name}},\n\nWe hereby confirm that as of {{as_of_date}}, {{balance_statement}}.\nIf this is not correct, please contact us.',
    preview_reminder_index: '1',
    // Date fields default to today / start of year directly in the initializer
    // (the old page set them in a mount effect, which triggered an extra render).
    annual_balance_reference_date: getIsoToday(),
    annual_balance_report_start_date: getIsoCurrentYearStart(),
    annual_balance_report_end_date: getIsoToday(),
    plan_id: '',
    status: 'active',
    billing_day: '1',
    unit_price: '49',
    quantity: '1',
    discount_percent: '0',
    vat_rate: '22',
    currency: 'EUR',
    current_period_start: getIsoToday(),
    current_period_end: getIsoToday(),
    next_invoice_date: getIsoToday(),
    cancel_at_period_end: false,
  });
  const [missingReceiptForm, setMissingReceiptForm] = useState({
    is_enabled: false,
    responsible_email: '',
    frequency_days: '7',
    start_after_days: '0',
    weekday: '',
    max_reminders: '5',
    email_subject: 'Missing receipt reminder: {{supplier_name}} — {{amount}} {{currency}}',
    email_body: 'Hello,\n\nA bank payment of {{amount}} {{currency}} on {{tx_date}} to {{supplier_name}} (ref: {{reference}}) has no matching purchase invoice or receipt on file.\n\nPlease upload the receipt or forward the invoice so it can be recorded.\n\n→ {{draft_link}}\n\nThis is reminder #{{reminder_index}}.\n\nThank you.',
  });
  const [draftRules, setDraftRules] = useState<DraftExclusionRule[]>([]);

  const loadMissingReceiptSettings = async () => {
    try {
      const data = await bankingApi.getMissingReceiptSettings();
      if (data) {
        setMissingReceiptForm({
          is_enabled: data.is_enabled ?? false,
          responsible_email: data.responsible_email || '',
          frequency_days: String(data.frequency_days ?? 7),
          start_after_days: String(data.start_after_days ?? 0),
          weekday: data.weekday ? String(data.weekday) : '',
          max_reminders: data.max_reminders ? String(data.max_reminders) : '',
          email_subject: data.email_subject || '',
          email_body: data.email_body || '',
        });
      }
    } catch { /* settings not yet created, use defaults */ }
    try {
      setDraftRules(await bankingApi.getDraftExclusionRules());
    } catch { /* rules unavailable */ }
  };

  useEffect(() => {
    if (!canManage) {
      return;
    }

    const load = async () => {
      setBillingLoading(true);
      setError(null);
      try {
        const overview = await billingApi.getOverview();
        setBillingPlans(overview.plans);
        setBillingSubscription(overview.subscription);
        setBillingInvoices(overview.invoices);
        setBillingReminderOperations(overview.reminder_operations || []);
        setBillingReminderHistory(overview.reminder_history || []);
        setBillingAnnualBalanceHistory(overview.annual_balance_history || []);
        setBillingAnnualBalanceMismatches(overview.annual_balance_mismatches || []);
        setBillingAnnualBalanceNotifications(overview.annual_balance_notifications || []);
        setBillingEntitlement(overview.entitlement);
        setBillingSettingsState(overview.settings);
        setBillingForm({
          bill_to_name: overview.settings?.bill_to_name || tenant?.name || '',
          bill_to_registry_code: overview.settings?.bill_to_registry_code || '',
          bill_to_vat_number: overview.settings?.bill_to_vat_number || '',
          bill_to_address: overview.settings?.bill_to_address || '',
          bill_to_email: overview.settings?.bill_to_email || tenant?.email || '',
          invoice_due_days: String(overview.settings?.invoice_due_days || 14),
          reminders_enabled: overview.settings?.reminders_enabled ?? true,
          reminder_weekday: String(overview.settings?.reminder_weekday || 2),
          reminder_frequency_days: String(overview.settings?.reminder_frequency_days || 7),
          reminder_start_after_days: String(overview.settings?.reminder_start_after_days || 7),
          reminder_template_first: overview.settings?.reminder_template_first || 'Hello {{bill_to_name}}, this is a gentle reminder that invoice #{{invoice_no}} for {{total}} was due on {{due_date}}.',
          reminder_template_second: overview.settings?.reminder_template_second || 'Reminder {{reminder_index}}: invoice #{{invoice_no}} for {{total}} is still unpaid. The due date was {{due_date}}.',
          reminder_template_third: overview.settings?.reminder_template_third || 'Final reminder: invoice #{{invoice_no}} for {{total}} remains overdue since {{due_date}}. Please arrange payment as soon as possible.',
          annual_balance_template: overview.settings?.annual_balance_template || 'Hello {{bill_to_name}},\n\nWe hereby confirm that as of {{as_of_date}}, {{balance_statement}}.\nIf this is not correct, please contact us.',
          preview_reminder_index: '1',
          annual_balance_reference_date: new Date().toISOString().slice(0, 10),
          annual_balance_report_start_date: new Date(new Date().getUTCFullYear(), 0, 1).toISOString().slice(0, 10),
          annual_balance_report_end_date: new Date().toISOString().slice(0, 10),
          plan_id: overview.subscription?.plan_id || overview.plans[0]?.id || '',
          status: overview.subscription?.status || 'active',
          billing_day: String(overview.subscription?.billing_day || 1),
          unit_price: String(overview.subscription?.unit_price || 49),
          quantity: String(overview.subscription?.quantity || 1),
          discount_percent: String(overview.subscription?.discount_percent || 0),
          vat_rate: String(overview.subscription?.vat_rate ?? overview.settings?.vat_rate ?? 22),
          currency: overview.subscription?.currency || overview.settings?.currency || tenant?.base_currency || 'EUR',
          current_period_start: overview.subscription?.current_period_start || new Date().toISOString().slice(0, 10),
          current_period_end: overview.subscription?.current_period_end || new Date().toISOString().slice(0, 10),
          next_invoice_date: overview.subscription?.next_invoice_date || new Date().toISOString().slice(0, 10),
          cancel_at_period_end: Boolean(overview.subscription?.cancel_at_period_end),
        });
        await loadMissingReceiptSettings();
      } catch (error) {
        setError(getErrorMessage(error));
      } finally {
        setBillingLoading(false);
      }
    };

    void load();
  }, [canManage, tenant?.base_currency]);

  const reloadBilling = async () => {
    const overview = await billingApi.getOverview();
    setBillingPlans(overview.plans);
    setBillingSubscription(overview.subscription);
    setBillingInvoices(overview.invoices);
    setBillingReminderOperations(overview.reminder_operations || []);
    setBillingReminderHistory(overview.reminder_history || []);
    setBillingAnnualBalanceHistory(overview.annual_balance_history || []);
    setBillingAnnualBalanceMismatches(overview.annual_balance_mismatches || []);
    setBillingAnnualBalanceNotifications(overview.annual_balance_notifications || []);
    setBillingEntitlement(overview.entitlement);
    setBillingSettingsState(overview.settings);
  };

  const updateDraftRule = (id: string, patch: Partial<DraftExclusionRule>) => {
    setDraftRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const addDraftRule = () => {
    setDraftRules((current) => [
      ...current,
      { id: crypto.randomUUID(), label: '', enabled: true, field: 'counterparty_name', match: 'contains', value: '' },
    ]);
  };

  const removeDraftRule = (id: string) => {
    setDraftRules((current) => current.filter((rule) => rule.id !== id));
  };

  const saveDraftRules = async () => {
    setError(null);
    setSuccess(null);
    try {
      const saved = await bankingApi.saveDraftExclusionRules(draftRules.filter((rule) => rule.value.trim()));
      setDraftRules(saved);
      setSuccess(t('draftExclusionRulesSaved'));
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const saveMissingReceiptSettings = async () => {
    setError(null);
    setSuccess(null);
    try {
      await bankingApi.updateMissingReceiptSettings({
        is_enabled: missingReceiptForm.is_enabled,
        responsible_email: missingReceiptForm.responsible_email || null,
        frequency_days: Number(missingReceiptForm.frequency_days || 7),
        start_after_days: Number(missingReceiptForm.start_after_days || 0),
        weekday: missingReceiptForm.weekday ? Number(missingReceiptForm.weekday) : null,
        max_reminders: missingReceiptForm.max_reminders ? Number(missingReceiptForm.max_reminders) : null,
        email_subject: missingReceiptForm.email_subject || null,
        email_body: missingReceiptForm.email_body || null,
      });
      setSuccess(t('missingReceiptSettingsSaved'));
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const saveBillingSubscription = async () => {
    setBillingSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await billingApi.upsertSubscription({
        plan_id: billingForm.plan_id,
        status: billingForm.status,
        billing_day: Number(billingForm.billing_day || 1),
        unit_price: Number(billingForm.unit_price || 0),
        quantity: Number(billingForm.quantity || 1),
        discount_percent: Number(billingForm.discount_percent || 0),
        vat_rate: billingForm.vat_rate === '' ? null : Number(billingForm.vat_rate),
        currency: billingForm.currency,
        current_period_start: billingForm.current_period_start,
        current_period_end: billingForm.current_period_end,
        next_invoice_date: billingForm.next_invoice_date,
        cancel_at_period_end: billingForm.cancel_at_period_end,
      });
      setBillingSubscription(result.subscription);
      await reloadBilling();
      setSuccess(t('billingSubscriptionSaved'));
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBillingSaving(false);
    }
  };

  const currentBillingSettingsDraft = {
    bill_to_name: billingForm.bill_to_name,
    bill_to_email: billingForm.bill_to_email || null,
    bill_to_registry_code: billingForm.bill_to_registry_code || null,
    bill_to_vat_number: billingForm.bill_to_vat_number || null,
    bill_to_address: billingForm.bill_to_address || null,
    invoice_due_days: Number(billingForm.invoice_due_days || 14),
    reminders_enabled: billingForm.reminders_enabled,
    reminder_weekday: Number(billingForm.reminder_weekday || 2),
    reminder_frequency_days: Number(billingForm.reminder_frequency_days || 7),
    reminder_start_after_days: Number(billingForm.reminder_start_after_days || 7),
    reminder_template_first: billingForm.reminder_template_first || null,
    reminder_template_second: billingForm.reminder_template_second || null,
    reminder_template_third: billingForm.reminder_template_third || null,
    annual_balance_template: billingForm.annual_balance_template || null,
  };

  const visibleBillingMismatches = billingAnnualBalanceMismatches.filter((event) => {
    const isResolved = Boolean(event.payload?.resolved_at);
    if (billingMismatchFilter === 'open') return !isResolved;
    if (billingMismatchFilter === 'resolved') return isResolved;
    return true;
  });

  const exportAnnualBalanceReportCsv = () => {
    if (!annualBalanceReport) return;
    const header = [
      'sent_at',
      'reference_date',
      'recipient',
      'balance_direction',
      'balance_amount',
      'open_invoice_count',
      'response_decision',
      'responded_at',
      'response_note',
      'resolved_at',
      'resolution_note',
    ];
    const rows = annualBalanceReport.rows.map((row) => [
      row.sent_at || '',
      row.reference_date || '',
      row.recipient || '',
      row.balance_direction || '',
      row.balance_amount ?? '',
      row.open_invoice_count ?? '',
      row.response_decision || '',
      row.responded_at || '',
      row.response_note || '',
      row.resolved_at || '',
      row.resolution_note || '',
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `annual-balance-report-${annualBalanceReport.period.start_date}-${annualBalanceReport.period.end_date}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const runBillingAction = async (key: string, fn: () => Promise<void>) => {
    setBillingAction(key);
    setError(null);
    setSuccess(null);
    try {
      await fn();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBillingAction(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('billingTitle')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('billingDescription')}</p>
      <TabFeedback error={error} success={success} />

      {!canManage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('billingPermission')}
        </div>
      ) : billingLoading ? (
        <div className="text-sm text-slate-500">{t('loadingBillingConfiguration')}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('billingAccessState')}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{billingEntitlement?.access_state || t('statusActive')}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('billingInvoiceNextNumber')}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{billingSettingsState?.invoice_next_no ?? 1}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('billingOpenInvoices')}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {billingInvoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'void').length}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">{t('annualBalanceConfirmation')}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t('annualBalanceDescription')}
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
              <BillingField label={t('annualBalanceText')}>
                <textarea
                  value={billingForm.annual_balance_template}
                  onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_template: event.target.value }))}
                  className="min-h-[180px] w-full rounded-lg border border-slate-200 px-4 py-3"
                  style={{ fontSize: '16px' }}
                />
              </BillingField>
              <div className="space-y-4">
                <BillingField label={t('balanceReferenceDate')}>
                  <input
                    type="date"
                    value={billingForm.annual_balance_reference_date}
                    onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_reference_date: event.target.value }))}
                    className="w-full h-11 rounded-lg border border-slate-200 px-4"
                    style={{ fontSize: '16px' }}
                  />
                </BillingField>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  {t('placeholdersLabel')}: <code>{'{{bill_to_name}}'}</code>, <code>{'{{as_of_date}}'}</code>, <code>{'{{balance_amount}}'}</code>, <code>{'{{balance_direction}}'}</code>, <code>{'{{balance_statement}}'}</code>, <code>{'{{open_invoice_count}}'}</code>, <code>{'{{tenant_name}}'}</code>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runBillingAction('preview-annual-balance', async () => {
                  const preview = await billingApi.previewAnnualBalance({
                    reference_date: billingForm.annual_balance_reference_date,
                    settings_override: currentBillingSettingsDraft,
                  });
                  setBillingMessagePreview(preview);
                  setSuccess(t('annualBalancePreviewLoaded'));
                })}
                disabled={billingAction !== null}
                className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                {billingAction === 'preview-annual-balance' ? t('loading') : t('previewAnnualBalance')}
              </button>
              <button
                type="button"
                onClick={() => void runBillingAction('send-annual-balance', async () => {
                  const result = await billingApi.sendAnnualBalance({
                    reference_date: billingForm.annual_balance_reference_date,
                  });
                  await reloadBilling();
                  setSuccess(
                    result.sent
                      ? t('annualBalanceSent', { recipient: result.recipient || '' })
                      : result.skipped_reason
                        ? t('noMessageSentWithReason', { reason: result.skipped_reason })
                        : t('noMessageSent'),
                  );
                })}
                disabled={billingAction !== null}
                className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
              >
                {billingAction === 'send-annual-balance' ? t('sending') : t('sendAnnualBalanceConfirmation')}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {t('annualBalanceHelp')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">{t('reminderAutomation')}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t('reminderAutomationDescription')}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <BillingField label={t('billToName')}>
                <input value={billingForm.bill_to_name} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_name: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('billToEmail')}>
                <input value={billingForm.bill_to_email} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_email: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('billToRegistryCode')}>
                <input value={billingForm.bill_to_registry_code} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_registry_code: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('billToVatNumber')}>
                <input value={billingForm.bill_to_vat_number} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_vat_number: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('billToAddress')}>
                <input value={billingForm.bill_to_address} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_address: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('invoiceDueDays')}>
                <input value={billingForm.invoice_due_days} onChange={(event) => setBillingForm((current) => ({ ...current, invoice_due_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('reminderWeekday')}>
                <select value={billingForm.reminder_weekday} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_weekday: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }}>
                  <option value="1">{t('monday')}</option>
                  <option value="2">{t('tuesday')}</option>
                  <option value="3">{t('wednesday')}</option>
                  <option value="4">{t('thursday')}</option>
                  <option value="5">{t('friday')}</option>
                </select>
              </BillingField>
              <BillingField label={t('reminderFrequencyDays')}>
                <input value={billingForm.reminder_frequency_days} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_frequency_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('startAfterOverdueDays')}>
                <input value={billingForm.reminder_start_after_days} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_start_after_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <label className="flex items-center gap-3 pt-8">
                <input type="checkbox" checked={billingForm.reminders_enabled} onChange={(event) => setBillingForm((current) => ({ ...current, reminders_enabled: event.target.checked }))} />
                <span className="text-sm text-slate-700">{t('enableReminders')}</span>
              </label>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <BillingField label={t('firstReminderText')}>
                <textarea
                  value={billingForm.reminder_template_first}
                  onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_first: event.target.value }))}
                  className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                  style={{ fontSize: '16px' }}
                />
              </BillingField>
              <BillingField label={t('secondReminderText')}>
                <textarea
                  value={billingForm.reminder_template_second}
                  onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_second: event.target.value }))}
                  className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                  style={{ fontSize: '16px' }}
                />
              </BillingField>
              <BillingField label={t('thirdReminderText')}>
                <textarea
                  value={billingForm.reminder_template_third}
                  onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_third: event.target.value }))}
                  className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                  style={{ fontSize: '16px' }}
                />
              </BillingField>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {t('availablePlaceholders')}: <code>{'{{invoice_no}}'}</code>, <code>{'{{total}}'}</code>, <code>{'{{due_date}}'}</code>, <code>{'{{bill_to_name}}'}</code>, <code>{'{{reminder_index}}'}</code>
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <BillingField label={t('previewReminderStage')}>
                <select
                  value={billingForm.preview_reminder_index}
                  onChange={(event) => setBillingForm((current) => ({ ...current, preview_reminder_index: event.target.value }))}
                  className="h-11 rounded-lg border border-slate-200 px-4"
                  style={{ fontSize: '16px' }}
                >
                  <option value="1">{t('first')}</option>
                  <option value="2">{t('second')}</option>
                  <option value="3">{t('third')}</option>
                </select>
              </BillingField>
              <button
                type="button"
                onClick={() => void runBillingAction('preview-reminder', async () => {
                  const preview = await billingApi.previewReminder({
                    reminder_index: Number(billingForm.preview_reminder_index || 1),
                    settings_override: currentBillingSettingsDraft,
                  });
                  setBillingMessagePreview(preview);
                  setSuccess(t('reminderPreviewLoaded', { invoiceNo: preview.invoice?.invoice_no || '' }));
                })}
                disabled={billingAction !== null}
                className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                {billingAction === 'preview-reminder' ? t('loading') : t('previewReminder')}
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runBillingAction('settings', async () => {
                  await billingApi.updateSettings({
                    bill_to_name: billingForm.bill_to_name,
                    bill_to_email: billingForm.bill_to_email || null,
                    bill_to_registry_code: billingForm.bill_to_registry_code || null,
                    bill_to_vat_number: billingForm.bill_to_vat_number || null,
                    bill_to_address: billingForm.bill_to_address || null,
                    invoice_due_days: Number(billingForm.invoice_due_days || 14),
                    reminders_enabled: billingForm.reminders_enabled,
                    reminder_weekday: Number(billingForm.reminder_weekday || 2),
                    reminder_frequency_days: Number(billingForm.reminder_frequency_days || 7),
                    reminder_start_after_days: Number(billingForm.reminder_start_after_days || 7),
                    reminder_template_first: billingForm.reminder_template_first || null,
                    reminder_template_second: billingForm.reminder_template_second || null,
                    reminder_template_third: billingForm.reminder_template_third || null,
                    annual_balance_template: billingForm.annual_balance_template || null,
                  });
                  await reloadBilling();
                  setSuccess(t('billingSettingsSaved'));
                })}
                disabled={billingAction !== null}
                className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
              >
                {billingAction === 'settings' ? t('saving') : t('saveReminderSettings')}
              </button>
              <button
                type="button"
                onClick={() => void runBillingAction('reminders', async () => {
                  const result = await billingApi.sendReminders({ force: true });
                  await reloadBilling();
                  setSuccess(
                    result.sent_count > 0
                      ? t('remindersSent', { count: result.sent_count })
                      : result.skipped_reason
                        ? t('noRemindersSentWithReason', { reason: result.skipped_reason })
                        : t('noRemindersSent'),
                  );
                })}
                disabled={billingAction !== null}
                className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                {billingAction === 'reminders' ? t('sending') : t('sendRemindersNow')}
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {t('cronAutomationHelp')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">{t('missingReceiptReminders')}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t('missingReceiptRemindersDescription')}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex items-center gap-3 pt-2">
                <input type="checkbox" checked={missingReceiptForm.is_enabled} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, is_enabled: event.target.checked }))} />
                <span className="text-sm text-slate-700">{t('enableMissingReceiptReminders')}</span>
              </label>
              <BillingField label={t('missingReceiptResponsibleEmail')}>
                <input type="email" value={missingReceiptForm.responsible_email} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, responsible_email: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('missingReceiptFrequencyDays')}>
                <input type="number" min="1" value={missingReceiptForm.frequency_days} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, frequency_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('missingReceiptStartAfterDays')}>
                <input type="number" min="0" value={missingReceiptForm.start_after_days} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, start_after_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('missingReceiptWeekday')}>
                <select value={missingReceiptForm.weekday} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, weekday: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }}>
                  <option value="">{t('anyWeekday')}</option>
                  <option value="1">{t('monday')}</option>
                  <option value="2">{t('tuesday')}</option>
                  <option value="3">{t('wednesday')}</option>
                  <option value="4">{t('thursday')}</option>
                  <option value="5">{t('friday')}</option>
                </select>
              </BillingField>
              <BillingField label={t('missingReceiptMaxReminders')}>
                <input type="number" min="0" value={missingReceiptForm.max_reminders} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, max_reminders: event.target.value }))} placeholder={t('missingReceiptMaxRemindersUnlimited')} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <BillingField label={t('missingReceiptEmailSubject')}>
                <input value={missingReceiptForm.email_subject} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, email_subject: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <div />
              <BillingField label={t('missingReceiptEmailBody')}>
                <textarea
                  value={missingReceiptForm.email_body}
                  onChange={(event) => setMissingReceiptForm((c) => ({ ...c, email_body: event.target.value }))}
                  className="min-h-[180px] w-full rounded-lg border border-slate-200 px-4 py-3"
                  style={{ fontSize: '16px' }}
                />
              </BillingField>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {t('missingReceiptPlaceholders')}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void saveMissingReceiptSettings()}
                className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
              >
                {t('saveReminderSettings')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">{t('draftExclusionRulesTitle')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('draftExclusionRulesDescription')}</p>
            <div className="mt-4 space-y-2">
              {draftRules.map((rule) => (
                <div key={rule.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(event) => updateDraftRule(rule.id, { enabled: event.target.checked })}
                    className="h-4 w-4 shrink-0"
                  />
                  <input
                    value={rule.label}
                    onChange={(event) => updateDraftRule(rule.id, { label: event.target.value })}
                    placeholder={t('ruleLabel')}
                    className="h-10 min-w-[140px] flex-1 rounded-lg border border-slate-200 px-3 text-sm"
                  />
                  <select
                    value={rule.field}
                    onChange={(event) => updateDraftRule(rule.id, { field: event.target.value as DraftExclusionRule['field'] })}
                    className="h-10 rounded-lg border border-slate-200 px-2 text-sm"
                  >
                    <option value="counterparty_name">{t('ruleFieldCounterpartyName')}</option>
                    <option value="counterparty_account">{t('ruleFieldCounterpartyAccount')}</option>
                    <option value="reference">{t('ruleFieldReference')}</option>
                    <option value="description">{t('ruleFieldDescription')}</option>
                  </select>
                  <select
                    value={rule.match}
                    onChange={(event) => updateDraftRule(rule.id, { match: event.target.value as DraftExclusionRule['match'] })}
                    className="h-10 rounded-lg border border-slate-200 px-2 text-sm"
                  >
                    <option value="contains">{t('ruleMatchContains')}</option>
                    <option value="exact">{t('ruleMatchExact')}</option>
                    <option value="starts_with">{t('ruleMatchStartsWith')}</option>
                    <option value="regex">{t('ruleMatchRegex')}</option>
                  </select>
                  <input
                    value={rule.value}
                    onChange={(event) => updateDraftRule(rule.id, { value: event.target.value })}
                    placeholder={t('ruleValue')}
                    className="h-10 min-w-[140px] flex-1 rounded-lg border border-slate-200 px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeDraftRule(rule.id)}
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    {t('removeRule')}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={addDraftRule}
                className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('addRule')}
              </button>
              <button
                type="button"
                onClick={() => void saveDraftRules()}
                className="h-11 rounded-lg bg-[var(--primary)] px-6 font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {t('saveDraftExclusionRules')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{t('subscription')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('subscriptionDescription')}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <BillingField label={t('plan')}>
                <select
                  value={billingForm.plan_id}
                  onChange={(event) => setBillingForm((current) => ({ ...current, plan_id: event.target.value }))}
                  className="w-full h-11 px-4 border border-slate-200 rounded-lg"
                  style={{ fontSize: '16px' }}
                >
                  <option value="">{t('selectPlan')}</option>
                  {billingPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.code} - {plan.name}</option>
                  ))}
                </select>
              </BillingField>
              <BillingField label={t('status')}>
                <select
                  value={billingForm.status}
                  onChange={(event) => setBillingForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full h-11 px-4 border border-slate-200 rounded-lg"
                  style={{ fontSize: '16px' }}
                >
                  <option value="active">{t('statusActive')}</option>
                  <option value="paused">{t('statusPaused')}</option>
                  <option value="canceled">{t('statusCanceled')}</option>
                </select>
              </BillingField>
              <BillingField label={t('billingDay')}>
                <input value={billingForm.billing_day} onChange={(event) => setBillingForm((current) => ({ ...current, billing_day: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('currency')}>
                <input value={billingForm.currency} onChange={(event) => setBillingForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('unitPrice')}>
                <input value={billingForm.unit_price} onChange={(event) => setBillingForm((current) => ({ ...current, unit_price: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('quantity')}>
                <input value={billingForm.quantity} onChange={(event) => setBillingForm((current) => ({ ...current, quantity: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('discountPercent')}>
                <input value={billingForm.discount_percent} onChange={(event) => setBillingForm((current) => ({ ...current, discount_percent: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('vatRate')}>
                <input value={billingForm.vat_rate} onChange={(event) => setBillingForm((current) => ({ ...current, vat_rate: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('currentPeriodStart')}>
                <input type="date" value={billingForm.current_period_start} onChange={(event) => setBillingForm((current) => ({ ...current, current_period_start: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('currentPeriodEnd')}>
                <input type="date" value={billingForm.current_period_end} onChange={(event) => setBillingForm((current) => ({ ...current, current_period_end: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <BillingField label={t('nextInvoiceDate')}>
                <input type="date" value={billingForm.next_invoice_date} onChange={(event) => setBillingForm((current) => ({ ...current, next_invoice_date: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
              </BillingField>
              <label className="flex items-center gap-3 pt-8">
                <input type="checkbox" checked={billingForm.cancel_at_period_end} onChange={(event) => setBillingForm((current) => ({ ...current, cancel_at_period_end: event.target.checked }))} />
                <span className="text-sm text-slate-700">{t('cancelAtPeriodEnd')}</span>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveBillingSubscription}
                disabled={billingSaving}
                className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
              >
                {billingSaving ? t('saving') : t('saveSubscription')}
              </button>
              <button
                type="button"
                onClick={() => void runBillingAction('generate', async () => {
                  const result = await billingApi.generateInvoices();
                  await reloadBilling();
                  setSuccess(t('generatedBillingInvoices', { count: result.created_count }));
                })}
                disabled={billingAction !== null}
                className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                {billingAction === 'generate' ? t('generating') : t('generateInvoices')}
              </button>
              <button
                type="button"
                onClick={() => void runBillingAction('entitlements', async () => {
                  const result = await billingApi.recomputeEntitlements();
                  await reloadBilling();
                  setSuccess(t('entitlementsRecomputed', { state: result.entitlement.access_state }));
                })}
                disabled={billingAction !== null}
                className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                {billingAction === 'entitlements' ? t('recomputing') : t('recomputeEntitlements')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('messagePreview')}</h3>
            </div>
            {!billingMessagePreview ? (
              <div className="p-5 text-sm text-slate-500">{t('loadPreviewHint')}</div>
            ) : (
              <div className="space-y-4 p-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('subject')}</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{billingMessagePreview.subject}</div>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('type')}</div>
                    <div className="mt-1 text-sm text-slate-900">{billingMessagePreview.kind}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('reference')}</div>
                    <div className="mt-1 text-sm text-slate-900">{billingMessagePreview.invoice ? `Invoice #${billingMessagePreview.invoice.invoice_no}` : billingMessagePreview.reference_date || '-'}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('balanceOrStage')}</div>
                    <div className="mt-1 text-sm text-slate-900">
                      {billingMessagePreview.balance?.balance_statement || (billingMessagePreview.reminder_index ? `Reminder ${billingMessagePreview.reminder_index}` : '-')}
                    </div>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">{billingMessagePreview.text}</pre>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t('annualBalanceReporting')}</h3>
                  <p className="mt-1 text-xs text-slate-600">{t('annualBalanceReportingDescription')}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="date"
                    value={billingForm.annual_balance_report_start_date}
                    onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_report_start_date: event.target.value }))}
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    style={{ fontSize: '16px' }}
                  />
                  <input
                    type="date"
                    value={billingForm.annual_balance_report_end_date}
                    onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_report_end_date: event.target.value }))}
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    type="button"
                    onClick={() => void runBillingAction('annual-balance-report', async () => {
                      const report = await billingApi.getAnnualBalanceReport({
                        start_date: billingForm.annual_balance_report_start_date,
                        end_date: billingForm.annual_balance_report_end_date,
                      });
                      setAnnualBalanceReport(report);
                      setSuccess(t('annualBalanceReportLoaded'));
                    })}
                    disabled={billingAction !== null}
                    className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    {billingAction === 'annual-balance-report' ? t('loading') : t('loadReport')}
                  </button>
                  <button
                    type="button"
                    onClick={exportAnnualBalanceReportCsv}
                    disabled={!annualBalanceReport}
                    className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('exportCsv')}
                  </button>
                </div>
              </div>
            </div>
            {!annualBalanceReport ? (
              <div className="p-5 text-sm text-slate-500">{t('loadPeriodForAnnualBalance')}</div>
            ) : (
              <div className="space-y-4 p-5">
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <ReportStat label={t('sent')} value={annualBalanceReport.summary.sent_count} />
                  <ReportStat label={t('responded')} value={annualBalanceReport.summary.responded_count} />
                  <ReportStat label={t('confirmed')} value={annualBalanceReport.summary.confirmed_count} />
                  <ReportStat label={t('mismatches')} value={annualBalanceReport.summary.mismatch_count} />
                  <ReportStat label={t('openMismatches')} value={annualBalanceReport.summary.open_mismatch_count} />
                  <ReportStat label={t('resolved')} value={annualBalanceReport.summary.resolved_mismatch_count} />
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {[t('sent'), t('reference'), t('recipient'), t('balance'), t('response'), t('resolved')].map((label) => (
                          <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {annualBalanceReport.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 text-slate-700">{new Date(row.sent_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-700">{row.reference_date || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{row.recipient || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {row.balance_direction === 'you_owe_us'
                              ? t('theyOweAmount', { amount: Math.abs(Number(row.balance_amount || 0)).toFixed(2) })
                              : row.balance_direction === 'we_owe_you'
                                ? t('weOweAmount', { amount: Math.abs(Number(row.balance_amount || 0)).toFixed(2) })
                                : t('settled')}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {row.response_decision ? (
                              <div>
                                <div>{row.response_decision}</div>
                                {row.response_note && <div className="mt-1 text-xs text-slate-500">{row.response_note}</div>}
                              </div>
                            ) : t('noResponse')}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="space-y-1">
                              <div>
                                {row.resolved_at
                                  ? `${new Date(row.resolved_at).toLocaleString()}${row.resolution_note ? ` - ${row.resolution_note}` : ''}`
                                  : '-'}
                              </div>
                              <div className="text-xs text-slate-500">
                                {t('notification')}: {row.notification_status || t('notRecorded')}
                                {row.notified_internal_emails?.length ? ` · ${row.notified_internal_emails.join(', ')}` : ''}
                                {row.notification_error_message ? ` · ${row.notification_error_message}` : ''}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('reminderOperations')}</h3>
              <p className="mt-1 text-xs text-slate-600">{t('reminderOperationsDescription')}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {billingReminderOperations.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">{t('noReminderOperations')}</div>
              ) : (
                billingReminderOperations.map((invoice) => (
                  <div key={invoice.id} className="flex flex-col gap-3 p-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900">
                        Invoice #{invoice.invoice_no} · {Number(invoice.total || 0).toFixed(2)} {invoice.currency}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t('dueOverdueSent', { dueDate: invoice.due_date, overdueDays: invoice.overdue_days, reminderCount: invoice.reminder_sent_count })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t('recipientNextEligible', { recipient: invoice.recipient || t('missing'), date: invoice.next_eligible_reminder_date })}
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 xl:items-end">
                      <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                        invoice.eligible_now
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {invoice.eligible_now
                          ? t('eligibleNow')
                          : invoice.blocking_reason === 'disabled'
                            ? t('remindersDisabled')
                            : invoice.blocking_reason === 'not_overdue_enough'
                              ? t('tooEarly')
                              : invoice.blocking_reason === 'frequency_not_reached'
                                ? t('waitingFrequency')
                                : invoice.blocking_reason === 'weekday_mismatch'
                                  ? t('wrongWeekday')
                                  : t('notEligible')}
                      </div>
                      <button
                        type="button"
                        onClick={() => void runBillingAction(`send-invoice-reminder-${invoice.id}`, async () => {
                          const result = await billingApi.sendInvoiceReminder(invoice.id, { force: true });
                          await reloadBilling();
                          setSuccess(
                            result.sent
                              ? t('reminderSentForInvoice', { invoiceNo: invoice.invoice_no })
                              : result.skipped_reason === 'no_recipient'
                                ? t('reminderSkippedNoRecipient')
                                : result.skipped_reason === 'disabled'
                                  ? t('reminderSkippedDisabled')
                                  : result.skipped_reason === 'not_overdue_enough'
                                    ? t('reminderSkippedNotOverdueEnough')
                                    : result.skipped_reason === 'frequency_not_reached'
                                      ? t('reminderSkippedFrequency')
                                      : result.skipped_reason === 'weekday_mismatch'
                                        ? t('reminderSkippedWeekdayMismatch')
                                        : t('reminderWasNotSent')
                          );
                        })}
                        disabled={billingAction !== null}
                        className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        {billingAction === `send-invoice-reminder-${invoice.id}` ? t('sending') : t('sendReminder')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('billingInvoices')}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {billingInvoices.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">{t('noBillingInvoices')}</div>
              ) : (
                billingInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">#{invoice.invoice_no} · {invoice.status}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {t('billingInvoicePeriod', { start: invoice.issue_date, end: invoice.period_end, dueDate: invoice.due_date })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm text-slate-900">{Number(invoice.total || 0).toFixed(2)} {invoice.currency}</div>
                      {invoice.status !== 'paid' && invoice.status !== 'void' && (
                        <button
                          type="button"
                          onClick={() => void runBillingAction(`pay-${invoice.id}`, async () => {
                            await billingApi.markInvoicePaid(invoice.id);
                            await reloadBilling();
                            setSuccess(t('billingInvoiceMarkedPaid', { invoiceNo: invoice.invoice_no }));
                          })}
                          disabled={billingAction !== null}
                          className="h-9 px-4 border border-emerald-200 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === `pay-${invoice.id}` ? t('saving') : t('markPaid')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('internalNotificationStatus')}</h3>
              <p className="mt-1 text-xs text-slate-600">{t('internalNotificationDescription')}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {billingAnnualBalanceNotifications.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">{t('noInternalNotifications')}</div>
              ) : (
                billingAnnualBalanceNotifications.map((event) => (
                  <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {event.payload?.status === 'sent'
                          ? t('internalNotificationSent')
                          : event.payload?.status === 'failed'
                            ? t('internalNotificationFailed')
                            : t('internalNotificationSkipped')}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {t('asOfCustomer', { date: event.payload?.reference_date || t('unknown'), customer: event.payload?.recipient || t('unknown') })}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {event.payload?.notified_internal_emails?.length
                          ? event.payload.notified_internal_emails.join(', ')
                          : t('noInternalRecipients')}
                        {event.payload?.error_message ? ` · ${event.payload.error_message}` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-amber-50 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t('annualBalanceMismatchInbox')}</h3>
                  <p className="mt-1 text-xs text-slate-600">{t('annualBalanceMismatchDescription')}</p>
                </div>
                <div className="flex gap-2">
                  {(['open', 'resolved', 'all'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setBillingMismatchFilter(filterKey)}
                      className={`h-9 rounded-lg px-3 text-xs font-medium transition-colors ${
                        billingMismatchFilter === filterKey
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {filterKey === 'open' ? t('open') : filterKey === 'resolved' ? t('resolved') : t('all')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleBillingMismatches.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">
                  {billingMismatchFilter === 'resolved'
                    ? t('noResolvedBalanceMismatches')
                    : billingMismatchFilter === 'all'
                      ? t('noBalanceMismatchesReported')
                      : t('noOpenBalanceMismatches')}
                </div>
              ) : (
                visibleBillingMismatches.map((event) => (
                  <div key={event.id} className="space-y-3 p-5">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {event.sent_payload?.balance_direction === 'we_owe_you'
                            ? t('mismatchWeOwe', { amount: Math.abs(Number(event.sent_payload?.balance_amount || 0)).toFixed(2) })
                            : event.sent_payload?.balance_direction === 'you_owe_us'
                              ? t('mismatchTheyOwe', { amount: Math.abs(Number(event.sent_payload?.balance_amount || 0)).toFixed(2) })
                              : t('mismatchSettled')}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {t('asOfRecipient', { date: event.payload?.reference_date || event.sent_payload?.reference_date || t('unknown'), recipient: event.payload?.recipient || event.sent_payload?.recipient || t('noRecipient') })}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {event.payload?.resolved_at
                          ? t('resolvedAt', { date: new Date(event.payload.resolved_at).toLocaleString() })
                          : new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      {event.payload?.note || t('noMismatchNote')}
                    </div>
                    {event.payload?.resolved_at ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        {event.payload?.resolution_note ? t('resolvedWithNote', { note: event.payload.resolution_note }) : t('resolvedOnly')}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <input
                          value={mismatchResolutionNotes[event.id] || ''}
                          onChange={(e) => setMismatchResolutionNotes((current) => ({ ...current, [event.id]: e.target.value }))}
                          placeholder={t('optionalResolutionNote')}
                          className="h-11 flex-1 rounded-lg border border-slate-200 px-4"
                          style={{ fontSize: '16px' }}
                        />
                        <button
                          type="button"
                          onClick={() => void runBillingAction(`resolve-mismatch-${event.id}`, async () => {
                            await billingApi.resolveAnnualBalanceMismatch(event.id, {
                              resolution_note: mismatchResolutionNotes[event.id] || undefined,
                            });
                            setMismatchResolutionNotes((current) => ({ ...current, [event.id]: '' }));
                            await reloadBilling();
                            setSuccess(t('mismatchMarkedResolved'));
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-5 rounded-lg border border-emerald-200 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {billingAction === `resolve-mismatch-${event.id}` ? t('saving') : t('markResolved')}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('reminderHistory')}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {billingReminderHistory.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">{t('noRemindersSentYet')}</div>
              ) : (
                billingReminderHistory.map((event) => (
                  <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {t('reminderHistoryItem', { index: event.payload?.reminder_index || '?', kind: event.payload?.template_kind || t('custom') })}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {t('invoiceDueRecipient', { invoiceNo: event.payload?.invoice_no || t('unknown'), dueDate: event.payload?.due_date || t('unknown'), recipient: event.payload?.recipient || t('noRecipient') })}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('annualBalanceHistory')}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {billingAnnualBalanceHistory.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">{t('noAnnualBalanceHistory')}</div>
              ) : (
                billingAnnualBalanceHistory.map((event) => (
                  <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {event.type === 'annual_balance_confirmation_response'
                          ? event.payload?.decision === 'confirm'
                            ? t('customerConfirmedBalance')
                            : t('customerReportedMismatch')
                          : event.payload?.balance_direction === 'we_owe_you'
                            ? t('weOweThemAmount', { amount: Math.abs(Number(event.payload?.balance_amount || 0)).toFixed(2) })
                            : event.payload?.balance_direction === 'you_owe_us'
                              ? t('theyOweUsAmount', { amount: Math.abs(Number(event.payload?.balance_amount || 0)).toFixed(2) })
                              : t('balanceSettled')}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {event.type === 'annual_balance_confirmation_response'
                          ? t('asOfRecipient', { date: event.payload?.reference_date || t('unknown'), recipient: event.payload?.recipient || t('noRecipient') })
                          : t('asOfRecipientOpenInvoices', { date: event.payload?.reference_date || t('unknown'), recipient: event.payload?.recipient || t('noRecipient'), count: event.payload?.open_invoice_count || 0 })}
                      </div>
                      {event.type === 'annual_balance_confirmation_response' && event.payload?.decision === 'mismatch' && event.payload?.note && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          {event.payload.note}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
