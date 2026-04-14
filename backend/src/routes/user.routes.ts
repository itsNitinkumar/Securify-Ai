import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { validateUserInput } from '../middlewares/validate';
import { protect, requireRole } from '../middlewares/auth';

const router = Router();

// All user routes require authentication
router.use(protect);

// Only managers can manage users
router.get('/', requireRole('manager'), UserController.getUsers);
router.get('/:id', requireRole('manager'), UserController.getUser);
router.post('/', requireRole('manager'), validateUserInput, UserController.createUser);
router.put('/:id', requireRole('manager'), UserController.updateUser);
router.patch('/:id/approve', requireRole('manager'), UserController.approveUser);
router.delete('/:id', requireRole('manager'), UserController.deleteUser);

export default router;
