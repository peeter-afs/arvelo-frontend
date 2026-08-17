import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type BankImportJob = {
  id: string;
  status: string;
  source_type?: 'csv' | 'camt53';
  bank_account_id?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  parsed_data?: Record<string, any> | null;
  original_data?: Record<string, any> | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export type BankImportPreviewRow = {
  row_no: number;
  tx_date: string | null;
  value_date: string | null;
  amount: number;
  currency: string;
  counterparty_name: string | null;
  counterparty_account: string | null;
  description: string | null;
  reference: string | null;
  external_id: string;
  warning_flags: string[];
  needs_review: boolean;
  is_approved: boolean;
  manually_approved?: boolean;
  can_approve?: boolean;
  parsed_payload: Record<string, any>;
};

export type BankMatchCandidate = {
  invoice_id: string;
  invoice_number?: string;
  type: string;
  status: string;
  invoice_date: string;
  due_date?: string | null;
  total: number;
  open_amount: number;
  currency: string;
  partner_id?: string | null;
  partner_name?: string | null;
  partner_reg_code?: string | null;
  partner_vat_number?: string | null;
  partner_is_registry_linked?: boolean;
  match_reasons: string[];
  score: number;
};

export type BankReviewQueueItem = {
  transaction_id: string;
  bank_account_id: string;
  bank_account_name?: string | null;
  bank_account_iban?: string | null;
  import_job_id?: string | null;
  import_row_id?: string | null;
  import_file_name?: string | null;
  import_row_no?: number | null;
  import_warning_flags?: string[];
  import_parsed_payload?: Record<string, any> | null;
  tx_date: string;
  value_date?: string | null;
  amount: number;
  currency: string;
  counterparty_name?: string | null;
  counterparty_account?: string | null;
  description?: string | null;
  reference?: string | null;
  matched_status: string;
  review_state?: string | null;
  review_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  suggested_manual_account_id?: string | null;
  suggested_manual_account_code?: string | null;
  suggested_manual_account_name?: string | null;
  is_reconciled: boolean;
  auto_match_ready: boolean;
  top_candidates: BankMatchCandidate[];
  has_missing_receipt_placeholder: boolean;
  placeholder_invoice_id: string | null;
};

export type PaymentBatchListItem = {
  id: string;
  bank_account_id: string;
  bank_account_name?: string | null;
  bank_account_iban?: string | null;
  status: string;
  batch_name?: string | null;
  execution_date?: string | null;
  currency: string;
  created_by_email?: string | null;
  line_count?: number;
  total_amount?: number | string;
  confirmed_count?: number;
  generated_count?: number;
  uploaded_count?: number;
  failed_count?: number;
  exported_file_name?: string | null;
  exported_file_format?: string | null;
  exported_file_content?: string | null;
  submitted_via?: string | null;
  submission_request_id?: string | null;
  submitted_at?: string | null;
  bank_status?: string | null;
  bank_status_reason?: string | null;
  bank_status_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentBatchLine = {
  id: string;
  batch_id: string;
  invoice_id: string | null;
  counterpart_account_id?: string | null;
  line_no: number;
  payee_name: string;
  payee_iban: string;
  payee_bic?: string | null;
  reference?: string | null;
  description?: string | null;
  amount: number | string;
  currency: string;
  due_date?: string | null;
  status: string;
  payment_id?: string | null;
  invoice_number?: string | null;
  invoice_status?: string | null;
  partner_name?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
};

export type BankReconciliationItem = {
  transaction_id: string;
  bank_account_id: string;
  bank_account_name?: string | null;
  bank_account_iban?: string | null;
  tx_date: string;
  value_date?: string | null;
  amount: number;
  currency: string;
  counterparty_name?: string | null;
  description?: string | null;
  reference?: string | null;
  matched_status: string;
  is_reconciled: boolean;
};

export type BankReconciliationSummary = {
  reconciled_count: number;
  unreconciled_count: number;
  reconciled_amount: number;
  unreconciled_amount: number;
  net_amount: number;
  opening_balance: number | null;   // statement opening balance for the filtered account/period
  closing_balance: number | null;   // statement closing balance (falls back to opening + net)
};

export type BankAccountRecord = {
  id: string;
  account_id?: string | null;
  name: string;
  bank_name?: string | null;
  iban?: string | null;
  bic?: string | null;
  currency: string;
  is_active: boolean;
  ledger_account_code?: string | null;
  ledger_account_name?: string | null;
  created_at: string;
  updated_at: string;
};

export const bankingApi = {
  async listBankAccounts() {
    const response = await apiClient.get<ApiResponse<BankAccountRecord[]>>('/api/banking/bank-accounts');
    return response.data.data;
  },

  async createBankAccount(payload: {
    name: string;
    bank_name?: string;
    iban?: string;
    bic?: string;
    currency?: string;
    account_id?: string | null;
    is_active?: boolean;
  }) {
    const response = await apiClient.post<ApiResponse<BankAccountRecord>>('/api/banking/bank-accounts', payload);
    return response.data.data;
  },

  async updateBankAccount(id: string, payload: {
    name?: string;
    bank_name?: string | null;
    iban?: string | null;
    bic?: string | null;
    currency?: string;
    account_id?: string | null;
    is_active?: boolean;
  }) {
    const response = await apiClient.put<ApiResponse<BankAccountRecord>>(`/api/banking/bank-accounts/${id}`, payload);
    return response.data.data;
  },

  async createImportJob(payload: {
    file_name: string;
    file_size: number;
    file_content: string;
    source_type: 'csv' | 'camt53';
    bank_account_id?: string;
  }) {
    const response = await apiClient.post<ApiResponse<{ job: BankImportJob }>>('/api/banking/import-jobs', payload);
    return response.data.data;
  },

  async parseImportJob(id: string) {
    const response = await apiClient.post<ApiResponse<{
      job: BankImportJob;
      preview_rows: BankImportPreviewRow[];
      summary: Record<string, any>;
    }>>(`/api/banking/import-jobs/${id}/parse`);
    return response.data.data;
  },

  async setImportRowApproval(id: string, updates: Array<{ row_no: number; is_approved: boolean }>) {
    const response = await apiClient.post<ApiResponse<{
      job: BankImportJob;
      preview_rows: BankImportPreviewRow[];
      summary: Record<string, any>;
    }>>(`/api/banking/import-jobs/${id}/rows/approval`, { updates });
    return response.data.data;
  },

  async commitImportJob(id: string) {
    const response = await apiClient.post<ApiResponse<{
      job: BankImportJob;
      summary: Record<string, any>;
    }>>(`/api/banking/import-jobs/${id}/commit`);
    return response.data.data;
  },

  async getReviewQueue(params?: {
    limit?: number;
    offset?: number;
    auto_matchable_only?: boolean;
    review_state?: 'pending' | 'reviewed';
  }) {
    const response = await apiClient.get<ApiResponse<{
      items: BankReviewQueueItem[];
      total: number;
    }>>('/api/banking/transactions/review-queue', { params });
    return response.data.data;
  },

  async getReconciliation(params?: {
    bank_account_id?: string;
    reconciled?: boolean;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get<ApiResponse<{
      items: BankReconciliationItem[];
      total: number;
      summary: BankReconciliationSummary;
    }>>('/api/banking/transactions/reconciliation', { params });
    return response.data.data;
  },

  async reconcileTransactions(payload: { transaction_ids: string[]; is_reconciled: boolean }) {
    const response = await apiClient.post<ApiResponse<{
      updated_count: number;
      is_reconciled: boolean;
    }>>('/api/banking/transactions/reconcile', payload);
    return response.data.data;
  },

  async suggestMatches(id: string) {
    const response = await apiClient.get<ApiResponse<{
      transaction_id: string;
      candidates: BankMatchCandidate[];
    }>>(`/api/banking/transactions/${id}/suggest-matches`);
    return response.data.data;
  },

  async autoMatch(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${id}/auto-match`);
    return response.data.data;
  },

  async reviewTransaction(id: string, payload: { review_state?: 'pending' | 'reviewed'; note?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${id}/review`, payload);
    return response.data.data;
  },

  async ignoreTransaction(id: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${id}/ignore`, payload || {});
    return response.data.data;
  },

  async matchInvoice(id: string, payload: { invoice_id: string; reference?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${id}/match-invoice`, payload);
    return response.data.data;
  },

  async matchInvoices(id: string, payload: { allocations: Array<{ invoice_id: string; amount?: number }>; reference?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${id}/match-invoices`, payload);
    return response.data.data;
  },

  async manualPost(id: string, payload: { counter_account_id: string; description?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${id}/manual-post`, payload);
    return response.data.data;
  },

  async unmatch(id: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${id}/unmatch`, payload || {});
    return response.data.data;
  },

  async listPaymentBatches(params?: { status?: string; limit?: number; offset?: number }) {
    const response = await apiClient.get<ApiResponse<{
      items: PaymentBatchListItem[];
      total: number;
      limit: number;
      offset: number;
    }>>('/api/banking/payment-batches', { params });
    return response.data.data;
  },

  async getPaymentBatch(id: string) {
    const response = await apiClient.get<ApiResponse<{
      batch: PaymentBatchListItem;
      lines: PaymentBatchLine[];
      summary: Record<string, any>;
    }>>(`/api/banking/payment-batches/${id}`);
    return response.data.data;
  },

  async getPaymentBatchPrefillLines(payload: { invoice_ids: string[]; currency?: string }) {
    const response = await apiClient.post<ApiResponse<{
      lines: Array<Record<string, any>>;
      missing_supplier_bank_account_invoice_ids: string[];
    }>>('/api/banking/payment-batches/helpers/prefill-lines', payload);
    return response.data.data;
  },

  async createPaymentBatch(payload: {
    bank_account_id: string;
    batch_name?: string;
    execution_date?: string;
    currency?: string;
    lines: Array<{
      invoice_id?: string | null;
      amount?: number;
      payee_name?: string;
      payee_iban?: string;
      payee_bic?: string;
      reference?: string;
      description?: string;
      counterpart_account_id?: string | null;
    }>;
  }) {
    const response = await apiClient.post<ApiResponse<any>>('/api/banking/payment-batches', payload);
    return response.data.data;
  },

  async submitPaymentBatchToBank(id: string) {
    const response = await apiClient.post<ApiResponse<{ batch: PaymentBatchListItem; provider: string; request_id: string }>>(
      `/api/banking/payment-batches/${id}/submit-to-bank`
    );
    return response.data.data;
  },

  async generatePaymentBatch(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/payment-batches/${id}/generate`);
    return response.data.data;
  },

  async generatePaymentBatchPain001(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/payment-batches/${id}/generate-pain001`);
    return response.data.data;
  },

  async confirmPaymentBatchUploaded(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/payment-batches/${id}/confirm-uploaded`);
    return response.data.data;
  },

  async confirmPaymentBatchExecuted(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/payment-batches/${id}/confirm-executed`);
    return response.data.data;
  },

  async voidPaymentBatch(id: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/payment-batches/${id}/void`, payload || {});
    return response.data.data;
  },

  async markMissingReceipt(transactionId: string, payload?: { partner_id?: string; description?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${transactionId}/mark-missing-receipt`, payload || {});
    return response.data.data;
  },

  async dismissMissingReceipt(transactionId: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/banking/transactions/${transactionId}/dismiss-missing-receipt`, payload || {});
    return response.data.data;
  },

  async getMissingReceiptSettings() {
    const response = await apiClient.get<ApiResponse<any>>('/api/banking/missing-receipt-settings');
    return response.data.data;
  },

  async updateMissingReceiptSettings(data: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<any>>('/api/banking/missing-receipt-settings', data);
    return response.data.data;
  },

  async listDraftableOutgoing(importJobId: string) {
    const response = await apiClient.get<ApiResponse<{ items: DraftableOutgoingItem[] }>>(
      `/api/banking/import-jobs/${importJobId}/draftable-outgoing`
    );
    return response.data.data;
  },

  async bulkMarkMissingReceipt(transactionIds: string[]) {
    const response = await apiClient.post<ApiResponse<{
      created: Array<{ transaction_id: string; invoice_id: string }>;
      skipped: number;
      errors: Array<{ transaction_id: string; error: string }>;
    }>>('/api/banking/transactions/bulk-mark-missing-receipt', { transaction_ids: transactionIds });
    return response.data.data;
  },

  async bulkAutoMatch(transactionIds: string[]) {
    const response = await apiClient.post<ApiResponse<{
      auto_matched: Array<{ transaction_id: string; invoice_id: string }>;
      skipped: number;
      errors: Array<{ transaction_id: string; error: string }>;
    }>>('/api/banking/transactions/bulk-auto-match', { transaction_ids: transactionIds });
    return response.data.data;
  },

  async getDraftExclusionRules() {
    const response = await apiClient.get<ApiResponse<{ rules: DraftExclusionRule[] }>>('/api/banking/draft-exclusion-rules');
    return response.data.data.rules;
  },

  async saveDraftExclusionRules(rules: DraftExclusionRule[]) {
    const response = await apiClient.put<ApiResponse<{ rules: DraftExclusionRule[] }>>('/api/banking/draft-exclusion-rules', { rules });
    return response.data.data.rules;
  },
};

export type DraftableOutgoingItem = {
  transaction_id: string;
  tx_date: string;
  amount: number;
  currency: string;
  counterparty_name?: string | null;
  counterparty_account?: string | null;
  description?: string | null;
  reference?: string | null;
  excluded: boolean;
  excluded_by?: string | null;
};

export type DraftExclusionRule = {
  id: string;
  label: string;
  enabled: boolean;
  field: 'counterparty_name' | 'counterparty_account' | 'reference' | 'description';
  match: 'contains' | 'exact' | 'starts_with' | 'regex';
  value: string;
};
