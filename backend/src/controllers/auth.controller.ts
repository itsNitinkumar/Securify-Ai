import { Request, Response } from 'express';
import AuthService from '../services/auth.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';

class AuthController {
  static signup = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const result = await AuthService.signup(name, email, password);
    
    // Set httpOnly cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    ApiResponse.success(res, 201, 'User registered successfully', {
      user: result.user,
    });
  });

  static signin = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await AuthService.signin(email, password);
    
    // Set httpOnly cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    ApiResponse.success(res, 200, 'Login successful', {
      user: result.user,
    });
  });

  static signout = asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie('token');
    ApiResponse.success(res, 200, 'Logout successful');
  });

  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const user = await AuthService.getProfile(userId);
    ApiResponse.success(res, 200, 'Profile retrieved successfully', user);
  });
}

export default AuthController;
