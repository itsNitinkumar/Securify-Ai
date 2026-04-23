import { Router } from 'express';
import RoleRequestController from '../controllers/role-request.controller';
import { protect, requireRole } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// User requests role change (client can request analyst/reviewer)
router.post(
  '/request',
  apiLimiter,
  RoleRequestController.createRoleRequest
);

// User views their own role requests
router.get(
  '/my-requests',
  apiLimiter,
  RoleRequestController.getMyRequests
);

// Manager views pending role requests
router.get(
  '/pending',
  requireRole('manager', 'admin'),
  apiLimiter,
  RoleRequestController.getPendingRequests
);

// Manager approves/rejects role request
router.patch(
  '/:id/review',
  requireRole('manager', 'admin'),
  apiLimiter,
  RoleRequestController.reviewRoleRequest
);

// Get all role requests (manager/admin)
router.get(
  '/',
  requireRole('manager', 'admin'),
  apiLimiter,
  RoleRequestController.getAllRequests
);

export default router;
