import { Router } from 'express';
import RoleRequestController from '../controllers/role-request.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// User requests role change (client can request reporter)
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
  authorize(Permissions.VIEW_ROLE_REQUESTS),
  apiLimiter,
  RoleRequestController.getPendingRequests
);

// Manager approves/rejects role request
router.patch(
  '/:id/review',
  authorize(Permissions.APPROVE_ROLE_REQUESTS),
  apiLimiter,
  RoleRequestController.reviewRoleRequest
);

// Get all role requests (manager/admin)
router.get(
  '/',
  authorize(Permissions.VIEW_ROLE_REQUESTS),
  apiLimiter,
  RoleRequestController.getAllRequests
);

export default router;
