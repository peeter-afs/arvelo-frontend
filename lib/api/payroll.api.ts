import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type ContractType = 'employment' | 'board_member' | 'service';
export type PayBasis = 'monthly' | 'hourly';
export type EarningKind = 'base' | 'bonus' | 'vacation' | 'other' | 'sick';
export type PayrollRunStatus = 'draft' | 'approved' | 'posted' | 'cancelled';

export type PayrollContract = {
  id: string;
  employee_id: string;
  contract_type: ContractType;
  title: string | null;
  start_date: string;
  end_date: string | null;
  pay_basis: PayBasis;
  base_amount: number;
  workload: number;
  default_hours: number | null;
  expense_account_id: string | null;
  cost_center_id: string | null;
  project_id: string | null;
};

export type PayrollEmployee = {
  id: string;
  partner_id: string;
  name: string | null;
  personal_code_masked: string | null;
  id_country: string;
  iban: string | null;
  pension_rate: number;
  pension_age: boolean;
  apply_tax_exemption: boolean;
  tax_exemption_amount: number | null;
  apply_min_social_tax: boolean;
  is_active: boolean;
  notes: string | null;
  contracts: PayrollContract[];
};

export type ContractInput = Omit<PayrollContract, 'id' | 'employee_id' | 'workload'> & { workload?: number };

export type EmployeeInput = {
  partner_id?: string | null;
  name?: string | null;
  personal_code?: string | null;
  id_country?: string;
  iban?: string | null;
  pension_rate?: number;
  pension_age?: boolean;
  apply_tax_exemption?: boolean;
  tax_exemption_amount?: number | null;
  apply_min_social_tax?: boolean;
  is_active?: boolean;
  notes?: string | null;
  contract?: ContractInput | null;
};

export type EarningItem = {
  kind: EarningKind;
  description: string | null;
  amount: number;
  hours?: number | null;
};

export type PayrollTotals = {
  gross_wage: number;
  gross_sick: number;
  min_base_increase: number;
  social_tax: number;
  pension: number;
  unemployment_employee: number;
  unemployment_employer: number;
  exemption_used: number;
  income_tax: number;
  net_pay: number;
  employer_cost: number;
  taxes_to_pay: number;
};

export type PayrollLine = Omit<PayrollTotals, 'taxes_to_pay'> & {
  id: string;
  employee_id: string;
  contract_id: string | null;
  payment_type: '10' | '17' | '21';
  items: EarningItem[];
  apply_min_social_tax: boolean;
  exemption_override: number | null;
  employee_name: string | null;
  partner_id: string | null;
  pension_age: boolean;
  contract_title: string | null;
  contract_type: ContractType | null;
};

export type PayrollRun = {
  id: string;
  period_month: string;
  payment_date: string;
  status: PayrollRunStatus;
  description: string | null;
  journal_entry_id: string | null;
  reversal_journal_entry_id: string | null;
  payment_batch_id: string | null;
  tsd_exported_at: string | null;
  approved_at: string | null;
  posted_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  totals: PayrollTotals;
};

export type PayrollRunListItem = PayrollRun & { employee_count: number };
export type PayrollRunDetail = PayrollRun & { lines: PayrollLine[]; warnings: string[] };

export type PayrollAccountKey =
  | 'wage_expense_account_id'
  | 'social_tax_expense_account_id'
  | 'unemployment_expense_account_id'
  | 'net_payable_account_id'
  | 'social_tax_account_id'
  | 'income_tax_account_id'
  | 'unemployment_account_id'
  | 'pension_account_id';

export type PayrollSettings = Record<PayrollAccountKey, string | null> & {
  payment_day: number;
  emta_reference: string | null;
  accounts: Record<PayrollAccountKey, { id: string; code: string; name: string } | null>;
};

export type Payslip = {
  run_id: string;
  period_month: string;
  payment_date: string;
  pension_rate: number;
  items: EarningItem[];
  totals: PayrollTotals;
};

function downloadBlob(data: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** A failed blob request carries the JSON error as a Blob; surface its message. */
async function getBlob(url: string, params?: Record<string, string>): Promise<Blob> {
  try {
    const response = await apiClient.get(url, { params, responseType: 'blob' });
    return response.data as Blob;
  } catch (error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (data instanceof Blob) {
      try {
        const parsed = JSON.parse(await data.text()) as { error?: { message?: string } };
        if (parsed.error?.message) throw new Error(parsed.error.message);
      } catch (parseError) {
        if (parseError instanceof Error && !(parseError instanceof SyntaxError)) throw parseError;
      }
    }
    throw error;
  }
}

export const payrollApi = {
  async settings() {
    const response = await apiClient.get<ApiResponse<PayrollSettings>>('/api/payroll/settings');
    return response.data.data;
  },
  async updateSettings(payload: Partial<Record<PayrollAccountKey, string | null>> & { payment_day?: number; emta_reference?: string | null }) {
    const response = await apiClient.put<ApiResponse<PayrollSettings>>('/api/payroll/settings', payload);
    return response.data.data;
  },

  async employees(params?: { all?: boolean }) {
    const response = await apiClient.get<ApiResponse<PayrollEmployee[]>>('/api/payroll/employees', {
      params: params?.all ? { all: '1' } : undefined,
    });
    return response.data.data;
  },
  async createEmployee(payload: EmployeeInput) {
    const response = await apiClient.post<ApiResponse<PayrollEmployee>>('/api/payroll/employees', payload);
    return response.data.data;
  },
  async updateEmployee(id: string, payload: EmployeeInput) {
    const response = await apiClient.put<ApiResponse<PayrollEmployee>>(`/api/payroll/employees/${id}`, payload);
    return response.data.data;
  },
  async createContract(employeeId: string, payload: ContractInput) {
    const response = await apiClient.post<ApiResponse<PayrollContract>>(`/api/payroll/employees/${employeeId}/contracts`, payload);
    return response.data.data;
  },
  async updateContract(employeeId: string, contractId: string, payload: ContractInput) {
    const response = await apiClient.put<ApiResponse<PayrollContract>>(`/api/payroll/employees/${employeeId}/contracts/${contractId}`, payload);
    return response.data.data;
  },
  async deleteContract(employeeId: string, contractId: string) {
    await apiClient.delete(`/api/payroll/employees/${employeeId}/contracts/${contractId}`);
  },

  async runs() {
    const response = await apiClient.get<ApiResponse<PayrollRunListItem[]>>('/api/payroll/runs');
    return response.data.data;
  },
  async run(id: string) {
    const response = await apiClient.get<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}`);
    return response.data.data;
  },
  async createRun(payload: { period_month: string; payment_date?: string | null; description?: string | null }) {
    const response = await apiClient.post<ApiResponse<PayrollRunDetail>>('/api/payroll/runs', payload);
    return response.data.data;
  },
  async updateRun(id: string, payload: { payment_date?: string; description?: string | null }) {
    const response = await apiClient.patch<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}`, payload);
    return response.data.data;
  },
  async deleteRun(id: string) {
    await apiClient.delete(`/api/payroll/runs/${id}`);
  },
  async addLine(id: string, contractId: string) {
    const response = await apiClient.post<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}/lines`, { contract_id: contractId });
    return response.data.data;
  },
  async updateLine(id: string, lineId: string, payload: { items?: EarningItem[]; apply_min_social_tax?: boolean; exemption_override?: number | null }) {
    const response = await apiClient.patch<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}/lines/${lineId}`, payload);
    return response.data.data;
  },
  async removeLine(id: string, lineId: string) {
    const response = await apiClient.delete<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}/lines/${lineId}`);
    return response.data.data;
  },
  async approve(id: string) {
    const response = await apiClient.post<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}/approve`);
    return response.data.data;
  },
  async reopen(id: string) {
    const response = await apiClient.post<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}/reopen`);
    return response.data.data;
  },
  async post(id: string) {
    const response = await apiClient.post<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}/post`);
    return response.data.data;
  },
  async cancel(id: string, reason?: string | null) {
    const response = await apiClient.post<ApiResponse<PayrollRunDetail>>(`/api/payroll/runs/${id}/cancel`, { reason: reason || null });
    return response.data.data;
  },
  async createPaymentBatch(id: string, payload: { bank_account_id: string; include_taxes?: boolean }) {
    const response = await apiClient.post<ApiResponse<{ batch: { id: string } }>>(`/api/payroll/runs/${id}/payment-batch`, payload);
    return response.data.data;
  },

  /** Download the data-based TSD (XBRL GL) for a payout month. */
  async downloadTsd(period: string) {
    downloadBlob(await getBlob('/api/payroll/tsd', { period }), `TSD_${period}.xml`, 'application/xml');
  },
  async downloadTsdCancellation(id: string, period: string) {
    downloadBlob(await getBlob(`/api/payroll/runs/${id}/tsd-cancellation`), `TSD_${period}_tuhistamine.xml`, 'application/xml');
  },
};
