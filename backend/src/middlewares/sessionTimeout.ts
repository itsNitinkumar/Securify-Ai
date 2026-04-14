import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { config } from '../config/env';
import ApiError from '../utils/ApiError';

// In-memory session activity tracker
// In production, use Redis or database
const sessionActivity = new Map<number, number>();

// Middleware to track user activity
export const trackActivity = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.user?.id) {
    // Update last activity timestamp
    sessionActivity.set(req.user.id, Date.now());
  }
  next();
};

// Middleware to check session timeout
export const checkSessionTimeout = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    return next();
  }

  const lastActivity = sessionActivity.get(req.user.id);
  
  if (!lastActivity) {
    // First request, set activity
    sessionActivity.set(req.user.id, Date.now());
    return next();
  }

  const inactiveTime = Date.now() - lastActivity;
  const timeoutDuration = config.session.timeout;

  if (inactiveTime > timeoutDuration) {
    // Session expired due to inactivity
    sessionActivity.delete(req.user.id);
    
    // Clear cookie
    res.clearCookie('token');
    
    throw new ApiError(401, 'Session expired due to inactivity. Please login again.');
  }

  // Update activity timestamp
  sessionActivity.set(req.user.id, Date.now());
  next();
};

// Get session info for a user
export const getSessionInfo = (userId: number) => {
  const lastActivity = sessionActivity.get(userId);
  
  if (!lastActivity) {
    return null;
  }

  const inactiveTime = Date.now() - lastActivity;
  const timeoutDuration = config.session.timeout;
  const remainingTime = timeoutDuration - inactiveTime;

  return {
    lastActivity: new Date(lastActivity),
    inactiveTime,
    remainingTime: Math.max(0, remainingTime),
    willExpireAt: new Date(lastActivity + timeoutDuration),
    isExpired: remainingTime <= 0,
  };
};

// Clear session activity (on logout)
export const clearSessionActivity = (userId: number) => {
  sessionActivity.delete(userId);
};

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  const timeoutDuration = config.session.timeout;
  
  for (const [userId, lastActivity] of sessionActivity.entries()) {
    if (now - lastActivity > timeoutDuration) {
      sessionActivity.delete(userId);
    }
  }
}, 60000); // Cleanup every minute
