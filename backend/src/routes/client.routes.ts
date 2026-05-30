import { Router } from 'express';
import { NextFunction, Response } from 'express';
import ClientController from '../controllers/client.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';
import UserModel from '../models/user.model';

const router = Router();

router.use(protect);

const canViewClients = asyncHandler(async (req: any, _res: Response, next: NextFunction) => {
  const permissions = req.permissions || await UserModel.getPermissions(req.user.id);
  req.permissions = permissions;
  if (permissions.includes(Permissions.VIEW_CLIENTS) || permissions.includes(Permissions.CREATE_FINDINGS)) return next();
  throw new ApiError(403, 'Access denied. Insufficient permissions.');
});

router.get('/', canViewClients, ClientController.listClients);
router.post('/', authorize(Permissions.MANAGE_CLIENTS), ClientController.createClient);

export default router;
