import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

/** Cost centres and projects (accounting.cost_centers / accounting.projects). */
export type CostCenter = {
  id: string;
  code: string | null;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = CostCenter & {
  /** Optional parent cost centre: picking the project on an invoice fills it in. */
  cost_center_id: string | null;
  /** Optional owner (customer on sales, supplier on purchase invoices): offered first on that partner's invoices. */
  partner_id: string | null;
};

export type DimensionInput = {
  code?: string | null;
  name?: string;
  cost_center_id?: string | null;
  partner_id?: string | null;
  is_active?: boolean;
};

function api<T extends CostCenter>(path: string) {
  return {
    async list(params?: { include_inactive?: boolean }) {
      const response = await apiClient.get<ApiResponse<T[]>>(`/api/dimensions/${path}`, { params });
      return response.data.data;
    },
    async create(payload: DimensionInput) {
      const response = await apiClient.post<ApiResponse<T>>(`/api/dimensions/${path}`, payload);
      return response.data.data;
    },
    async update(id: string, payload: DimensionInput) {
      const response = await apiClient.put<ApiResponse<T>>(`/api/dimensions/${path}/${id}`, payload);
      return response.data.data;
    },
    async remove(id: string) {
      const response = await apiClient.delete<ApiResponse<{ id: string }>>(`/api/dimensions/${path}/${id}`);
      return response.data.data;
    },
  };
}

export const costCentersApi = api<CostCenter>('cost-centers');
export const projectsApi = api<Project>('projects');

export const dimensionLabel = (d: { code: string | null; name: string }) => (d.code ? `${d.code} · ${d.name}` : d.name);

/** Split projects into the partner's own (offered first) and everything else. */
export function groupProjects(projects: Project[], partnerId?: string | null) {
  const own = partnerId ? projects.filter((p) => p.partner_id === partnerId) : [];
  const other = projects.filter((p) => !own.includes(p));
  return { own, other };
}
