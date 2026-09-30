'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Copy, Loader2, Mail, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { invoiceInboxApi, type InvoiceInboxAttachment, type InvoiceInboxMessage, type InvoiceInboxStatus } from '@/lib/api/invoiceInbox.api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const dateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const ATTACHMENT_TONE: Record<InvoiceInboxAttachment['processing_status'], string> = {
  processed: 'bg-emerald-50 text-emerald-700',
  duplicate_skipped: 'bg-slate-100 text-slate-600',
  unsupported: 'bg-slate-100 text-slate-500',
  failed: 'bg-red-50 text-red-700',
  received: 'bg-slate-100 text-slate-600',
};

/**
 * Purchase invoices by e-mail: the company's own address. Mail sent there (PDF or e-invoice XML
 * attachments) becomes purchase invoice drafts, the same as an upload. Below: the latest messages.
 */
export function InvoiceInboxTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations('invoiceInbox');
  const [status, setStatus] = useState<InvoiceInboxStatus | null>(null);
  const [messages, setMessages] = useState<InvoiceInboxMessage[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([invoiceInboxApi.status(), invoiceInboxApi.messages().catch(() => [] as InvoiceInboxMessage[])]);
      setStatus(s);
      setMessages(m);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (key: string, action: () => Promise<InvoiceInboxStatus>) => {
    setBusy(key);
    setError(null);
    try { setStatus(await action()); } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(null); }
  };

  const copy = async () => {
    if (!status?.address) return;
    await navigator.clipboard.writeText(status.address).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!status) return <div className="text-sm text-slate-500">{error ?? t('loading')}</div>;

  const attachmentLabel = (a: InvoiceInboxAttachment) =>
    a.processing_status === 'processed' ? (a.draft_invoice_id ? t('attDraft') : t('attImported'))
      : a.processing_status === 'duplicate_skipped' ? t('attDuplicate')
        : a.processing_status === 'unsupported' ? t('attUnsupported')
          : a.processing_status === 'failed' ? t('attFailed') : t('attReceived');

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('description')}</p>

      {!status.configured && (
        <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('serverNotConfigured')}
        </div>
      )}
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {status.configured && (
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          {status.enabled && status.address ? (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('yourAddress')}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="min-w-0 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-[15px] text-slate-900">{status.address}</code>
                <button type="button" onClick={() => void copy()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied ? t('copied') : t('copy')}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600">{t('howTo')}</p>
              {canManage && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={!!busy} onClick={() => setConfirmRotate(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {busy === 'rotate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{t('rotate')}
                  </button>
                  <button type="button" disabled={!!busy} onClick={() => void run('disable', () => invoiceInboxApi.setEnabled(false))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {busy === 'disable' && <Loader2 className="h-4 w-4 animate-spin" />}{t('disable')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div className="text-sm text-slate-600">{status.address ? t('disabledWithAddress', { address: status.address }) : t('notEnabled')}</div>
              </div>
              {canManage && (
                <button type="button" disabled={!!busy} onClick={() => void run('enable', () => invoiceInboxApi.setEnabled(true))} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
                  {busy === 'enable' && <Loader2 className="h-4 w-4 animate-spin" />}{t('enable')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{t('logTitle')}</h3>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><RefreshCw className="h-3.5 w-3.5" />{t('refresh')}</button>
        </div>
        {!messages || messages.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">{t('logEmpty')}</div>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {messages.map((m) => (
              <li key={m.id} className="px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900">{m.sender_name || m.sender_email || '—'}</span>
                    {m.sender_name && m.sender_email && <span className="ml-1 text-slate-500">{m.sender_email}</span>}
                    {m.sender_known === false && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">{t('unknownSender')}</span>}
                  </div>
                  <span className="font-mono text-xs text-slate-500">{dateTime(m.received_at || m.created_at)}</span>
                </div>
                <div className="truncate text-slate-600" title={m.subject || ''}>{m.subject || t('noSubject')}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {m.status === 'no_attachment' && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{t('noAttachment')}</span>}
                  {m.attachments.map((a) => (
                    <span key={a.id} className={`inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${ATTACHMENT_TONE[a.processing_status]}`} title={a.error_message || a.attachment_name}>
                      <span className="max-w-[180px] truncate">{a.attachment_name}</span>
                      <span>·</span>
                      {a.draft_invoice_id ? <Link href={`/invoices/${a.draft_invoice_id}/edit`} className="font-medium underline">{attachmentLabel(a)}</Link> : <span>{attachmentLabel(a)}</span>}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmRotate} onOpenChange={setConfirmRotate}
        title={t('rotateTitle')} description={t('rotateDescription')} confirmLabel={t('rotate')} variant="warning"
        onConfirm={async () => { setConfirmRotate(false); await run('rotate', () => invoiceInboxApi.rotate()); }}
      />
    </div>
  );
}
