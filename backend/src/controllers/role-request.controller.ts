import { Request, Response } from 'express';
import RoleRequestService from '../services/role-request.service';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

class RoleRequestController {
  // User creates role change request
  static createRoleRequest = asyncHandler(async (req: Request, res: Response) => {
    const { requested_role, request_reason } = req.body;
    const user = (req as any).user;

    // Validate requested role
    if (!requested_role || !['analyst', 'reviewer'].includes(requested_role)) {
      throw new ApiError(400, 'Can only request analyst or reviewer role');
    }

    // Check if user already has this role
    if (user.role === requested_role) {
      throw new ApiError(400, `You already have the ${requested_role} role`);
    }

    // Check if user already has a pending request
    const hasPending = await RoleRequestService.hasPendingRequest(user.id);
    if (hasPending) {
      throw new ApiError(400, 'You already have a pending role request');
    }

    const roleRequest = await RoleRequestService.createRequest({
      user_id: user.id,
      requested_role,
      current_role: user.role,
      request_reason: request_reason || null,
    });

    ApiResponse.success(res, 201, 'Role request submitted successfully', roleRequest);
  });

  // User views their own requests
  static getMyRequests = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const requests = await RoleRequestService.getUserRequests(user.id);
    ApiResponse.success(res, 200, 'Role requests retrieved successfully', requests);
  });

  // Manager views pending requests
  static getPendingRequests = asyncHandler(async (_req: Request, res: Response) => {
    const requests = await RoleRequestService.getPendingRequests();
    ApiResponse.success(res, 200, 'Pending requests retrieved successfully', requests);
  });

  // Manager reviews (approve/reject) request
  static reviewRoleRequest = asyncHandler(async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id);
    const { status, review_notes } = req.body;
    const reviewer = (req as any).user;

    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Status must be either approved or rejected');
    }

    const result = await RoleRequestService.reviewRequest(
      requestId,
      status,
      reviewer.id,
      review_notes || null
    );

    const message = status === 'approved' 
      ? 'Role request approved successfully' 
      : 'Role request rejected';

    ApiResponse.success(res, 200, message, result);
  });

  // Get all requests (manager/admin)
  static getAllRequests = asyncHandler(async (req: Request, res: Response) => {
    const status = Array.isArray(req.query.status) 
      ? req.query.status[0] 
      : req.query.status as string | undefined;
    const requests = await RoleRequestService.getAllRequests(status);
    ApiResponse.success(res, 200, 'Role requests retrieved successfully', requests);
  });
}

export default RoleRequestController;
