'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Upload, RefreshCw, Plus, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { annualReportApi, type AnnualReportSubmission } from '@/lib/api/annualReport.api';
import { accountingApi, type FiscalYearWithPeriods } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('annualReport');
  const config: Record<string, { bg: string; text: string; Icon: typeof CheckCircle2 }> = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', Icon: Clock },
    generating: { bg: 'bg-blue-100', text: 'text-blue-700', Icon: Loader2 },
    generated: { bg: 'bg-indigo-100', text: 'text-indigo-700', Icon: FileText },
    submitting: { bg: 'bg-blue-100', text: 'text-blue-700', Icon: Loader2 },
    submitted: { bg: 'bg-amber-100', text: 'text-amber-700', Icon: Upload },
    accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', Icon: CheckCircle2 },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', Icon: XCircle },
    error: { bg: 'bg-red-100', text: 'text-red-700', Icon: XCircle },
  };
  const c = config[status] || config.draft;
  const Icon = c.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'generating' || status === 'submitting' ? 'animate-spin' : ''}`} />
      {t(`status_${status}`)}
    </span>
  );
}

export default function AnnualReportPage() {
  const t = useTranslations('annualReport');
  const tc = useTranslations('common');

  const [submissions, setSubmissions] = useState<AnnualReportSubmission[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYearWithPeriods[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, years] = await Promise.all([
        annualReportApi.listSubmissions(),
        accountingApi.listFiscalYears(),
      ]);
      setSubmissions(subs);
      setFiscalYears(years);
      if (years.length > 0 && !selectedFiscalYear) {
        setSelectedFiscalYear(years[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectedFiscalYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!selectedFiscalYear) return;
    setActionLoading('create');
    try {
      await annualReportApi.createSubmission(selectedFiscalYear);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerate = async (id: string) => {
    setActionLoading(id);
    try {
      await annualReportApi.generateXbrl(id);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await annualReportApi.downloadXbrl(id);
      downloadBlob(blob, `annual_report_${id}.xbrl`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSubmit = async (id: string) => {
    setActionLoading(id);
    try {
      await annualReportApi.submitToRik(id);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckStatus = async (id: string) => {
    setActionLoading(id);
    try {
      await annualReportApi.checkStatus(id);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <PageSkeleton hasStats={false} tableRows={4} tableColumns={5} />;
  }

  if (error && submissions.length === 0) {
    return (
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('title')}
          </h1>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('title')}
        </h1>
        <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          {t('description')}
        </p>
      </div>

      {error && (
        <div className="card mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create new submission */}
      <div className="card mb-6 p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {t('newSubmission')}
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('fiscalYear')}
            </label>
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.date_start} — {fy.date_end} {fy.is_closed ? `(${tc('closed')})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={!selectedFiscalYear || actionLoading === 'create'}
            className="px-4 py-2 text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {actionLoading === 'create' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            <span>{t('createSubmission')}</span>
          </button>
        </div>
      </div>

      {/* Submissions list */}
      {submissions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('noSubmissions')}
          message={t('noSubmissionsMessage')}
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub.id} className="card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={sub.status} />
                    {sub.fiscal_year && (
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {sub.fiscal_year.date_start} — {sub.fiscal_year.date_end}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {tc('created')}: {new Date(sub.created_at).toLocaleDateString()}
                    {sub.submitted_at && ` | ${t('submitted')}: ${new Date(sub.submitted_at).toLocaleDateString()}`}
                  </p>
                  {sub.error_message && (
                    <p className="text-xs text-red-600 mt-1">{sub.error_message}</p>
                  )}
                  {sub.rik_document_id && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      RIK ID: {sub.rik_document_id}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {(sub.status === 'draft' || sub.status === 'error') && (
                    <button
                      onClick={() => handleGenerate(sub.id)}
                      disabled={actionLoading === sub.id}
                      className="px-3 py-1.5 text-sm text-white rounded-lg flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      {actionLoading === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      {t('generateXbrl')}
                    </button>
                  )}

                  {(sub.status === 'generated' || sub.status === 'submitted' || sub.status === 'accepted') && (
                    <button
                      onClick={() => handleDownload(sub.id)}
                      className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 hover:opacity-80"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      <Download className="h-4 w-4" />
                      {t('downloadXbrl')}
                    </button>
                  )}

                  {sub.status === 'generated' && (
                    <button
                      onClick={() => handleSubmit(sub.id)}
                      disabled={actionLoading === sub.id}
                      className="px-3 py-1.5 text-sm text-white rounded-lg flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--success, #16a34a)' }}
                    >
                      {actionLoading === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {t('submitToRik')}
                    </button>
                  )}

                  {(sub.status === 'submitted') && (
                    <button
                      onClick={() => handleCheckStatus(sub.id)}
                      disabled={actionLoading === sub.id}
                      className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 hover:opacity-80"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      {actionLoading === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {t('checkStatus')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
