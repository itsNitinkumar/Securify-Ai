import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import { config } from '../config/env';
import AuthModel from '../models/auth.model';

export const protect = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

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
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      next();
    } catch (error) {
      throw new ApiError(401, 'Not authorized, invalid token');
    }
  }
);
