'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Layers3, Loader2, Plus, Receipt, Scale, Trash2, Upload, Wallet } from 'lucide-react';
import { accountingApi, type AccountOption, type OpeningBalanceBatchListItem, type PartnerOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { importApi, type OpeningBalanceImportResult } from '@/lib/api/import.api';

type Mode = 'general' | 'receivables' | 'payables';

type GeneralRow = {
  id: string;
  account_id: string;
  partner_id: string;
  description: string;
  side: 'debit' | 'credit';
  amount: string;
};

type SubledgerRow = {
  id: string;
  partner_id: string;
  partner_name: string;
  reg_code: string;
  invoice_number: string;
  reference: string;
  description: string;
  invoice_date: string;
  due_date: string;
  amount: string;
};

const today = new Date().toISOString().slice(0, 10);

const createGeneralRow = (): GeneralRow => ({
  id: crypto.randomUUID(),
  account_id: '',
  partner_id: '',
  description: '',
  side: 'debit',
  amount: ''
});

const createSubledgerRow = (): SubledgerRow => ({
  id: crypto.randomUUID(),
  partner_id: '',
  partner_name: '',
  reg_code: '',
  invoice_number: '',
  reference: '',
  description: '',
  invoice_date: today,
  due_date: today,
  amount: ''
});

const modeMeta: Record<Mode, { title: string; description: string; icon: typeof Scale }> = {
  general: {
    title: 'General opening balances',
    description: 'Balanced GL opening entry across any accounts. Use this for manual opening trial balance onboarding.',
    icon: Scale
  },
  receivables: {
    title: 'Opening receivables',
    description: 'Create partner-based open sales items plus one opening-balance journal entry.',
    icon: Receipt
  },
  payables: {
    title: 'Opening payables',
    description: 'Create partner-based open purchase items plus one opening-balance journal entry.',
    icon: Wallet
  }
};

export default function OpeningBalancesPage() {
  const [mode, setMode] = useState<Mode>('general');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [batches, setBatches] = useState<OpeningBalanceBatchListItem[]>([]);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCommitLoading, setIsCommitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [commitResult, setCommitResult] = useState<any | null>(null);
  const [importResult, setImportResult] = useState<OpeningBalanceImportResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const previewSnapshotRef = useRef<string | null>(null);

  const [sharedFields, setSharedFields] = useState({
    opening_date: today,
    currency: 'EUR',
    notes: '',
    source_document_id: ''
  });
  const [generalRows, setGeneralRows] = useState<GeneralRow[]>([createGeneralRow(), createGeneralRow()]);
  const [receivableRows, setReceivableRows] = useState<SubledgerRow[]>([createSubledgerRow()]);
  const [payableRows, setPayableRows] = useState<SubledgerRow[]>([createSubledgerRow()]);
  const [receivablesOffsetAccountId, setReceivablesOffsetAccountId] = useState('');
  const [payablesOffsetAccountId, setPayablesOffsetAccountId] = useState('');

  const currentGeneralTotals = useMemo(() => {
    return generalRows.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0);
        if (row.side === 'debit') acc.debit += amount;
        if (row.side === 'credit') acc.credit += amount;
        acc.difference = acc.debit - acc.credit;
        return acc;
      },
      { debit: 0, credit: 0, difference: 0 }
    );
  }, [generalRows]);

  const currentSubledgerTotal = useMemo(() => {
    const rows = mode === 'receivables' ? receivableRows : payableRows;
    return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }, [mode, receivableRows, payableRows]);

  const canCommit = previewSnapshotRef.current === JSON.stringify(buildPayload(mode, sharedFields, {
    generalRows,
    receivableRows,
    payableRows,
    receivablesOffsetAccountId,
    payablesOffsetAccountId
  })) && !!previewResult;

  useEffect(() => {
    const load = async () => {
      setIsBootLoading(true);
      setErrorMessage(null);
      try {
        const [accountItems, partnerItems, batchResult] = await Promise.all([
          accountingApi.getAccounts(),
          accountingApi.getPartners(),
          accountingApi.listOpeningBalances()
        ]);

        setAccounts(accountItems);
        setPartners(partnerItems);
        setBatches(batchResult.items);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsBootLoading(false);
      }
    };

    void load();
  }, []);

  const invalidatePreview = () => {
    setPreviewResult(null);
    setCommitResult(null);
    previewSnapshotRef.current = null;
  };

  const refreshBatches = async () => {
    const batchResult = await accountingApi.listOpeningBalances();
    setBatches(batchResult.items);
  };

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    invalidatePreview();
    setImportResult(null);
    setErrorMessage(null);
  };

  const applyImportedRows = (result: OpeningBalanceImportResult) => {
    setSharedFields((current) => ({
      ...current,
      opening_date: result.suggested_payload.opening_date || current.opening_date,
      currency: result.suggested_payload.currency || current.currency,
      source_document_id: result.document_id
    }));

    if (result.mode === 'general') {
      setGeneralRows(
        result.suggested_payload.lines.map((line) => ({
          id: crypto.randomUUID(),
          account_id: String(line.account_id || ''),
          partner_id: String(line.partner_id || ''),
          description: String(line.description || ''),
          side: line.side === 'credit' ? 'credit' : 'debit',
          amount: String(line.amount || '')
        }))
      );
    } else if (result.mode === 'receivables') {
      setReceivableRows(
        result.suggested_payload.lines.map((line) => ({
          id: crypto.randomUUID(),
          partner_id: String(line.partner_id || ''),
          partner_name: String(line.partner_name || ''),
          reg_code: String(line.reg_code || ''),
          invoice_number: String(line.invoice_number || ''),
          reference: String(line.reference || ''),
          description: String(line.description || ''),
          invoice_date: String(line.invoice_date || sharedFields.opening_date),
          due_date: String(line.due_date || sharedFields.opening_date),
          amount: String(line.amount || '')
        }))
      );
    } else {
      setPayableRows(
        result.suggested_payload.lines.map((line) => ({
          id: crypto.randomUUID(),
          partner_id: String(line.partner_id || ''),
          partner_name: String(line.partner_name || ''),
          reg_code: String(line.reg_code || ''),
          invoice_number: String(line.invoice_number || ''),
          reference: String(line.reference || ''),
          description: String(line.description || ''),
          invoice_date: String(line.invoice_date || sharedFields.opening_date),
          due_date: String(line.due_date || sharedFields.opening_date),
          amount: String(line.amount || '')
        }))
      );
    }

    invalidatePreview();
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImportLoading(true);
    setErrorMessage(null);
    try {
      const result = await importApi.parseOpeningBalancePdf(importFile, {
        mode,
        opening_date: sharedFields.opening_date
      });
      setImportResult(result);
      applyImportedRows(result);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsImportLoading(false);
    }
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    setErrorMessage(null);
    setCommitResult(null);

    try {
      const payload = buildPayload(mode, sharedFields, {
        generalRows,
        receivableRows,
        payableRows,
        receivablesOffsetAccountId,
        payablesOffsetAccountId
      });

      const result =
        mode === 'general'
          ? await accountingApi.previewOpeningBalances(payload)
          : mode === 'receivables'
            ? await accountingApi.previewOpeningReceivables(payload)
            : await accountingApi.previewOpeningPayables(payload);

      setPreviewResult(result);
      previewSnapshotRef.current = JSON.stringify(payload);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPreviewResult(null);
      previewSnapshotRef.current = null;
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCommit = async () => {
    setIsCommitLoading(true);
    setErrorMessage(null);

    try {
      const payload = buildPayload(mode, sharedFields, {
        generalRows,
        receivableRows,
        payableRows,
        receivablesOffsetAccountId,
        payablesOffsetAccountId
      });

      const result =
        mode === 'general'
          ? await accountingApi.commitOpeningBalances(payload)
          : mode === 'receivables'
            ? await accountingApi.commitOpeningReceivables(payload)
            : await accountingApi.commitOpeningPayables(payload);

      setCommitResult(result);
      await refreshBatches();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCommitLoading(false);
    }
  };

  const topCards = [
    { mode: 'general' as const, icon: Scale, title: 'General GL', description: 'Balanced opening journal lines across accounts.' },
    { mode: 'receivables' as const, icon: Receipt, title: 'Receivables', description: 'Creates open sales items for later customer settlement.' },
    { mode: 'payables' as const, icon: Wallet, title: 'Payables', description: 'Creates open purchase items for later supplier payment.' }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-slate-900">Opening Balances</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Onboard opening balances with a mandatory preview step. General mode creates a balanced GL entry, while
          receivables and payables also create operational open items for later workflows.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {topCards.map((card) => {
          const Icon = card.icon;
          const active = mode === card.mode;
          return (
            <button
              key={card.mode}
              onClick={() => handleModeChange(card.mode)}
              className={`card card-hover p-5 text-left transition-all ${active ? 'border-[var(--primary)] shadow-md ring-4 ring-[var(--primary)]/10' : ''}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${active ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.mode}</div>
                </div>
              </div>
              <p className="text-sm text-slate-600">{card.description}</p>
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <section className="space-y-6">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">AI import from balance PDF</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a balance sheet, trial balance, receivables list, or payables list PDF. The backend parses it into the current {mode} editor.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  onClick={handleImport}
                  disabled={!importFile || isImportLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isImportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>{isImportLoading ? 'Parsing…' : 'Parse PDF'}</span>
                </button>
              </div>
              {importResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">{importResult.file_name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Model {importResult.model} · document {importResult.document_id}
                  </div>
                  {importResult.warnings && importResult.warnings.length > 0 && (
                    <div className="mt-3 text-xs text-amber-700">
                      Warnings: {importResult.warnings.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = modeMeta[mode].icon;
                  return <Icon className="h-5 w-5 text-[var(--primary)]" />;
                })()}
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{modeMeta[mode].title}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{modeMeta[mode].description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Opening date</span>
                  <input
                    type="date"
                    value={sharedFields.opening_date}
                    onChange={(event) => {
                      setSharedFields((current) => ({ ...current, opening_date: event.target.value }));
                      invalidatePreview();
                    }}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Currency</span>
                  <input
                    type="text"
                    value={sharedFields.currency}
                    onChange={(event) => {
                      setSharedFields((current) => ({ ...current, currency: event.target.value.toUpperCase() }));
                      invalidatePreview();
                    }}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3"
                  />
                </label>

                {(mode === 'receivables' || mode === 'payables') && (
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Offset account</span>
                    <select
                      value={mode === 'receivables' ? receivablesOffsetAccountId : payablesOffsetAccountId}
                      onChange={(event) => {
                        if (mode === 'receivables') setReceivablesOffsetAccountId(event.target.value);
                        if (mode === 'payables') setPayablesOffsetAccountId(event.target.value);
                        invalidatePreview();
                      }}
                      className="h-11 w-full rounded-lg border border-slate-200 px-3"
                    >
                      <option value="">Select offset account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className={`space-y-2 ${mode === 'general' ? 'md:col-span-2 xl:col-span-2' : 'md:col-span-2 xl:col-span-4'}`}>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</span>
                  <input
                    type="text"
                    value={sharedFields.notes}
                    onChange={(event) => {
                      setSharedFields((current) => ({ ...current, notes: event.target.value }));
                      invalidatePreview();
                    }}
                    placeholder="Optional onboarding note"
                    className="h-11 w-full rounded-lg border border-slate-200 px-3"
                  />
                </label>

                <label className={`${mode === 'general' ? 'md:col-span-2 xl:col-span-2' : 'md:col-span-2 xl:col-span-4'} space-y-2`}>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Source document id</span>
                  <input
                    type="text"
                    value={sharedFields.source_document_id}
                    onChange={(event) => {
                      setSharedFields((current) => ({ ...current, source_document_id: event.target.value }));
                      invalidatePreview();
                    }}
                    placeholder="Optional files.documents id"
                    className="h-11 w-full rounded-lg border border-slate-200 px-3"
                  />
                </label>
              </div>

              {mode === 'general' ? (
                <GeneralEditor
                  rows={generalRows}
                  accounts={accounts}
                  partners={partners}
                  totals={currentGeneralTotals}
                  onAddRow={() => {
                    setGeneralRows((current) => [...current, createGeneralRow()]);
                    invalidatePreview();
                  }}
                  onChange={(nextRows) => {
                    setGeneralRows(nextRows);
                    invalidatePreview();
                  }}
                />
              ) : (
                <SubledgerEditor
                  mode={mode}
                  rows={mode === 'receivables' ? receivableRows : payableRows}
                  partners={partners}
                  total={currentSubledgerTotal}
                  onAddRow={() => {
                    if (mode === 'receivables') setReceivableRows((current) => [...current, createSubledgerRow()]);
                    if (mode === 'payables') setPayableRows((current) => [...current, createSubledgerRow()]);
                    invalidatePreview();
                  }}
                  onChange={(nextRows) => {
                    if (mode === 'receivables') setReceivableRows(nextRows);
                    if (mode === 'payables') setPayableRows(nextRows);
                    invalidatePreview();
                  }}
                />
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Preview is required before commit. Any edit after preview invalidates the snapshot.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handlePreview}
                    disabled={isPreviewLoading || isCommitLoading || isBootLoading}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers3 className="h-4 w-4" />}
                    <span>Preview</span>
                  </button>
                  <button
                    onClick={handleCommit}
                    disabled={!canCommit || isCommitLoading || isPreviewLoading}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCommitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    <span>Commit opening balances</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <PreviewPanel mode={mode} previewResult={previewResult} commitResult={commitResult} />
        </section>

        <aside className="space-y-6">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Recent batches</h2>
              <p className="mt-1 text-sm text-slate-500">Previously committed onboarding batches and their journal links.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {isBootLoading ? (
                <div className="p-5 text-sm text-slate-500">Loading batches…</div>
              ) : batches.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">No opening-balance batches yet.</div>
              ) : (
                batches.slice(0, 10).map((batch) => (
                  <div key={batch.id} className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {batch.batch_type || 'general'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        batch.status === 'committed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {batch.status}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{batch.opening_date}</div>
                    <div className="mt-1 text-xs text-slate-500">Currency {batch.currency}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {batch.journal_entry_number
                        ? `Journal ${batch.journal_entry_number}`
                        : batch.journal_entry_id
                          ? `Journal ${batch.journal_entry_id.slice(0, 8)}`
                          : 'No journal linked yet'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-slate-900">Implementation note</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              General mode creates one balanced opening journal. Receivables and payables also create operational
              invoices so later payment matching and payment batch workflows can continue without manual reconstruction.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function GeneralEditor({
  rows,
  accounts,
  partners,
  totals,
  onAddRow,
  onChange
}: {
  rows: GeneralRow[];
  accounts: AccountOption[];
  partners: PartnerOption[];
  totals: { debit: number; credit: number; difference: number };
  onAddRow: () => void;
  onChange: (rows: GeneralRow[]) => void;
}) {
  const updateRow = (id: string, key: keyof GeneralRow, value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const removeRow = (id: string) => onChange(rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">General ledger rows</h3>
          <p className="mt-1 text-sm text-slate-500">Choose account, optional partner, side and amount for each opening line.</p>
        </div>
        <button onClick={onAddRow} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">
          <Plus className="h-4 w-4" />
          <span>Add row</span>
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Account</label>
              <select value={row.account_id} onChange={(e) => updateRow(row.id, 'account_id', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3">
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Partner</label>
              <select value={row.partner_id} onChange={(e) => updateRow(row.id, 'partner_id', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3">
                <option value="">Optional</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
              <input value={row.description} onChange={(e) => updateRow(row.id, 'description', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Side</label>
              <select value={row.side} onChange={(e) => updateRow(row.id, 'side', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3">
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Amount</label>
              <input value={row.amount} onChange={(e) => updateRow(row.id, 'amount', e.target.value)} inputMode="decimal" className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </div>
            <div className="md:col-span-1 flex items-end justify-end">
              <button onClick={() => removeRow(row.id)} disabled={rows.length <= 1} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="md:col-span-12 text-xs text-slate-400">Row {index + 1}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
        <Metric label="Debit total" value={totals.debit} />
        <Metric label="Credit total" value={totals.credit} />
        <Metric label="Difference" value={totals.difference} emphasize={Math.abs(totals.difference) <= 0.009 ? 'success' : 'danger'} />
      </div>
    </div>
  );
}

function SubledgerEditor({
  mode,
  rows,
  partners,
  total,
  onAddRow,
  onChange
}: {
  mode: 'receivables' | 'payables';
  rows: SubledgerRow[];
  partners: PartnerOption[];
  total: number;
  onAddRow: () => void;
  onChange: (rows: SubledgerRow[]) => void;
}) {
  const updateRow = (id: string, key: keyof SubledgerRow, value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const removeRow = (id: string) => onChange(rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {mode === 'receivables' ? 'Receivable open items' : 'Payable open items'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Each row becomes one {mode === 'receivables' ? 'sales invoice' : 'purchase invoice'} after commit.
          </p>
        </div>
        <button onClick={onAddRow} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">
          <Plus className="h-4 w-4" />
          <span>Add row</span>
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Partner</label>
              <select value={row.partner_id} onChange={(e) => updateRow(row.id, 'partner_id', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3">
                <option value="">Match existing or create on commit</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Partner name</label>
              <input
                value={row.partner_name}
                onChange={(e) => updateRow(row.id, 'partner_name', e.target.value)}
                placeholder="Needed if partner does not exist yet"
                className="h-10 w-full rounded-lg border border-slate-200 px-3"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Registry code</label>
              <input
                value={row.reg_code}
                onChange={(e) => updateRow(row.id, 'reg_code', e.target.value)}
                placeholder="Optional"
                className="h-10 w-full rounded-lg border border-slate-200 px-3"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Invoice no</label>
              <input value={row.invoice_number} onChange={(e) => updateRow(row.id, 'invoice_number', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Reference</label>
              <input value={row.reference} onChange={(e) => updateRow(row.id, 'reference', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </div>
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
              <input value={row.description} onChange={(e) => updateRow(row.id, 'description', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Amount</label>
              <input value={row.amount} onChange={(e) => updateRow(row.id, 'amount', e.target.value)} inputMode="decimal" className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </div>
            <div className="md:col-span-1 flex items-end justify-end">
              <button onClick={() => removeRow(row.id)} disabled={rows.length <= 1} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Invoice date</label>
              <input type="date" value={row.invoice_date} onChange={(e) => updateRow(row.id, 'invoice_date', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Due date</label>
              <input type="date" value={row.due_date} onChange={(e) => updateRow(row.id, 'due_date', e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </div>
            <div className="md:col-span-6 flex items-end text-xs text-slate-400">Row {index + 1}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <Metric label="Open item total" value={total} emphasize="neutral" />
      </div>
    </div>
  );
}

function PreviewPanel({
  mode,
  previewResult,
  commitResult
}: {
  mode: Mode;
  previewResult: any | null;
  commitResult: any | null;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Preview & result</h2>
        <p className="mt-1 text-sm text-slate-500">Backend-normalized payload, resolved accounts, and commit outcome.</p>
      </div>

      <div className="space-y-5 p-5">
        {!previewResult ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Run preview to see normalized journal rows, totals, and AR/AP helper results before commit.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {previewResult.totals && (
                <>
                  {'debit_total' in previewResult.totals && <Metric label="Debit total" value={Number(previewResult.totals.debit_total || 0)} />}
                  {'credit_total' in previewResult.totals && <Metric label="Credit total" value={Number(previewResult.totals.credit_total || 0)} />}
                  {'line_total' in previewResult.totals && <Metric label="Line total" value={Number(previewResult.totals.line_total || 0)} />}
                </>
              )}
            </div>

            {(previewResult.control_account || previewResult.offset_account) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {previewResult.control_account && (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Control account</div>
                    <div className="font-medium text-slate-900">{previewResult.control_account.code} · {previewResult.control_account.name}</div>
                  </div>
                )}
                {previewResult.offset_account && (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Offset account</div>
                    <div className="font-medium text-slate-900">{previewResult.offset_account.code} · {previewResult.offset_account.name}</div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {mode === 'general' ? 'Normalized lines' : 'Open item preview'}
              </div>
              <div className="divide-y divide-slate-100">
                {(previewResult.lines || []).slice(0, 8).map((line: any, index: number) => (
                  <div key={`${index}-${line.account_id || line.partner_id || line.invoice_number}`} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                    <div className="text-slate-900">
                      {line.partner_name || line.description || line.invoice_number || 'Line'}
                    </div>
                    <div className="text-slate-500">{line.invoice_number || line.account_id || line.reference || '-'}</div>
                    <div className="font-mono text-slate-700">
                      {'debit' in line || 'credit' in line
                        ? `D ${Number(line.debit || 0).toFixed(2)} / C ${Number(line.credit || 0).toFixed(2)}`
                        : Number(line.amount || 0).toFixed(2)}
                    </div>
                    <div className="text-slate-500">{line.due_date || line.invoice_date || ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {commitResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-emerald-900">Commit completed</div>
                <div className="text-emerald-800">
                  Batch {commitResult.batch?.id?.slice(0, 8)} linked to journal {commitResult.journal_entry?.entry_number || commitResult.journal_entry?.id?.slice(0, 8)}.
                </div>
                {typeof commitResult.created_invoice_count === 'number' && (
                  <div className="text-emerald-800">
                    Created invoices: {commitResult.created_invoice_count}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasize = 'neutral'
}: {
  label: string;
  value: number;
  emphasize?: 'neutral' | 'success' | 'danger';
}) {
  const color =
    emphasize === 'success'
      ? 'text-emerald-700'
      : emphasize === 'danger'
        ? 'text-red-700'
        : 'text-slate-900';

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 font-mono text-xl font-semibold ${color}`}>{value.toFixed(2)}</div>
    </div>
  );
}

function buildPayload(
  mode: Mode,
  sharedFields: {
    opening_date: string;
    currency: string;
    notes: string;
    source_document_id: string;
  },
  state: {
    generalRows: GeneralRow[];
    receivableRows: SubledgerRow[];
    payableRows: SubledgerRow[];
    receivablesOffsetAccountId: string;
    payablesOffsetAccountId: string;
  }
) {
  const base = {
    opening_date: sharedFields.opening_date,
    currency: sharedFields.currency,
    notes: sharedFields.notes || undefined,
    source_document_id: sharedFields.source_document_id || undefined
  };

  if (mode === 'general') {
    return {
      ...base,
      lines: state.generalRows.map((row) => ({
        account_id: row.account_id || undefined,
        partner_id: row.partner_id || undefined,
        description: row.description || undefined,
        side: row.side,
        amount: Number(row.amount || 0)
      }))
    };
  }

  const rows = (mode === 'receivables' ? state.receivableRows : state.payableRows).map((row) => ({
    partner_id: row.partner_id || undefined,
    partner_name: row.partner_name || undefined,
    reg_code: row.reg_code || undefined,
    invoice_number: row.invoice_number || undefined,
    reference: row.reference || undefined,
    description: row.description || undefined,
    invoice_date: row.invoice_date || undefined,
    due_date: row.due_date || undefined,
    amount: Number(row.amount || 0)
  }));

  return {
    ...base,
    offset_account_id: mode === 'receivables' ? state.receivablesOffsetAccountId || undefined : state.payablesOffsetAccountId || undefined,
    lines: rows
  };
}
