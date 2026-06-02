import axiosInstance from './axios';
import { ApiResponse } from '../types';

export interface ProjectComment {
  id: number;
  project_id: number;
  section_type: string;
  section_identifier?: string;
  comment: string;
  created_by?: number;
  created_by_name?: string;
  created_by_role?: string;
  resolved: boolean;
  resolved_by?: number;
  resolved_by_name?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export const projectCommentApi = {
  getByProject: (projectId: number) =>
    axiosInstance.get<ApiResponse<ProjectComment[]>>(`/projects/${projectId}/comments`),

  create: (projectId: number, data: { section_type: string; section_identifier?: string; comment: string }) =>
    axiosInstance.post<ApiResponse<ProjectComment>>(`/projects/${projectId}/comments`, data),

  update: (id: number, comment: string) =>
    axiosInstance.put<ApiResponse<ProjectComment>>(`/projects/comments/${id}`, { comment }),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse>(`/projects/comments/${id}`),

  resolve: (id: number) =>
    axiosInstance.patch<ApiResponse<ProjectComment>>(`/projects/comments/${id}/resolve`),

  reopen: (id: number) =>
    axiosInstance.patch<ApiResponse<ProjectComment>>(`/projects/comments/${id}/reopen`),
};
