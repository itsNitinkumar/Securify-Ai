export interface User {
  id: number;
  email: string;
  name: string;
  role?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
