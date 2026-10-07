// Client mirror of the backend SYSTEM_ROLE_DEFS (src/types/database.types.ts).
// Used by the Settings system-roles panel and the import role-mapping dialog.

export type SystemRoleSettingKey =
  | 'bank_account_default_id'
  | 'accounts_receivable_account_id'
  | 'accounts_payable_account_id'
  | 'vat_output_account_id'
  | 'vat_input_account_id'
  | 'sales_revenue_account_id'
  | 'purchase_expense_account_id';

export type SystemRole = {
  system_code: string;
  setting_key: SystemRoleSettingKey;
  label: string;
  defaultCode: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  // Lower-cased substrings used to auto-suggest a match by account name on import.
  nameHints: string[];
};

export const SYSTEM_ROLES: SystemRole[] = [
  { system_code: 'BANK', setting_key: 'bank_account_default_id', label: 'Bank', defaultCode: '1000', type: 'asset', nameHints: ['bank', 'pank', 'arvelduskonto'] },
  { system_code: 'AR', setting_key: 'accounts_receivable_account_id', label: 'Accounts Receivable', defaultCode: '1200', type: 'asset', nameHints: ['receivable', 'nõuded', 'ostjate', 'müügivõlad'] },
  { system_code: 'AP', setting_key: 'accounts_payable_account_id', label: 'Accounts Payable', defaultCode: '2200', type: 'liability', nameHints: ['payable', 'võlad tarnijatele', 'hankijate', 'tarnija'] },
  { system_code: 'VAT_OUTPUT', setting_key: 'vat_output_account_id', label: 'Output VAT', defaultCode: '2710', type: 'liability', nameHints: ['output vat', 'käibemaks', 'müügi km', 'tasumisele kuuluv'] },
  { system_code: 'VAT_INPUT', setting_key: 'vat_input_account_id', label: 'Input VAT', defaultCode: '2711', type: 'asset', nameHints: ['input vat', 'sisendkäibemaks', 'ostu km'] },
  { system_code: 'SALES', setting_key: 'sales_revenue_account_id', label: 'Sales Revenue', defaultCode: '3000', type: 'revenue', nameHints: ['sales', 'müügitulu', 'müük'] },
  { system_code: 'PURCHASE', setting_key: 'purchase_expense_account_id', label: 'Purchase Expense', defaultCode: '4000', type: 'expense', nameHints: ['purchase', 'ostukulu', 'kaubad', 'materjal'] },
];

type RoleAccount = { id: string; code: string; name: string; type: string; system_code?: string | null };

/** Hints a role can veto: "Sisendkäibemaks" contains "käibemaks" but is not output VAT. */
const ROLE_EXCLUDE_HINTS: Partial<Record<SystemRoleSettingKey, string[]>> = {
  vat_output_account_id: ['sisend', 'input'],
  vat_input_account_id: ['müügi', 'output'],
};

/**
 * After an import: which roles should move off their system account. Only when
 * the import left the role's current system account unused AND put a balance on
 * one of the company's own accounts that matches the role (e.g. the old chart
 * kept receivables on 1210 "Nõuded ostjate vastu"). With the standard chart the
 * system accounts ARE the right ones (1200, 2200, …), so nothing is suggested.
 */
export function suggestRoleRemaps(
  settings: Partial<Record<SystemRoleSettingKey, string | null>>,
  accounts: RoleAccount[],
  usedAccountIds: Set<string>
): Partial<Record<SystemRoleSettingKey, string>> {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const out: Partial<Record<SystemRoleSettingKey, string>> = {};
  for (const role of SYSTEM_ROLES) {
    const currentId = settings[role.setting_key] || '';
    const current = currentId ? byId.get(currentId) : undefined;
    if (current && !current.system_code) continue; // already bound to the company's own account
    if (currentId && usedAccountIds.has(currentId)) continue; // the import posted to it — it is the right one
    const excluded = ROLE_EXCLUDE_HINTS[role.setting_key] || [];
    const candidate = accounts.find((a) => {
      if (a.system_code || a.type !== role.type || !usedAccountIds.has(a.id)) return false;
      const name = a.name.toLowerCase();
      return !excluded.some((bad) => name.includes(bad)) && role.nameHints.some((hint) => name.includes(hint));
    });
    if (candidate) out[role.setting_key] = candidate.id;
  }
  return out;
}
