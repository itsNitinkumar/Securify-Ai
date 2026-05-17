import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import AuthService from '../services/auth.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import { getSessionInfo, clearSessionActivity } from '../middlewares/sessionTimeout';
import { config } from '../config/env';

class AuthController {
  static signup = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const result = await AuthService.signup(name, email, password);
    
    // Don't set cookie for pending users - they can't login yet
    if (result.user.status === 'pending') {
      return ApiResponse.success(res, 201, 'Account created successfully. Please wait for manager approval.', {
        user: result.user,
        requiresApproval: true,
      });
    }
    
    // Set httpOnly cookie for active users
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return ApiResponse.success(res, 201, 'User registered successfully', {
      user: result.user,
    });
  });

  static signin = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await AuthService.signin(email, password);
    
    // Set httpOnly cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    ApiResponse.success(res, 200, 'Login successful', {
      user: result.user,
    });
  });

  static signout = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    // Clear session activity
    if (req.user?.id) {
      clearSessionActivity(req.user.id);
    }
    
    res.clearCookie('token');
    ApiResponse.success(res, 200, 'Logout successful');
  });

  static getProfile = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const user = await AuthService.getProfile(userId!);
    ApiResponse.success(res, 200, 'Profile retrieved successfully', user);
  });

  static getSessionInfo = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return ApiResponse.error(res, 401, 'Not authenticated');
    }

    const sessionInfo = getSessionInfo(userId);
    
    if (!sessionInfo) {
      return ApiResponse.error(res, 401, 'No active session');
    }

    return ApiResponse.success(res, 200, 'Session info retrieved', {
      session: {
        ...sessionInfo,
        timeout: config.session.timeout,
        warningTime: config.session.warningTime,
      },
    });
  });
}

export default AuthController;
