'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { importApi, type AccountImportRow } from '@/lib/api/import.api';
import { getErrorMessage } from '@/lib/api/client';

export default function AccountImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [parsedAccounts, setParsedAccounts] = useState<AccountImportRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const newAccounts = parsedAccounts.filter(a => a.status === 'new');
  const existingAccounts = parsedAccounts.filter(a => a.status === 'existing');
  const conflictAccounts = parsedAccounts.filter(a => a.status === 'conflict');
  const invalidAccounts = parsedAccounts.filter(a => a.status === 'invalid');

  const handleParse = async () => {
    if (!file) return;
    setIsParsing(true);
    setErrorMessage(null);
    setCommitResult(null);
    setParsedAccounts([]);
    try {
      const result = await importApi.parseAccountImport(file);
      setParsedAccounts(result.parsed_accounts);
      setWarnings(result.warnings);
      const newCodes = new Set(result.parsed_accounts.filter(a => a.status === 'new').map(a => a.code));
      setSelected(newCodes);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommit = async () => {
    const accountsToCreate = parsedAccounts
      .filter(a => a.status === 'new' && selected.has(a.code))
      .map(a => ({ code: a.code, name: a.name, type: a.type }));

    if (accountsToCreate.length === 0) return;

    setIsCommitting(true);
    setErrorMessage(null);
    try {
      const result = await importApi.commitAccountImport(accountsToCreate);
      setCommitResult(result);
      if (result.created > 0) {
        setParsedAccounts(prev => prev.map(a =>
          a.status === 'new' && selected.has(a.code) && !result.errors.some(e => e.includes(a.code))
            ? { ...a, status: 'existing' as const, warnings: [] }
            : a
        ));
        setSelected(new Set());
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsCommitting(false);
    }
  };

  const toggleSelect = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === newAccounts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(newAccounts.map(a => a.code)));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">New</span>;
      case 'existing': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Exists</span>;
      case 'conflict': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Conflict</span>;
      case 'invalid': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700">Invalid</span>;
      default: return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'bg-blue-50 text-blue-700',
      liability: 'bg-amber-50 text-amber-700',
      equity: 'bg-violet-50 text-violet-700',
      revenue: 'bg-emerald-50 text-emerald-700',
      expense: 'bg-rose-50 text-rose-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[type] || 'bg-slate-50 text-slate-700'}`}>
        {type}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/accounting/accounts" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Chart of Accounts
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Import Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">Upload a PDF or Excel file containing your chart of accounts</p>
      </div>

      {/* Upload Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <FileSpreadsheet className="h-5 w-5 text-slate-400 mt-0.5" />
          <div>
            <h2 className="font-medium text-slate-900">Upload chart of accounts</h2>
            <p className="text-sm text-slate-500">Supports PDF, XLSX, XLS, and CSV files. For Excel/CSV, use columns: Code, Name, Type.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex-1">
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setParsedAccounts([]);
                setCommitResult(null);
                setErrorMessage(null);
              }}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-200 file:text-sm file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50 file:cursor-pointer"
            />
          </label>
          <button
            onClick={handleParse}
            disabled={!file || isParsing}
            className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isParsing ? 'Parsing...' : 'Parse File'}
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-6 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{errorMessage}</p>
        </div>
      )}

      {/* Commit Result */}
      {commitResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6 flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-700">
            <p className="font-medium">Import complete</p>
            <p>{commitResult.created} accounts created, {commitResult.skipped} skipped</p>
            {commitResult.errors.length > 0 && (
              <ul className="mt-1 list-disc list-inside text-rose-600">
                {commitResult.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
          <p className="text-sm font-medium text-amber-700 mb-1">Warnings</p>
          <ul className="text-sm text-amber-600 list-disc list-inside">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Results */}
      {parsedAccounts.length > 0 && (
        <>
          {/* Summary */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
              <span className="text-slate-500">Total:</span> <span className="font-medium">{parsedAccounts.length}</span>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
              <span className="text-emerald-600">New:</span> <span className="font-medium text-emerald-700">{newAccounts.length}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
              <span className="text-slate-500">Existing:</span> <span className="font-medium">{existingAccounts.length}</span>
            </div>
            {conflictAccounts.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
                <span className="text-amber-600">Conflicts:</span> <span className="font-medium text-amber-700">{conflictAccounts.length}</span>
              </div>
            )}
            {invalidAccounts.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm">
                <span className="text-rose-600">Invalid:</span> <span className="font-medium text-rose-700">{invalidAccounts.length}</span>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={newAccounts.length > 0 && selected.size === newAccounts.length}
                        onChange={toggleAll}
                        className="rounded border-slate-300"
                        disabled={newAccounts.length === 0}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedAccounts.map((account, idx) => (
                    <tr
                      key={`${account.code}-${idx}`}
                      className={account.status === 'new' && selected.has(account.code) ? 'bg-emerald-50/30' : ''}
                    >
                      <td className="px-4 py-3">
                        {account.status === 'new' ? (
                          <input
                            type="checkbox"
                            checked={selected.has(account.code)}
                            onChange={() => toggleSelect(account.code)}
                            className="rounded border-slate-300"
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{account.code}</td>
                      <td className="px-4 py-3 text-slate-900">{account.name}</td>
                      <td className="px-4 py-3">{getTypeBadge(account.type)}</td>
                      <td className="px-4 py-3">{getStatusBadge(account.status)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{account.warnings.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Button */}
          {newAccounts.length > 0 && !commitResult && (
            <div className="flex justify-end">
              <button
                onClick={handleCommit}
                disabled={selected.size === 0 || isCommitting}
                className="h-10 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isCommitting ? 'Importing...' : `Import ${selected.size} Account${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
