import { Request } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}
