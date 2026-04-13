'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { invoiceRemindersApi, type ReminderSettings, type OverdueInvoice } from '@/lib/api/invoiceReminders.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceRemindersPage() {
  const t = useTranslations('reminders');
  const tc = useTranslations('common');

  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [overdue, setOverdue] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [batchResult, setBatchResult] = useState<{ sent: number; skipped: number; errors: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, o] = await Promise.all([
        invoiceRemindersApi.getSettings(),
        invoiceRemindersApi.getOverdueInvoices(),
      ]);
      setSettings(s);
      setOverdue(o);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSendOne = async (invoiceId: string) => {
    setSending(invoiceId);
    try {
      await invoiceRemindersApi.sendReminder(invoiceId);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(null);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    setBatchResult(null);
    try {
      const result = await invoiceRemindersApi.sendAllDue();
      setBatchResult(result);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSendingAll(false);
    }
  };

  if (loading) return <PageSkeleton hasStats tableRows={5} tableColumns={6} />;

  if (error && !overdue.length) {
    return (
      <div>
        <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1></div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('description')}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <Settings className="h-4 w-4" /> {t('settings')}
        </button>
        {settings?.is_enabled && overdue.length > 0 && (
          <button
            onClick={handleSendAll}
            disabled={sendingAll}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <RefreshCw className={`h-4 w-4 ${sendingAll ? 'animate-spin' : ''}`} />
            {t('sendAllDue')}
          </button>
        )}
      </div>

      {/* Status */}
      {!settings?.is_enabled && (
        <div className="card p-4 mb-6" style={{ borderLeft: '3px solid #f59e0b' }}>
          <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle className="h-4 w-4" style={{ color: '#f59e0b' }} />
            {t('remindersDisabled')}
          </p>
        </div>
      )}

      {batchResult && (
        <div className="card p-4 mb-6" style={{ borderLeft: '3px solid var(--success, #16a34a)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {t('batchResult', { sent: batchResult.sent, skipped: batchResult.skipped, errors: batchResult.errors })}
          </p>
        </div>
      )}

      {error && <div className="card p-4 mb-6" style={{ borderLeft: '3px solid #ef4444' }}><p className="text-sm" style={{ color: '#ef4444' }}>{error}</p></div>}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('totalOverdue')}</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#ef4444' }}>{overdue.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('totalAmount')}</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>&euro;{fmt(overdue.reduce((s, i) => s + i.total, 0))}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('needsReminder')}</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#f59e0b' }}>
            {overdue.filter(i => i.partner_email && i.reminders_sent < (settings?.max_reminders || 3)).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('noEmail')}</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-muted)' }}>{overdue.filter(i => !i.partner_email).length}</p>
        </div>
      </div>

      {/* Overdue invoices table */}
      {overdue.length === 0 ? (
        <EmptyState icon={Bell} title={t('title')} message={t('noOverdue')} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('invoice')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('partner')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('amount')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('dueDate')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('daysOverdue')}</th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('remindersSent')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>{inv.invoice_number}</td>
                  <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                    {inv.partner_name}
                    {inv.partner_email && <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>({inv.partner_email})</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium" style={{ color: 'var(--text-primary)' }}>&euro;{fmt(inv.total)}</td>
                  <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>{inv.due_date}</td>
                  <td className="py-2.5 px-4 text-right font-medium" style={{
                    color: inv.days_overdue > 90 ? '#991b1b' : inv.days_overdue > 60 ? '#ef4444' : inv.days_overdue > 30 ? '#f97316' : '#eab308'
                  }}>
                    {inv.days_overdue}d
                  </td>
                  <td className="py-2.5 px-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                    {inv.reminders_sent}/{settings?.max_reminders || 3}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {inv.partner_email && inv.reminders_sent < (settings?.max_reminders || 3) && (
                      <button
                        onClick={() => handleSendOne(inv.id)}
                        disabled={sending === inv.id}
                        className="px-3 py-1 rounded text-xs font-medium inline-flex items-center gap-1"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        <Send className="h-3 w-3" /> {t('send')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          initial={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => { setSettings(s); setShowSettings(false); }}
          t={t}
          tc={tc}
        />
      )}
    </div>
  );
}

function SettingsModal({ initial, onClose, onSaved, t, tc }: {
  initial: ReminderSettings | null;
  onClose: () => void;
  onSaved: (s: ReminderSettings) => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  const [form, setForm] = useState({
    is_enabled: initial?.is_enabled || false,
    start_after_days: String(initial?.start_after_days || 7),
    frequency_days: String(initial?.frequency_days || 7),
    max_reminders: String(initial?.max_reminders || 3),
    email_subject: initial?.email_subject || 'Payment Reminder: Invoice {{invoice_number}}',
    email_body: initial?.email_body || 'Dear {{partner_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for {{currency}} {{total}} was due on {{due_date}}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      const result = await invoiceRemindersApi.updateSettings({
        is_enabled: form.is_enabled,
        start_after_days: parseInt(form.start_after_days),
        frequency_days: parseInt(form.frequency_days),
        max_reminders: parseInt(form.max_reminders),
        email_subject: form.email_subject,
        email_body: form.email_body,
      });
      onSaved(result);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('reminderSettings')}</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_enabled} onChange={e => setForm(prev => ({ ...prev, is_enabled: e.target.checked }))} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('enableReminders')}</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('startAfterDays')}</label>
              <input type="number" value={form.start_after_days} onChange={e => setForm(prev => ({ ...prev, start_after_days: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('frequencyDays')}</label>
              <input type="number" value={form.frequency_days} onChange={e => setForm(prev => ({ ...prev, frequency_days: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('maxReminders')}</label>
              <input type="number" value={form.max_reminders} onChange={e => setForm(prev => ({ ...prev, max_reminders: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('emailSubject')}</label>
            <input value={form.email_subject} onChange={e => setForm(prev => ({ ...prev, email_subject: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('emailBody')}</label>
            <textarea rows={6} value={form.email_body} onChange={e => setForm(prev => ({ ...prev, email_body: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('templateVars')}</p>
          </div>
          {err && <p className="text-sm" style={{ color: '#ef4444' }}>{err}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{tc('cancel')}</button>
            <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
              {saving ? tc('saving') : tc('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
