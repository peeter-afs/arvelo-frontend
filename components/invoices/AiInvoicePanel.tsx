'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import { useLocale } from 'next-intl';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import {
  aiInvoiceApi,
  type AiInvoicePreview,
  type AiInvoiceLine,
  type ParsedInvoiceDraft,
  type PartnerMatch,
} from '@/lib/api/aiInvoice.api';
import { showToast } from '@/components/ui/Toast';

type Step = 'capture' | 'preview';
type InvoiceKind = 'regular' | 'recurring';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftCreated?: () => void;
  partners: Array<{ id: string; name: string }>;
};

export default function AiInvoicePanel({ open, onOpenChange, onDraftCreated, partners }: Props) {
  const t = useTranslations('aiInvoice');
  const router = useRouter();
  const appLocale = useLocale();

  const [step, setStep] = useState<Step>('capture');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<AiInvoicePreview | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [editableLines, setEditableLines] = useState<AiInvoiceLine[]>([]);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<InvoiceKind>('regular');
  const [confirming, setConfirming] = useState(false);

  // Speech recognition
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechLang, setSpeechLang] = useState('');
  const recognitionRef = useRef<any>(null);
  // Accumulates finalized (isFinal=true) segments so interim results don't duplicate them
  const finalizedTextRef = useRef('');

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SR));
    // Priority: browser locale → app locale → et-EE
    setSpeechLang(navigator.language || appLocale || 'et-EE');
  }, [appLocale]);

  useEffect(() => {
    if (!open) {
      setStep('capture');
      setText('');
      setError(null);
      setPreview(null);
      setLoading(false);
      setConfirming(false);
      setKind('regular');
      finalizedTextRef.current = '';
      stopListening();
    }
  }, [open]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      // Null the ref FIRST so onend knows not to auto-restart
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch { /* already stopped */ }
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = speechLang;
    recognition.interimResults = true;
    // continuous=true is unreliable on Android Chrome — we restart manually on onend instead
    recognition.continuous = false;

    finalizedTextRef.current = '';

    recognition.onresult = (event: any) => {
      // Always read only the very last result to avoid re-processing old ones
      const latest = event.results[event.results.length - 1];
      const segment = latest[0].transcript.trim();
      if (!segment) return;

      if (latest.isFinal) {
        // Add a space separator between utterances
        const gap = finalizedTextRef.current.length > 0 ? ' ' : '';
        finalizedTextRef.current += gap + segment;
        setText(finalizedTextRef.current);
      } else {
        // Show interim on top of finalized text
        const gap = finalizedTextRef.current.length > 0 ? ' ' : '';
        setText(finalizedTextRef.current + gap + segment);
      }
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' is normal on mobile — just restart rather than stopping
      if (event.error === 'no-speech') return;
      stopListening();
    };

    recognition.onend = () => {
      // Auto-restart as long as the user hasn't stopped recording
      if (recognitionRef.current) {
        try { recognition.start(); } catch { stopListening(); }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, stopListening]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    stopListening();
    setLoading(true);
    setError(null);

    try {
      const result = await aiInvoiceApi.parse(text.trim());
      setPreview(result);

      // Pre-fill from parse result
      if (result.partner_matches.length > 0) {
        setSelectedPartnerId(result.partner_matches[0].partner_id);
      } else {
        setSelectedPartnerId('');
      }
      setEditableLines(result.parsed.lines.length > 0 ? [...result.parsed.lines] : [{ description: '', quantity: 1, unit_price: 0, tax_rate: 22 }]);
      setInvoiceDate(result.parsed.invoice_date || new Date().toISOString().slice(0, 10));
      setDueDate(result.parsed.due_date || '');
      setCurrency(result.parsed.currency || 'EUR');
      setNotes(result.parsed.notes || '');
      setStep('preview');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index: number, patch: Partial<AiInvoiceLine>) => {
    setEditableLines(current => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    setEditableLines(current => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  };

  const addLine = () => {
    setEditableLines(current => [...current, { description: '', quantity: 1, unit_price: 0, tax_rate: 22 }]);
  };

  const buildParsedPayload = (): ParsedInvoiceDraft => ({
    partner_name: preview?.parsed.partner_name || null,
    partner_registry_code: preview?.parsed.partner_registry_code || null,
    partner_vat_number: preview?.parsed.partner_vat_number || null,
    invoice_date: invoiceDate || null,
    due_date: dueDate || null,
    currency,
    lines: editableLines,
    notes: notes || null,
    confidence: preview?.parsed.confidence || 0,
  });

  const handleOpenInEditor = () => {
    const payload = buildParsedPayload();
    sessionStorage.setItem('ai_invoice_draft', JSON.stringify({
      partner_id: selectedPartnerId,
      invoice_date: payload.invoice_date,
      due_date: payload.due_date,
      currency: payload.currency,
      notes: payload.notes,
      lines: payload.lines,
    }));
    onOpenChange(false);
    router.push('/invoices/new?type=sales_invoice&ai_prefill=1');
  };

  const handleOpenRecurring = () => {
    const payload = buildParsedPayload();
    sessionStorage.setItem('ai_invoice_draft', JSON.stringify({
      partner_id: selectedPartnerId,
      currency: payload.currency,
      notes: payload.notes,
      lines: payload.lines,
    }));
    onOpenChange(false);
    router.push('/recurring-invoices/new?ai_prefill=1');
  };

  const handleSaveDraft = async () => {
    if (!selectedPartnerId) {
      setError(t('partnerSelect'));
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      await aiInvoiceApi.confirm({
        parsed: buildParsedPayload(),
        partner_id: selectedPartnerId,
      });
      showToast.success(t('draftSaved'));
      onOpenChange(false);
      onDraftCreated?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const hasBlockingErrors = (preview?.blocking_errors?.length || 0) > 0;
  const warnings = preview?.warnings || [];

  const warningLabels: Record<string, string> = {
    date_not_stated: t('warningDateNotStated'),
    partner_not_identified: t('warningPartnerNotIdentified'),
    zero_total_amount: t('warningZeroTotal'),
  };

  const subtotal = editableLines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const taxTotal = editableLines.reduce((sum, line) => sum + line.quantity * line.unit_price * (line.tax_rate / 100), 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-[var(--a-surface)] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--a-border)] px-6 py-4">
            <div className="flex items-center gap-2">
              {step === 'preview' && (
                <button
                  onClick={() => setStep('capture')}
                  className="mr-1 rounded p-1 hover:bg-[var(--a-surface-2)]"
                >
                  <ArrowLeft className="h-4 w-4 text-[var(--a-text-2)]" />
                </button>
              )}
              <Sparkles className="h-5 w-5 text-[var(--a-accent)]" />
              <Dialog.Title className="text-base font-semibold text-[var(--a-text)]">
                {step === 'capture' ? t('captureTitle') : t('previewTitle')}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="rounded p-1 hover:bg-[var(--a-surface-2)]">
                <X className="h-4 w-4 text-[var(--a-text-2)]" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] p-3 text-sm text-[var(--a-neg)]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 'capture' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-[var(--a-text-2)]">{t('captureDescription')}</p>
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={t('placeholder')}
                    rows={5}
                    className="w-full resize-none rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] p-3 pr-12 text-sm text-[var(--a-text)] placeholder:text-[var(--a-text-3)] focus:border-[var(--a-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--a-accent)]"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void handleGenerate();
                      }
                    }}
                  />
                  {speechSupported && (
                    <button
                      onClick={toggleListening}
                      className={`absolute bottom-3 right-3 rounded-full p-2 transition-colors ${
                        isListening
                          ? 'bg-[var(--a-neg)] text-white'
                          : 'bg-[var(--a-surface-2)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-3)]'
                      }`}
                      title={isListening ? t('micStop') : t('micStart')}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {speechSupported && (
                  <div className="flex items-center gap-2">
                    <label className="shrink-0 text-xs text-[var(--a-text-3)]">{t('micLanguage')}</label>
                    <select
                      value={speechLang}
                      onChange={e => setSpeechLang(e.target.value)}
                      disabled={isListening}
                      className="rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-2 py-1 text-xs text-[var(--a-text)] disabled:opacity-50"
                    >
                      <option value="et-EE">Eesti (et-EE)</option>
                      <option value="en-US">English US (en-US)</option>
                      <option value="en-GB">English UK (en-GB)</option>
                      <option value="fi-FI">Suomi (fi-FI)</option>
                      <option value="sv-SE">Svenska (sv-SE)</option>
                      <option value="ru-RU">Русский (ru-RU)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {step === 'preview' && preview && (
              <div className="flex flex-col gap-4">
                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    {warnings.map((w) => (
                      <div key={w} className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{warningLabels[w] || w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Blocking errors */}
                {hasBlockingErrors && (
                  <div className="flex flex-col gap-1 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] p-3 text-sm text-[var(--a-neg)]">
                    {preview.blocking_errors.map((e) => (
                      <div key={e} className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Partner select */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--a-text-2)]">{t('partner')}</label>
                  <select
                    value={selectedPartnerId}
                    onChange={e => setSelectedPartnerId(e.target.value)}
                    className="w-full rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-sm text-[var(--a-text)]"
                  >
                    <option value="">{t('partnerSelect')}</option>
                    {/* Show AI matches first */}
                    {preview.partner_matches.length > 0 && (
                      <optgroup label={t('partnerConfidence')}>
                        {preview.partner_matches.map(m => (
                          <option key={`match-${m.partner_id}`} value={m.partner_id}>
                            {m.name} ({m.score}pts)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {/* Then all partners */}
                    <optgroup label="All">
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Kind toggle */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--a-text-2)]">{t('kindLabel')}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setKind('regular')}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        kind === 'regular'
                          ? 'bg-[var(--a-accent)] text-white'
                          : 'bg-[var(--a-surface-2)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-3)]'
                      }`}
                    >
                      {t('kindRegular')}
                    </button>
                    <button
                      onClick={() => setKind('recurring')}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        kind === 'recurring'
                          ? 'bg-[var(--a-accent)] text-white'
                          : 'bg-[var(--a-surface-2)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-3)]'
                      }`}
                    >
                      {t('kindRecurring')}
                    </button>
                  </div>
                </div>

                {/* Dates & currency (regular only) */}
                {kind === 'regular' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--a-text-2)]">{t('invoiceDate')}</label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={e => setInvoiceDate(e.target.value)}
                        className="w-full rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-sm text-[var(--a-text)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--a-text-2)]">{t('dueDate')}</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-sm text-[var(--a-text)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--a-text-2)]">{t('currency')}</label>
                      <input
                        type="text"
                        value={currency}
                        onChange={e => setCurrency(e.target.value.toUpperCase())}
                        maxLength={3}
                        className="w-full rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-sm text-[var(--a-text)]"
                      />
                    </div>
                  </div>
                )}

                {/* Lines table */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--a-text-2)]">{t('lines')}</label>
                  <div className="overflow-x-auto rounded-lg border border-[var(--a-border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--a-border)] bg-[var(--a-surface-2)]">
                          <th className="px-3 py-2 text-left text-xs font-medium text-[var(--a-text-2)]">{t('description')}</th>
                          <th className="w-16 px-2 py-2 text-right text-xs font-medium text-[var(--a-text-2)]">{t('quantity')}</th>
                          <th className="w-24 px-2 py-2 text-right text-xs font-medium text-[var(--a-text-2)]">{t('unitPrice')}</th>
                          <th className="w-16 px-2 py-2 text-right text-xs font-medium text-[var(--a-text-2)]">{t('taxRate')}</th>
                          <th className="w-24 px-2 py-2 text-right text-xs font-medium text-[var(--a-text-2)]">{t('lineTotal')}</th>
                          <th className="w-8 px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {editableLines.map((line, i) => {
                          const lineNet = line.quantity * line.unit_price;
                          return (
                            <tr key={i} className="border-b border-[var(--a-border)] last:border-0">
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={line.description}
                                  onChange={e => updateLine(i, { description: e.target.value })}
                                  className="w-full bg-transparent px-1 py-0.5 text-sm text-[var(--a-text)] focus:outline-none"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input
                                  type="number"
                                  value={line.quantity}
                                  onChange={e => updateLine(i, { quantity: Number(e.target.value) || 0 })}
                                  min={0}
                                  step="any"
                                  className="w-full bg-transparent px-1 py-0.5 text-right text-sm text-[var(--a-text)] focus:outline-none"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input
                                  type="number"
                                  value={line.unit_price}
                                  onChange={e => updateLine(i, { unit_price: Number(e.target.value) || 0 })}
                                  min={0}
                                  step="0.01"
                                  className="w-full bg-transparent px-1 py-0.5 text-right text-sm text-[var(--a-text)] focus:outline-none"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input
                                  type="number"
                                  value={line.tax_rate}
                                  onChange={e => updateLine(i, { tax_rate: Number(e.target.value) || 0 })}
                                  min={0}
                                  max={100}
                                  className="w-full bg-transparent px-1 py-0.5 text-right text-sm text-[var(--a-text)] focus:outline-none"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right text-sm text-[var(--a-text)]">
                                {lineNet.toFixed(2)}
                              </td>
                              <td className="px-1 py-1.5">
                                {editableLines.length > 1 && (
                                  <button onClick={() => removeLine(i)} className="rounded p-0.5 text-[var(--a-text-3)] hover:text-[var(--a-neg)]">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={addLine}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--a-accent)] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    {t('addLine')}
                  </button>
                </div>

                {/* Totals */}
                <div className="flex justify-end gap-6 text-sm">
                  <span className="text-[var(--a-text-2)]">Subtotal: <strong className="text-[var(--a-text)]">{subtotal.toFixed(2)}</strong></span>
                  <span className="text-[var(--a-text-2)]">VAT: <strong className="text-[var(--a-text)]">{taxTotal.toFixed(2)}</strong></span>
                  <span className="text-[var(--a-text-2)]">Total: <strong className="text-[var(--a-text)]">{(subtotal + taxTotal).toFixed(2)}</strong></span>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--a-text-2)]">{t('notes')}</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] p-2 text-sm text-[var(--a-text)] focus:outline-none"
                  />
                </div>

                {/* Confidence indicator */}
                <div className="flex items-center gap-2 text-xs text-[var(--a-text-3)]">
                  <Sparkles className="h-3 w-3" />
                  {t('confidence')}: {Math.round(preview.parsed.confidence * 100)}%
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--a-border)] px-6 py-4">
            {step === 'capture' && (
              <button
                onClick={handleGenerate}
                disabled={!text.trim() || loading}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--a-accent)] px-4 text-sm font-medium text-white hover:bg-[#e74324] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('generateDraft')}
                  </>
                )}
              </button>
            )}

            {step === 'preview' && (
              <>
                {kind === 'regular' ? (
                  <>
                    <button
                      onClick={handleOpenInEditor}
                      disabled={hasBlockingErrors}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-4 text-sm font-medium text-[var(--a-text)] hover:bg-[var(--a-surface-2)] disabled:opacity-50"
                    >
                      {t('openInEditor')}
                    </button>
                    <button
                      onClick={handleSaveDraft}
                      disabled={hasBlockingErrors || confirming || !selectedPartnerId}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--a-accent)] px-4 text-sm font-medium text-white hover:bg-[#e74324] disabled:opacity-50"
                    >
                      {confirming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {t('saveDraft')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleOpenRecurring}
                    disabled={hasBlockingErrors}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--a-accent)] px-4 text-sm font-medium text-white hover:bg-[#e74324] disabled:opacity-50"
                  >
                    {t('openRecurring')}
                  </button>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
