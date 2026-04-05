import axiosInstance from './axios';
import { User, ApiResponse } from '../types';

export const userApi = {
  getAll: () => axiosInstance.get<ApiResponse<User[]>>('/users'),
  
  getById: (id: number) => axiosInstance.get<ApiResponse<User>>(`/users/${id}`),
  
  create: (data: { email: string; name: string }) =>
    axiosInstance.post<ApiResponse<User>>('/users', data),
  
  update: (id: number, data: { name: string }) =>
    axiosInstance.put<ApiResponse<User>>(`/users/${id}`, data),
  
  delete: (id: number) => axiosInstance.delete<ApiResponse>(`/users/${id}`),
};
