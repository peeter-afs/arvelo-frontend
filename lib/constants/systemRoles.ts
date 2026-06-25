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
