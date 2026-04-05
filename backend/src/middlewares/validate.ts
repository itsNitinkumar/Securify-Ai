import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUserInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, name } = req.body;

  if (!email || !name) {
    throw new ApiError(400, 'Email and name are required');
  }

  if (!validateEmail(email)) {
    throw new ApiError(400, 'Invalid email format');
  }

  next();
};
