import axiosInstance from './axios';
import { ApiResponse } from '../types';

export interface Evidence {
  id: number;
  finding_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  caption?: string;
  uploaded_by: number;
  created_at: string;
}

export const evidenceApi = {
  upload: (findingId: number, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('finding_id', findingId.toString());
    if (caption) {
      formData.append('caption', caption);
    }
    
    return axiosInstance.post<ApiResponse<Evidence>>('/evidence/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getByFinding: (findingId: number) =>
    axiosInstance.get<ApiResponse<Evidence[]>>(`/evidence/finding/${findingId}`),

  download: (id: number) =>
    axiosInstance.get(`/evidence/${id}/download`, {
      responseType: 'blob',
    }),

  updateCaption: (id: number, caption: string) =>
    axiosInstance.put<ApiResponse<Evidence>>(`/evidence/${id}/caption`, { caption }),

  delete: (id: number) =>
    axiosInstance.delete<ApiResponse>(`/evidence/${id}`),
};
