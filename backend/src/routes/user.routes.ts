import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { validateUserInput } from '../middlewares/validate';
import { protect, requireRole } from '../middlewares/auth';

const router = Router();

// All user routes require authentication
router.use(protect);

// Manager and Admin can manage users
router.get('/', requireRole('manager', 'admin'), UserController.getUsers);
router.get('/:id', requireRole('manager', 'admin'), UserController.getUser);
router.post('/', requireRole('manager', 'admin'), validateUserInput, UserController.createUser);
router.put('/:id', requireRole('manager', 'admin'), UserController.updateUser);
router.patch('/:id/approve', requireRole('manager', 'admin'), UserController.approveUser);

// Admin only: Create manager
router.post('/managers/create', requireRole('admin'), UserController.createManager);

// Admin only: Delete manager
router.delete('/managers/:id', requireRole('admin'), UserController.deleteManager);

// Admin only: Delete any user
router.delete('/:id', requireRole('admin'), UserController.deleteUser);

export default router;
