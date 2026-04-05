import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import { config } from '../config/env';

// Placeholder for JWT verification
// Install: npm install jsonwebtoken @types/jsonwebtoken
export const protect = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Not authorized, no token');
    }

    // TODO: Verify JWT token and attach user to request
    // import jwt from 'jsonwebtoken';
    // const decoded = jwt.verify(token, config.jwt.secret);
    // req.user = await UserModel.findById(decoded.id);

    next();
  }
);
