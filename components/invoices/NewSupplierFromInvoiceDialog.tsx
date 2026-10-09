'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { importApi, type SupplierSuggestion } from '@/lib/api/import.api';

/**
 * The invoice's supplier is not in Arvelo (and, for a foreign supplier, not in the Estonian
 * registry either): a supplier card prefilled from the registry or from the invoice itself. The
 * user checks it, Arvelo creates the supplier (with every IBAN printed on the invoice) and, unless
 * the import still needs review (e.g. a likely duplicate), the draft invoice.
 */

type Props = {
  importId: string | null;
  suggestion: SupplierSuggestion | null;
  fileName?: string | null;
  onOpenChange: (open: boolean) => void;
  /** Also create the draft invoice (default). The import review page creates it with its own button. */
  createDraft?: boolean;
  /** Called after the supplier exists: with the draft id, or with the reason the draft was not created. */
  onDone: (result: { draftInvoiceId: string | null; draftError: string | null; importId: string }) => void;
};

type Form = { name: string; reg_code: string; vat_number: string; country_code: string; address: string; postal_code: string; city: string; ibans: string };

const toForm = (s: SupplierSuggestion | null): Form => ({
  name: s?.name || '',
  reg_code: s?.reg_code || '',
  vat_number: s?.vat_number || '',
  country_code: s?.country_code || 'EE',
  address: s?.address || '',
  postal_code: s?.postal_code || '',
  city: s?.city || '',
  ibans: (s?.ibans || []).join('\n'),
});

export function NewSupplierFromInvoiceDialog({ importId, suggestion, fileName, onOpenChange, onDone, createDraft = true }: Props) {
  const open = !!importId;
  const [form, setForm] = useState<Form>(toForm(suggestion));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(suggestion));
    setError(null);
  }, [open, suggestion]);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const estonianCodeInvalid = form.country_code.trim().toUpperCase() === 'EE' && !!form.reg_code.trim() && !/^\d{8}$/.test(form.reg_code.trim());

  const submit = async () => {
    if (!importId || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await importApi.resolveSupplier(importId, {
        create_new_supplier: {
          name: form.name.trim(),
          reg_code: form.reg_code.trim() || undefined,
          vat_number: form.vat_number.trim() || undefined,
          country_code: form.country_code.trim().toUpperCase() || 'EE',
          address: form.address.trim() || undefined,
          postal_code: form.postal_code.trim() || undefined,
          city: form.city.trim() || undefined,
          ibans: form.ibans.split(/[\n,;]+/).map((i) => i.replace(/\s+/g, '').toUpperCase()).filter(Boolean),
        },
        create_draft: createDraft,
      });
      onDone({ draftInvoiceId: result.draft_invoice_id || null, draftError: result.draft_error || null, importId });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const input = 'h-8 w-full rounded-md border px-2 text-sm bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30';
  const label = 'mb-1 block text-xs font-medium text-[var(--text-secondary)]';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--surface)] p-5 shadow-xl">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-[var(--text-primary)]">Uus tarnija arve andmetest</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {suggestion?.source === 'business_registry'
                  ? 'Tarnija leiti äriregistrist, aga Arvelos teda veel pole. Kontrolli andmed ja kinnita.'
                  : `Tarnijat ei leitud Arvelost ega Eesti äriregistrist${fileName ? ` (${fileName})` : ''}. Andmed on loetud arvelt — kontrolli ja kinnita.`}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--a-bg)]" aria-label="Sulge"><X size={16} /></Dialog.Close>
          </div>

          <div className="space-y-3 text-sm">
            <label className="block"><span className={label}>Nimi *</span><input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} /></label>
            <div className="grid grid-cols-[1fr_1fr_5rem] gap-2">
              <label className="block"><span className={label}>Registrikood</span><input className={input} value={form.reg_code} onChange={(e) => set({ reg_code: e.target.value })} /></label>
              <label className="block"><span className={label}>KMKR nr</span><input className={input} value={form.vat_number} onChange={(e) => set({ vat_number: e.target.value })} /></label>
              <label className="block"><span className={label}>Riik</span><input className={`${input} uppercase`} maxLength={2} value={form.country_code} onChange={(e) => set({ country_code: e.target.value.toUpperCase() })} /></label>
            </div>
            {estonianCodeInvalid && <div className="text-xs text-[var(--danger)]">Eesti registrikood on 8-kohaline — välismaise tarnija puhul muuda riik (nt FI, LV).</div>}
            <label className="block"><span className={label}>Aadress</span><input className={input} value={form.address} onChange={(e) => set({ address: e.target.value })} /></label>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <label className="block"><span className={label}>Postiindeks</span><input className={input} value={form.postal_code} onChange={(e) => set({ postal_code: e.target.value })} /></label>
              <label className="block"><span className={label}>Linn</span><input className={input} value={form.city} onChange={(e) => set({ city: e.target.value })} /></label>
            </div>
            <label className="block">
              <span className={label}>Pangakontod (IBAN, üks rea kohta — esimene on vaikimisi)</span>
              <textarea className={`${input} h-auto min-h-[4.5rem] py-1.5 font-mono`} rows={Math.min(5, Math.max(2, form.ibans.split('\n').length))} value={form.ibans} onChange={(e) => set({ ibans: e.target.value })} />
            </label>
            {error && <div className="rounded-md bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">{error}</div>}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close className="h-8 rounded-md border border-[var(--border)] px-3 text-sm text-[var(--text-secondary)]">Loobu</Dialog.Close>
            <button type="button" disabled={saving || !form.name.trim() || estonianCodeInvalid} onClick={() => void submit()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-white disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}{createDraft ? 'Lisa tarnija ja loo arve' : 'Lisa tarnija'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
