'use client';

import { useEffect, useState, type ComponentType, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  RefreshCw,
  Sparkles,
  UserCheck,
  FileText,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { importApi, type PurchaseInvoiceImportDetail, type PurchaseInvoiceImportListItem } from '@/lib/api/import.api';
import { accountingApi, type PartnerOption } from '@/lib/api/accounting.api';

type EditableLine = {
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  line_total: string;
  account_id?: string | null;
};

const emptyLine = (): EditableLine => ({
  description: '',
  quantity: '1',
  unit_price: '',
  tax_rate: '0',
  line_total: '',
  account_id: '',
});

export default function PurchaseInvoiceImportsPage() {
  const t = useTranslations('invoices');
  const [imports, setImports] = useState<PurchaseInvoiceImportListItem[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurchaseInvoiceImportDetail | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const [isResolvingSupplier, setIsResolvingSupplier] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualPartnerId, setManualPartnerId] = useState('');
  const [confirmDuplicateWarning, setConfirmDuplicateWarning] = useState(false);
  const [draftResult, setDraftResult] = useState<any | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Record<string, any> | null>(null);
  const [lineDrafts, setLineDrafts] = useState<EditableLine[]>([emptyLine()]);

  useEffect(() => {
    const load = async () => {
      setIsListLoading(true);
      setErrorMessage(null);
      try {
        const [importResult, partnerResult] = await Promise.all([
          importApi.listPurchaseInvoiceImports({ limit: 30 }),
          accountingApi.getPartners(),
        ]);
        setImports(importResult.items);
        setPartners(partnerResult);
        if (importResult.items[0]?.id) {
          setSelectedId(importResult.items[0].id);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsListLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setErrorMessage(null);
      try {
        const result = await importApi.getPurchaseInvoiceImport(selectedId);
        setDetail(result);
        setPreviewDraft(result.import.preview_data || {});
        setLineDrafts(normalizeLines(result.import.preview_data?.lines));
        setManualPartnerId(String(result.import.supplier_resolution?.selected_partner_id || ''));
        setConfirmDuplicateWarning(false);
        setDraftResult(null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    };

    void loadDetail();
  }, [selectedId]);

  const refreshList = async (preferredId?: string) => {
    const result = await importApi.listPurchaseInvoiceImports({ limit: 30 });
    setImports(result.items);
    if (preferredId) {
      setSelectedId(preferredId);
      return;
    }
    if (!result.items.find((item) => item.id === selectedId)) {
      setSelectedId(result.items[0]?.id || null);
    }
  };

  const refreshDetail = async (id: string) => {
    const result = await importApi.getPurchaseInvoiceImport(id);
    setDetail(result);
    setPreviewDraft(result.import.preview_data || {});
    setLineDrafts(normalizeLines(result.import.preview_data?.lines));
    setManualPartnerId(String(result.import.supplier_resolution?.selected_partner_id || ''));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await importApi.uploadPurchaseInvoicePdf(selectedFile);
      await refreshList(result.import.id);
      await refreshDetail(result.import.id);
      setSelectedFile(null);
      setSuccessMessage(t('importedForReview', { file: result.import.file_name || selectedFile.name }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePreview = async () => {
    if (!detail || !previewDraft) return;

    setIsSavingPreview(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextPreview = {
        ...previewDraft,
        lines: lineDrafts.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity || 0),
          unit_price: Number(line.unit_price || 0),
          tax_rate: Number(line.tax_rate || 0),
          line_total: Number(line.line_total || 0),
          account_id: line.account_id || null,
        })),
      };
      const result = await importApi.updatePurchaseInvoicePreview(detail.import.id, nextPreview);
      setDetail((current) => current ? { ...current, import: result.import } : current);
      setPreviewDraft(result.import.preview_data || nextPreview);
      setSuccessMessage(t('previewSaved'));
      await refreshList(detail.import.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingPreview(false);
    }
  };

  const handleResolveCandidate = async (candidateId: string) => {
    if (!detail) return;

    setIsResolvingSupplier(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await importApi.resolveSupplier(detail.import.id, { candidate_id: candidateId });
      setDetail(result);
      setManualPartnerId(String(result.import.supplier_resolution?.selected_partner_id || ''));
      setSuccessMessage(t('supplierResolvedFromCandidate'));
      await refreshList(detail.import.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsResolvingSupplier(false);
    }
  };

  const handleResolveManualSupplier = async () => {
    if (!detail || !manualPartnerId) return;

    setIsResolvingSupplier(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await importApi.resolveSupplier(detail.import.id, { selected_partner_id: manualPartnerId });
      setDetail(result);
      setSuccessMessage(t('supplierResolvedManually'));
      await refreshList(detail.import.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsResolvingSupplier(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!detail || !previewDraft) return;

    setIsCreatingDraft(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await importApi.createDraftInvoice(detail.import.id, {
        selected_partner_id: manualPartnerId || undefined,
        confirm_duplicate_warning: confirmDuplicateWarning,
        preview_data: previewDraft,
        lines: lineDrafts.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity || 0),
          unit_price: Number(line.unit_price || 0),
          tax_rate: Number(line.tax_rate || 0),
          line_total: Number(line.line_total || 0),
          account_id: line.account_id || undefined,
        })),
      });
      setDraftResult(result);
      setSuccessMessage(t('draftPurchaseInvoiceCreated'));
      await refreshList(detail.import.id);
      await refreshDetail(detail.import.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const selectedWarnings = normalizeStringArray(detail?.import.warning_flags);
  const duplicateWarning = Boolean(detail?.import.duplicate_check?.is_likely_duplicate);
  const selectedPartnerName = partnerNameById(partners, manualPartnerId || detail?.import.supplier_resolution?.selected_partner_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('purchaseImports')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {t('purchaseImportsDescription')} {t('purchaseImportsNoPosting')}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{t('uploadPdf')}</div>
                <div className="text-xs text-slate-500">{t('uploadPdfHint')}</div>
              </div>
            </div>

            <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              <span className="mb-2 block font-medium text-slate-700">{t('chooseFile')}</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500"
              />
            </label>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{isUploading ? t('uploading') : t('uploadAndParse')}</span>
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{t('importQueue')}</h2>
                <p className="text-xs text-slate-500">{t('recentPurchaseInvoiceImports')}</p>
              </div>
              <button
                onClick={() => {
                  void refreshList();
                  if (selectedId) void refreshDetail(selectedId);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {isListLoading ? (
                <div className="p-4 text-sm text-slate-500">{t('loadingImports')}</div>
              ) : imports.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">{t('noPurchaseInvoiceImportsYet')}</div>
              ) : (
                imports.map((item) => {
                  const isActive = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`block w-full px-4 py-3 text-left transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">{item.file_name || t('importedPdf')}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusBadge(item.status)}`}>
                          {formatLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span>{item.source_type}</span>
                        {typeof item.confidence_score === 'number' && <span>· {t('confidencePercent', { value: item.confidence_score })}</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
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

          {isDetailLoading ? (
            <div className="card p-8 text-sm text-slate-500">{t('loadingImportDetail')}</div>
          ) : !detail || !previewDraft ? (
            <div className="card p-8 text-sm text-slate-500">{t('selectImportToReview')}</div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{detail.import.file_name || t('purchaseInvoiceImport')}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {t('status')} {formatLabel(detail.import.status)}. {t('reviewHeaderLinesSupplierDuplicate')}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{detail.import.source_type}</div>
                      <div className="mt-1">{formatDateTime(detail.import.created_at)}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 p-5">
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    <Field label={t('supplierName')} value={String(previewDraft.supplier_name || '')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), supplier_name: value }))} />
                    <Field label={t('registryCode')} value={String(previewDraft.registry_code || '')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), registry_code: value }))} />
                    <Field label={t('vatNumber')} value={String(previewDraft.vat_number || '')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), vat_number: value }))} />
                    <Field label={t('iban')} value={String(previewDraft.iban || '')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), iban: value }))} />
                    <Field label={t('invoiceNumber')} value={String(previewDraft.invoice_number || '')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), invoice_number: value }))} />
                    <Field label={t('invoiceDate')} type="date" value={String(previewDraft.invoice_date || '')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), invoice_date: value }))} />
                    <Field label={t('dueDate')} type="date" value={String(previewDraft.due_date || '')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), due_date: value }))} />
                    <Field label={t('currency')} value={String(previewDraft.currency || 'EUR')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), currency: value.toUpperCase() }))} />
                    <Field label={t('subtotal')} value={stringNumber(previewDraft.subtotal)} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), subtotal: Number(value || 0) }))} />
                    <Field label={t('taxTotal')} value={stringNumber(previewDraft.vat_total)} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), vat_total: Number(value || 0) }))} />
                    <Field label={t('total')} value={stringNumber(previewDraft.total)} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), total: Number(value || 0) }))} />
                    <Field label={t('reference')} value={String(previewDraft.reference || '')} onChange={(value) => setPreviewDraft((current) => ({ ...(current || {}), reference: value }))} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
                    <div className="rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{t('previewLines')}</h3>
                          <p className="text-xs text-slate-500">{t('criticalTotalsValidated')}</p>
                        </div>
                        <button
                          onClick={() => setLineDrafts((current) => [...current, emptyLine()])}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {t('addLine')}
                        </button>
                      </div>
                      <div className="space-y-3 p-4">
                        {lineDrafts.map((line, index) => (
                          <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-12">
                            <div className="lg:col-span-4">
                              <SmallField label={t('description')} value={line.description} onChange={(value) => updateLine(setLineDrafts, index, 'description', value)} />
                            </div>
                            <div className="lg:col-span-2">
                              <SmallField label={t('qty')} value={line.quantity} onChange={(value) => updateLine(setLineDrafts, index, 'quantity', value)} />
                            </div>
                            <div className="lg:col-span-2">
                              <SmallField label={t('unitPrice')} value={line.unit_price} onChange={(value) => updateLine(setLineDrafts, index, 'unit_price', value)} />
                            </div>
                            <div className="lg:col-span-2">
                              <SmallField label={t('vatRate')} value={line.tax_rate} onChange={(value) => updateLine(setLineDrafts, index, 'tax_rate', value)} />
                            </div>
                            <div className="lg:col-span-2">
                              <SmallField label={t('lineTotal')} value={line.line_total} onChange={(value) => updateLine(setLineDrafts, index, 'line_total', value)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <InfoCard
                        icon={Sparkles}
                        title={t('parsingConfidence')}
                        body={typeof detail.import.confidence_score === 'number' ? t('confidenceScoreFromBackend', { value: detail.import.confidence_score }) : t('noConfidenceScore')}
                      />
                      <InfoCard
                        icon={AlertCircle}
                        title={t('warnings')}
                        body={selectedWarnings.length > 0 ? selectedWarnings.map(formatLabel).join(', ') : t('noAdvisoryWarnings')}
                        tone={selectedWarnings.length > 0 ? 'warning' : 'neutral'}
                      />
                      <InfoCard
                        icon={FileText}
                        title={t('duplicateCheck')}
                        body={
                          duplicateWarning
                            ? t('likelyDuplicateDetected', { score: String(detail.import.duplicate_check?.max_score || 'n/a') })
                            : t('noDuplicateWarning')
                        }
                        tone={duplicateWarning ? 'danger' : 'neutral'}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSavePreview}
                      disabled={isSavingPreview}
                      className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      <span>{t('saveReviewEdits')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="card overflow-hidden">
                  <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">{t('supplierResolution')}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t('supplierResolutionDescription')}</p>
                  </div>
                  <div className="space-y-4 p-5">
                    {detail.supplier_match_candidates.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        {t('noSupplierCandidates')}
                      </div>
                    ) : (
                      detail.supplier_match_candidates.map((candidate) => (
                        <div key={candidate.id} className={`rounded-xl border p-4 ${candidate.is_selected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {candidate.candidate_payload?.matched_partner_name || candidate.candidate_payload?.name || t('supplierCandidate')}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {t('scoreValue', { score: String(candidate.match_score) })} · {normalizeStringArray(candidate.match_reasons).map(formatLabel).join(', ') || t('noMatchReasons')}
                              </div>
                            </div>
                            <button
                              onClick={() => handleResolveCandidate(candidate.id)}
                              disabled={candidate.is_selected || isResolvingSupplier}
                              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <UserCheck className="h-4 w-4" />
                              <span>{candidate.is_selected ? t('selected') : t('accept')}</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-900">{t('manualSupplierSelection')}</div>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <select
                          value={manualPartnerId}
                          onChange={(event) => setManualPartnerId(event.target.value)}
                          className="h-11 rounded-lg border border-slate-200 px-3"
                        >
                          <option value="">{t('selectSupplierPartner')}</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleResolveManualSupplier}
                          disabled={!manualPartnerId || isResolvingSupplier}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isResolvingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                          <span>{t('resolveSupplier')}</span>
                        </button>
                      </div>
                      {selectedPartnerName && (
                        <div className="mt-3 text-sm text-slate-600">
                          {t('currentResolvedSupplier')} <span className="font-medium text-slate-900">{selectedPartnerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card overflow-hidden">
                  <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">{t('createDraftInvoice')}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t('draftCreationBlocked')}</p>
                  </div>
                  <div className="space-y-4 p-5">
                    {duplicateWarning && (
                      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <input
                          type="checkbox"
                          checked={confirmDuplicateWarning}
                          onChange={(event) => setConfirmDuplicateWarning(event.target.checked)}
                          className="mt-0.5"
                        />
                        <span>{t('confirmDuplicateWarning')}</span>
                      </label>
                    )}

                    <button
                      onClick={handleCreateDraft}
                      disabled={isCreatingDraft || !selectedPartnerName}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCreatingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      <span>{t('createDraftPurchaseInvoice')}</span>
                    </button>

                    {draftResult?.draft_invoice?.invoice && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <div className="font-semibold text-emerald-900">{t('draftCreated')}</div>
                        <div className="mt-2">
                          {t('draftCreatedLinked', { invoiceId: draftResult.draft_invoice.invoice.id.slice(0, 8), importId: detail.import.id.slice(0, 8) })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function normalizeLines(lines: any): EditableLine[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [emptyLine()];
  }

  return lines.map((line) => ({
    description: String(line.description || ''),
    quantity: stringNumber(line.quantity ?? 1),
    unit_price: stringNumber(line.unit_price ?? 0),
    tax_rate: stringNumber(line.tax_rate ?? 0),
    line_total: stringNumber(line.line_total ?? 0),
    account_id: line.account_id || '',
  }));
}

function updateLine(
  setLineDrafts: Dispatch<SetStateAction<EditableLine[]>>,
  index: number,
  key: keyof EditableLine,
  value: string
) {
  setLineDrafts((current) => current.map((line, currentIndex) => currentIndex === index ? { ...line, [key]: value } : line));
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 px-3"
      />
    </label>
  );
}

function SmallField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 px-3"
      />
    </label>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
  tone = 'neutral',
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : tone === 'danger'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-sm leading-6">{body}</div>
        </div>
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  if (status === 'draft_created') return 'bg-emerald-50 text-emerald-700';
  if (status === 'supplier_resolved') return 'bg-blue-50 text-blue-700';
  if (status === 'preview_ready') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function stringNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function partnerNameById(partners: PartnerOption[], partnerId?: string | null) {
  if (!partnerId) return '';
  return partners.find((partner) => partner.id === partnerId)?.name || '';
}
