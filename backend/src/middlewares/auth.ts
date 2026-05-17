import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, UserRole } from '../types';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import { config } from '../config/env';
import AuthModel from '../models/auth.model';

export const protect = asyncHandler<AuthRequest>(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    // Check for token in Authorization header or cookies
    let token = req.headers.authorization?.split(' ')[1];

    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, no token');
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { id: number; email: string };
      const user = await AuthModel.findById(decoded.id);

      if (!user) {
        throw new ApiError(401, 'User not found');
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      next();
    } catch (error) {
      throw new ApiError(401, 'Not authorized, invalid token');
    }
  }
) as any;

// Role-based access control middleware
export const requireRole = (...allowedRoles: UserRole[]): any => {
  return ((req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied. Required role: ${allowedRoles.join(' or ')}`);
    }

    next();
  }) as any;
};
