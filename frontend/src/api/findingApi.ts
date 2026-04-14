import axiosInstance from './axios';
import { ApiResponse } from '../types';

export interface Finding {
  id: number;
  project_id?: number;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  description: string;
  affected_target?: string;
  likelihood?: string;
  impact?: string;
  steps_to_reproduce?: string[];
  proof_of_concept?: string;
  remediation?: string;
  references?: string[];
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
  likelihood?: string;
  impact?: string;
  steps_to_reproduce?: string[];
  proof_of_concept?: string;
  remediation?: string;
  references?: string[];
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

  getById: (id: number) =>
    axiosInstance.get<ApiResponse<Finding>>(`/findings/${id}`),

  update: (id: number, data: Partial<CreateFindingData>) =>
    axiosInstance.put<ApiResponse<Finding>>(`/findings/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse>(`/findings/${id}`),

  // AI operations
  generateContent: (data: GenerateFindingData) =>
    axiosInstance.post<ApiResponse<Partial<Finding>>>('/findings/generate-content', data),

  generate: (data: GenerateFindingData) =>
    axiosInstance.post<ApiResponse<Finding>>('/findings/generate', data),

  regenerateSection: (id: number, section: string) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/regenerate`, { section }),

  // Workflow operations
  submitForReview: (id: number) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/submit-review`),

  approve: (id: number) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/approve`),

  requestChanges: (id: number, comment?: string) =>
    axiosInstance.post<ApiResponse<Finding>>(`/findings/${id}/request-changes`, { comment }),

  // Version history
  getVersions: (id: number) =>
    axiosInstance.get<ApiResponse>(`/findings/${id}/versions`),

  getVersion: (id: number, version: number) =>
    axiosInstance.get<ApiResponse>(`/findings/${id}/versions/${version}`),

  // Query
  query: (query: string) =>
    axiosInstance.post<ApiResponse<Finding[]>>('/findings/query', { query }),
};
