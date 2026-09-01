'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { SYSTEM_ROLES } from '@/lib/constants/systemRoles';
import type { AccountOption, AccountingSettings, SystemRoleMapping } from '@/lib/api/accounting.api';

type SystemRolesPanelProps = {
  accounts: AccountOption[];
  settings: AccountingSettings | null;
  saving?: boolean;
  creatingDefaults?: boolean;
  onSave: (mapping: SystemRoleMapping) => Promise<void> | void;
  onCreateDefaults: () => Promise<void> | void;
  /** Translates a role's system_code. Falls back to the English constant. */
  roleLabel?: (systemCode: string) => string;
  labels: {
    title: string;
    description: string;
    save: string;
    saving: string;
    createDefaults: string;
    creating: string;
    selectAccount: string;
    emptyHint: string;
  };
};

function mappingFromSettings(settings: AccountingSettings | null): SystemRoleMapping {
  const mapping: SystemRoleMapping = {};
  for (const role of SYSTEM_ROLES) {
    const id = settings?.[role.setting_key] || undefined;
    if (id) mapping[role.setting_key] = id;
  }
  return mapping;
}

export function SystemRolesPanel({
  accounts,
  settings,
  saving = false,
  creatingDefaults = false,
  onSave,
  onCreateDefaults,
  roleLabel,
  labels,
}: SystemRolesPanelProps) {
  const [draft, setDraft] = useState<{
    source: AccountingSettings | null;
    mapping: SystemRoleMapping;
  }>(() => ({ source: settings, mapping: mappingFromSettings(settings) }));
  const mapping = draft.source === settings ? draft.mapping : mappingFromSettings(settings);

  const hasAccounts = accounts.length > 0;
  const allRolesUnset = SYSTEM_ROLES.every((role) => !settings?.[role.setting_key]);
  const showCreateDefaults = !hasAccounts || allRolesUnset;

  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900">{labels.title}</h3>
      <p className="mt-1 text-sm text-slate-500">{labels.description}</p>

      {showCreateDefaults && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-600">{labels.emptyHint}</span>
          <button
            type="button"
            onClick={() => void onCreateDefaults()}
            disabled={creatingDefaults}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {creatingDefaults ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>{creatingDefaults ? labels.creating : labels.createDefaults}</span>
          </button>
        </div>
      )}

      {hasAccounts && (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SYSTEM_ROLES.map((role) => (
              <label key={role.system_code} className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  {roleLabel ? roleLabel(role.system_code) : role.label}
                </span>
                <select
                  value={mapping[role.setting_key] || ''}
                  onChange={(event) =>
                    setDraft({
                      source: settings,
                      mapping: { ...mapping, [role.setting_key]: event.target.value || undefined },
                    })
                  }
                  className="h-11 w-full rounded-lg border border-slate-200 px-3"
                >
                  <option value="">{labels.selectAccount}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} · {account.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void onSave(mapping)}
            disabled={saving}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{saving ? labels.saving : labels.save}</span>
          </button>
        </>
      )}
    </div>
  );
}
