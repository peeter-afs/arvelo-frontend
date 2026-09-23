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
  parsed_data?: Record<string, unknown> | null;
  original_data?: Record<string, unknown> | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export type BankImportHistoryItem = {
  id: string;
  bank_account_id: string | null;
  status: string;
  source_type: string | null;
  file_name: string | null;
  statement_date_from: string | null;
  statement_date_to: string | null;
  parsed_row_count: number;
  imported_count: number;
  skipped_duplicate_count: number;
  created_at: string;
  completed_at: string | null;
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
  is_duplicate?: boolean;
  is_approved: boolean;
  manually_approved?: boolean;
  can_approve?: boolean;
  parsed_payload: BankParsedPayload;
};

/**
 * Card/POS rows carry no counterparty in the statement, so the backend recovers
 * the merchant from the free-text descriptor and records that here — the import
 * preview and the review panel use it to flag a derived name as derived.
 */
export type BankCardDescriptorPayload = {
  counterparty_source?: 'card_descriptor';
  card_descriptor?: {
    merchant: string;
    city: string | null;
    card_mask: string | null;
    descriptor_date: string | null;
    currency_conversion: { amount: number; currency: string } | null;
    confidence: 'high' | 'medium';
    matched_pattern: string;
    raw: string | null;
  };
};

export type BankParsedPayload = Record<string, unknown> & BankCardDescriptorPayload;

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

export type BankAutoMatchSummary = {
  invoice_id: string;
  invoice_number: string;
  partner_name: string;
  open_amount_before: number;
  open_amount_after: number;
  score: number;
};

export type BankAutoMatchPlanInvoice = BankAutoMatchSummary & {
  due_date: string;
  settles_invoice: boolean;
};

export type BankAutoMatchPlan = {
  // More than one entry means a single payment settles them all.
  invoices: BankAutoMatchPlanInvoice[];
  invoice: BankAutoMatchPlanInvoice;
  score: number;
  match_reasons: string[];
  journal_preview?: {
    entry_date: string;
    lines: Array<{ account_code: string; account_name: string; amount: number }>;
  };
};

export type BankAutoMatchReason = 'no_document_candidate' | 'amount_requires_split' | 'ambiguous_candidates' | 'low_confidence';

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
  import_parsed_payload?: BankParsedPayload | null;
  tx_date: string;
  value_date?: string | null;
  amount: number;
  currency: string;
  counterparty_name?: string | null;
  counterparty_account?: string | null;
  /** Partner the card-import enrichment already resolved, if any. */
  counterparty_partner_id?: string | null;
  counterparty_partner_name?: string | null;
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
  auto_match_summary?: BankAutoMatchSummary;
  // >1 when the payment settles several invoices at once.
  auto_match_invoice_count?: number;
  // Counter accounts used before for this counterparty, most recent first.
  suggested_accounts?: Array<{ account_id: string; code: string; name: string; reason?: string }>;
  /**
   * Ready-made split rows: from an imported Merit Palk payroll batch when this is
   * the tax board's payment (amounts included), otherwise the accounts of the last
   * split for this counterparty (amounts omitted — last month's figure is not this one's).
   */
  suggested_split?: Array<{ account_id: string; code: string; name: string; amount?: number; source?: string }>;
  top_candidates: BankMatchCandidate[];
  has_missing_receipt_placeholder: boolean;
  placeholder_invoice_id: string | null;
  /** "active" while the receipt is still awaited, "promoted" once the draft was confirmed. */
  placeholder_state?: string | null;
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

export type BankImportSummary = {
  source_type?: string;
  bank_account_id?: string | null;
  parsed_row_count?: number;
  approved_row_count?: number;
  review_row_count?: number;
  detected_statement_iban?: string | null;
  statement_date_from?: string | null;
  statement_date_to?: string | null;
  balance_check_ok?: boolean;
  statement_period_warning?: (
    | { kind: 'overlap'; from?: string; to?: string }
    | { kind: 'gap'; previous_to: string; from: string; missing_days: number }
  ) | null;
};

export type BankImportCommitSummary = {
  imported_count?: number;
  skipped_duplicate_count?: number;
  approved_row_count?: number;
  draft_transaction_ids?: string[];
  drafts_created?: number;
  drafts?: Array<{
    transaction_id: string;
    invoice_id: string;
    partner_id: string | null;
    counterparty_name: string | null;
    amount: number;
    currency: string;
    tx_date: string;
  }>;
  drafts_excluded?: Array<{
    transaction_id: string;
    excluded_by: string | null;
    counterparty_name: string | null;
    amount: number;
    currency: string;
    tx_date: string;
  }>;
  drafts_errors?: Array<{ transaction_id: string | null; error: string }>;
  auto_create_enabled?: boolean;
  already_drafted?: number;
  strong_match_skipped?: number;
};

export type PaymentBatchSummary = {
  line_count?: number;
  total_amount?: number | string;
  [key: string]: unknown;
};

export type PaymentBatchPrefillLine = {
  invoice_id: string | null;
  amount: number | string;
  payee_name?: string | null;
  payee_iban?: string | null;
  payee_bic?: string | null;
  reference?: string | null;
  description?: string | null;
  warning_flags?: string[];
};

export type PaymentBatchMutationResult = {
  batch: PaymentBatchListItem;
  payments_created?: number;
  [key: string]: unknown;
};

export type MissingReceiptSettings = {
  is_enabled?: boolean;
  auto_create_drafts?: boolean;
  responsible_email?: string | null;
  frequency_days?: number | null;
  start_after_days?: number | null;
  weekday?: number | null;
  max_reminders?: number | null;
  email_subject?: string | null;
  email_body?: string | null;
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

  async listImportJobs(params?: { bank_account_id?: string; limit?: number }) {
    const response = await apiClient.get<ApiResponse<{
      items: BankImportHistoryItem[];
      last_imported_bank_day: string | null;
    }>>('/api/banking/import-jobs', { params });
    return response.data.data;
  },

  async parseImportJob(id: string) {
    const response = await apiClient.post<ApiResponse<{
      job: BankImportJob;
      preview_rows: BankImportPreviewRow[];
      summary: BankImportSummary;
    }>>(`/api/banking/import-jobs/${id}/parse`);
    return response.data.data;
  },

  async setImportRowApproval(id: string, updates: Array<{ row_no: number; is_approved: boolean }>) {
    const response = await apiClient.post<ApiResponse<{
      job: BankImportJob;
      preview_rows: BankImportPreviewRow[];
      summary: BankImportSummary;
    }>>(`/api/banking/import-jobs/${id}/rows/approval`, { updates });
    return response.data.data;
  },

  async commitImportJob(id: string) {
    const response = await apiClient.post<ApiResponse<{
      job: BankImportJob;
      summary: BankImportCommitSummary;
    }>>(`/api/banking/import-jobs/${id}/commit`);
    return response.data.data;
  },

  async getReviewQueue(params?: {
    limit?: number;
    offset?: number;
    auto_matchable_only?: boolean;
    review_state?: 'pending' | 'reviewed';
    hide_drafted?: boolean;
  }) {
    const response = await apiClient.get<ApiResponse<{
      items: BankReviewQueueItem[];
      total: number;
      /** Queue size ignoring the review_state filter. */
      total_all_states?: number;
      counts: {
        total: number;
        auto_ready: number;
        drafted: number;
        pending_other: number;
      };
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
      auto_match_plan?: BankAutoMatchPlan;
      auto_match_reason?: BankAutoMatchReason;
    }>>(`/api/banking/transactions/${id}/suggest-matches`);
    return response.data.data;
  },

  async autoMatch(id: string) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${id}/auto-match`);
    return response.data.data;
  },

  async reviewTransaction(id: string, payload: { review_state?: 'pending' | 'reviewed'; note?: string }) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${id}/review`, payload);
    return response.data.data;
  },

  async ignoreTransaction(id: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${id}/ignore`, payload || {});
    return response.data.data;
  },

  async matchInvoice(id: string, payload: { invoice_id: string; reference?: string }) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${id}/match-invoice`, payload);
    return response.data.data;
  },

  async matchInvoices(id: string, payload: { allocations: Array<{ invoice_id: string; amount?: number }>; reference?: string }) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${id}/match-invoices`, payload);
    return response.data.data;
  },

  async manualPost(id: string, payload: {
    /** Post the whole transaction to one account. Mutually exclusive with `lines`. */
    counter_account_id?: string;
    description?: string;
    partner_id?: string;
    /** Split across accounts; amounts are signed like the transaction and must sum to it. */
    lines?: Array<{ account_id: string; amount: number; description?: string }>;
  }) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${id}/manual-post`, payload);
    return response.data.data;
  },

  async unmatch(id: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${id}/unmatch`, payload || {});
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
      summary: PaymentBatchSummary;
    }>>(`/api/banking/payment-batches/${id}`);
    return response.data.data;
  },

  async getPaymentBatchPrefillLines(payload: { invoice_ids: string[]; currency?: string }) {
    const response = await apiClient.post<ApiResponse<{
      lines: PaymentBatchPrefillLine[];
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
    const response = await apiClient.post<ApiResponse<PaymentBatchMutationResult>>('/api/banking/payment-batches', payload);
    return response.data.data;
  },

  async submitPaymentBatchToBank(id: string) {
    const response = await apiClient.post<ApiResponse<{ batch: PaymentBatchListItem; provider: string; request_id: string }>>(
      `/api/banking/payment-batches/${id}/submit-to-bank`
    );
    return response.data.data;
  },

  async generatePaymentBatch(id: string) {
    const response = await apiClient.post<ApiResponse<PaymentBatchMutationResult>>(`/api/banking/payment-batches/${id}/generate`);
    return response.data.data;
  },

  async generatePaymentBatchPain001(id: string) {
    const response = await apiClient.post<ApiResponse<PaymentBatchMutationResult>>(`/api/banking/payment-batches/${id}/generate-pain001`);
    return response.data.data;
  },

  async confirmPaymentBatchUploaded(id: string) {
    const response = await apiClient.post<ApiResponse<PaymentBatchMutationResult>>(`/api/banking/payment-batches/${id}/confirm-uploaded`);
    return response.data.data;
  },

  async confirmPaymentBatchExecuted(id: string) {
    const response = await apiClient.post<ApiResponse<PaymentBatchMutationResult>>(`/api/banking/payment-batches/${id}/confirm-executed`);
    return response.data.data;
  },

  async voidPaymentBatch(id: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<PaymentBatchMutationResult>>(`/api/banking/payment-batches/${id}/void`, payload || {});
    return response.data.data;
  },

  async markMissingReceipt(transactionId: string, payload?: { partner_id?: string; description?: string }) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${transactionId}/mark-missing-receipt`, payload || {});
    return response.data.data;
  },

  async dismissMissingReceipt(transactionId: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/banking/transactions/${transactionId}/dismiss-missing-receipt`, payload || {});
    return response.data.data;
  },

  async getMissingReceiptSettings() {
    const response = await apiClient.get<ApiResponse<MissingReceiptSettings | null>>('/api/banking/missing-receipt-settings');
    return response.data.data;
  },

  async updateMissingReceiptSettings(data: MissingReceiptSettings) {
    const response = await apiClient.put<ApiResponse<MissingReceiptSettings>>('/api/banking/missing-receipt-settings', data);
    return response.data.data;
  },

  async listDraftableOutgoing(importJobId: string) {
    const response = await apiClient.get<ApiResponse<{
      items: DraftableOutgoingItem[];
      already_drafted: number;
      strong_match_skipped: number;
    }>>(
      `/api/banking/import-jobs/${importJobId}/draftable-outgoing`
    );
    return response.data.data;
  },

  async bulkMarkMissingReceipt(transactionIds: string[]) {
    const response = await apiClient.post<ApiResponse<{
      created: Array<{ transaction_id: string; invoice_id: string; partner_id: string | null }>;
      skipped: number;
      errors: Array<{ transaction_id: string; error: string }>;
    }>>('/api/banking/transactions/bulk-mark-missing-receipt', { transaction_ids: transactionIds });
    return response.data.data;
  },

  async undoAutoDrafts(transactionIds: string[]) {
    const response = await apiClient.post<ApiResponse<{
      deleted: number;
      skipped: number;
      deleted_transaction_ids: string[];
    }>>('/api/banking/transactions/undo-auto-drafts', { transaction_ids: transactionIds });
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
  field: 'counterparty_name' | 'counterparty_account' | 'reference' | 'description' | 'counterparty_is_private_person';
  match: 'contains' | 'exact' | 'starts_with' | 'regex';
  value: string;
};
