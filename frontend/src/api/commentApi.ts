import axiosInstance from './axios';
import { ApiResponse } from '../types';

export interface Comment {
  id: number;
  finding_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

export const commentApi = {
  // Create comment
  create: (findingId: number, comment: string) =>
    axiosInstance.post<ApiResponse<Comment>>('/comments', {
      finding_id: findingId,
      comment,
    }),

  // Get comments for a finding
  getByFinding: (findingId: number) =>
    axiosInstance.get<ApiResponse<Comment[]>>(`/comments/finding/${findingId}`),

  // Update comment
  update: (id: number, comment: string) =>
    axiosInstance.put<ApiResponse<Comment>>(`/comments/${id}`, { comment }),

  // Delete comment
  delete: (id: number) =>
    axiosInstance.delete<ApiResponse>(`/comments/${id}`),
};
