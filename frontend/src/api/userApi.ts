import axiosInstance from './axios';
import { User, ApiResponse } from '../types';

export const userApi = {
  getAll: () => axiosInstance.get<ApiResponse<User[]>>('/users'),
  
  getById: (id: number) => axiosInstance.get<ApiResponse<User>>(`/users/${id}`),
  
  create: (data: { email: string; name: string }) =>
    axiosInstance.post<ApiResponse<User>>('/users', data),
  
  update: (id: number, data: { name: string; role?: string }) =>
    axiosInstance.put<ApiResponse<User>>(`/users/${id}`, data),
  
  approve: (id: number, role?: string) =>
    axiosInstance.patch<ApiResponse<User>>(`/users/${id}/approve`, { role }),
  
  delete: (id: number) => axiosInstance.delete<ApiResponse>(`/users/${id}`),
  
  getReporters: () => axiosInstance.get<ApiResponse<User[]>>('/users/reporters'),

  // Admin only: Create manager
  createManager: (data: { name: string; email: string; password: string }) =>
    axiosInstance.post<ApiResponse<User>>('/users/managers/create', data),
  
  // Admin only: Delete manager
  deleteManager: (id: number) =>
    axiosInstance.delete<ApiResponse>(`/users/managers/${id}`),
};
