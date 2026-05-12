import axiosInstance from './axios';
import { ApiResponse } from '../types';

export interface Finding {
  id: number;
  project_id?: number;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  description: string;
  affected_target?: string;
  affected_component?: string;
  cvss_score?: number;
  cwe_id?: string;
  owasp_category?: string;
  likelihood?: string | {
    severity: string;
    detail: string;
  };
  impact?: string | {
    severity: string;
    detail: string;
  };
  steps_to_reproduce?: Array<{
    stepNumber: number;
    description: string;
    image?: string;
    caption?: string;
  }> | string[];
  recommendation?: string[];
  remediation?: string;
  proof_of_concept?: string;
  references?: string[];
  finding_references?: any[];
  tags?: string[];
  status: 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected';
  created_by?: number;
  approved_by?: number;
  reviewed_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFindingData {
  title: string;
  severity: string;
  description?: string;
  affected_target?: string;
  affected_component?: string;
  likelihood?: any;
  impact?: any;
  steps_to_reproduce?: any;
  recommendation?: any;
  remediation?: string;
  proof_of_concept?: string;
  references?: any;
  tags?: any;
  status?: string;
  project_id?: number;
  cvss_score?: number;
  cwe_id?: string;
  owasp_category?: string;
}

export interface GenerateFindingData {
  evidence: string;
  severity: string;
  project_id?: number;
}

export const findingApi = {
  // CRUD operations
  create: (data: CreateFindingData) =>
    axiosInstance.post<ApiResponse<Finding>>('/findings', data),

  getAll: (filters?: any) =>
    axiosInstance.get<ApiResponse<Finding[]>>('/findings', { params: filters }),

  getAllFindings: (filters?: any) =>
    axiosInstance.get<ApiResponse<Finding[]>>('/findings', { params: filters }),

  getById: (id: number) =>
    axiosInstance.get<ApiResponse<Finding>>(`/findings/${id}`),

  getFinding: (id: number) =>
    axiosInstance.get<ApiResponse<Finding>>(`/findings/${id}`),

  update: (id: number, data: Partial<CreateFindingData>) =>
    axiosInstance.put<ApiResponse<Finding>>(`/findings/${id}`, data),

  updateFinding: (id: number, data: Partial<CreateFindingData>) =>
    axiosInstance.put<ApiResponse<Finding>>(`/findings/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse>(`/findings/${id}`),

  deleteFinding: (id: number) =>
    axiosInstance.delete<ApiResponse>(`/findings/${id}`),

  // AI operations
  generateContent: (data: GenerateFindingData) =>
    axiosInstance.post<ApiResponse<Partial<Finding>>>('/findings/generate-content', data, {
      timeout: 60000, // 60 seconds for AI generation
    }),

  generate: (data: GenerateFindingData) =>
    axiosInstance.post<ApiResponse<Finding>>('/findings/generate', data, {
      timeout: 60000, // 60 seconds for AI generation
    }),

  regenerateSection: (id: number, section: string) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/regenerate`, { section }),

  // Workflow operations
  submitForReview: (id: number) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/submit-review`),

  approve: (id: number) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/approve`),

  approveFinding: (id: number) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/approve`),

  requestChanges: (id: number, comment?: string) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/request-changes`, { comment }),

  // Version history
  getVersions: (id: number) =>
    axiosInstance.get<ApiResponse>(`/findings/${id}/versions`),

  getVersionHistory: (id: number) =>
    axiosInstance.get<ApiResponse>(`/findings/${id}/versions`),

  getVersion: (id: number, version: number) =>
    axiosInstance.get<ApiResponse>(`/findings/${id}/versions/${version}`),

  // Query
  query: (query: string) =>
    axiosInstance.post<ApiResponse<Finding[]>>('/findings/query', { query }),

  queryFindings: (query: string) =>
    axiosInstance.post<ApiResponse<Finding[]>>('/findings/query', { query }),

  // Import findings from another project
  importFromProject: (data: { source_project_id: number; target_project_id: number; finding_ids: number[] }) =>
    axiosInstance.post<ApiResponse<{ imported_count: number; findings: Finding[] }>>('/findings/import', data),
};
