'use client';

import { useEffect, useState } from 'react';
import { adminApi, TenantMeta } from '@/lib/api/admin.api';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const load = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listTenants({ search: searchTerm || undefined });
      setTenants(result.tenants);
      setTotal(result.total);
    } catch {
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const handleSuspend = async (id: string, currentState: string | null) => {
    const newStatus = currentState === 'locked' ? 'active' : 'suspended';
    const label = newStatus === 'suspended' ? 'Suspend' : 'Reactivate';
    if (!confirm(`${label} this tenant?`)) return;

    setActionInProgress(id);
    try {
      await adminApi.setTenantStatus(id, newStatus);
      await load(search || undefined);
    } catch {
      alert(`Failed to ${label.toLowerCase()} tenant`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete tenant "${name}"? This cannot be undone.`)) return;

    setActionInProgress(id);
    try {
      await adminApi.deleteTenant(id);
      await load(search || undefined);
    } catch {
      alert('Failed to delete tenant');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tenants</h1>
        <span className="text-sm text-slate-500">{total} total</span>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-lg bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Registry code</th>
                  <th className="px-4 py-3 text-left">Members</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-slate-500">{t.registry_code ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{t.member_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.entitlement_state === 'locked'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {t.entitlement_state === 'locked' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSuspend(t.id, t.entitlement_state)}
                        disabled={actionInProgress === t.id}
                        className="mr-2 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50"
                      >
                        {t.entitlement_state === 'locked' ? 'Reactivate' : 'Suspend'}
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        disabled={actionInProgress === t.id}
                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No tenants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            {tenants.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">
                      {t.registry_code ?? '—'} · {t.member_count} members
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.entitlement_state === 'locked'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {t.entitlement_state === 'locked' ? 'Suspended' : 'Active'}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSuspend(t.id, t.entitlement_state)}
                    disabled={actionInProgress === t.id}
                    className="min-h-[44px] flex-1 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 disabled:opacity-50"
                  >
                    {t.entitlement_state === 'locked' ? 'Reactivate' : 'Suspend'}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    disabled={actionInProgress === t.id}
                    className="min-h-[44px] flex-1 rounded-lg border border-red-200 text-sm font-medium text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {tenants.length === 0 && (
              <p className="py-8 text-center text-slate-400">No tenants found</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
