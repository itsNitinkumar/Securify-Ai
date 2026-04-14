import axiosInstance from './axios';
import { ApiResponse } from '../types';

interface SignUpData {
  name: string;
  email: string;
  password: string;
}

interface SignInData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role?: string;
    status?: string;
    created_at: string;
  };
  token: string;
}

export const authApi = {
  signup: (data: SignUpData) =>
    axiosInstance.post<ApiResponse<AuthResponse>>('/auth/signup', data),

  signin: (data: SignInData) =>
    axiosInstance.post<ApiResponse<AuthResponse>>('/auth/signin', data),

  signout: () =>
    axiosInstance.post<ApiResponse>('/auth/signout'),

  getProfile: () =>
    axiosInstance.get<ApiResponse>('/auth/profile'),
};
