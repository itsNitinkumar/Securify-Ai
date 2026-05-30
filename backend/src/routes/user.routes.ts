import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { validateUserInput } from '../middlewares/validate';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';

const router = Router();

// All user routes require authentication
router.use(protect);

// Manager and Admin can manage users
router.get('/', authorize(Permissions.VIEW_USERS), UserController.getUsers);
router.get('/reporters', authorize(Permissions.VIEW_USERS, Permissions.ASSIGN_PROJECTS), UserController.getReporters);
router.get('/:id', authorize(Permissions.VIEW_USERS), UserController.getUser);
router.post('/', authorize(Permissions.CREATE_USERS), validateUserInput, UserController.createUser);
router.put('/:id', authorize(Permissions.EDIT_USERS), UserController.updateUser);
router.patch('/:id/approve', authorize(Permissions.APPROVE_USERS), UserController.approveUser);

// Admin only: Create manager
router.post('/managers/create', authorize(Permissions.CREATE_USERS, Permissions.MANAGE_ROLES), UserController.createManager);

// Admin only: Delete manager
router.delete('/managers/:id', authorize(Permissions.DELETE_USERS), UserController.deleteManager);

// Admin only: Delete any user
router.delete('/:id', authorize(Permissions.DELETE_USERS), UserController.deleteUser);

export default router;
