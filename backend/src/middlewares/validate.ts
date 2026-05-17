import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUserInput = (
  req: Request,
  _res: Response,
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

export const validateSignup = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  if (!validateEmail(email)) {
    throw new ApiError(400, 'Invalid email format');
  }

  if (password.length < 12) {
    throw new ApiError(400, 'Password must be at least 12 characters long');
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    throw new ApiError(400, 'Password must contain both uppercase and lowercase letters');
  }

  if (!/\d/.test(password)) {
    throw new ApiError(400, 'Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new ApiError(400, 'Password must contain at least one special character');
  }

  next();
};

export const validateSignin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  if (!validateEmail(email)) {
    throw new ApiError(400, 'Invalid email format');
  }

  next();
};
