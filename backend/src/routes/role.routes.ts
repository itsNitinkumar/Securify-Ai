import { Router } from 'express';
import { protect } from '../middlewares/auth';
import { authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';
import RoleController from '../controllers/role.controller';

const router = Router();

router.get('/', protect, authorize(Permissions.MANAGE_ROLES), RoleController.getAll as any);
router.get('/permissions', protect, authorize(Permissions.MANAGE_ROLES), RoleController.getAllPermissions as any);

export default router;
