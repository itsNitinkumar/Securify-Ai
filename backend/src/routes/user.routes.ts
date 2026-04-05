import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { validateUserInput } from '../middlewares/validate';

const router = Router();

router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUser);
router.post('/', validateUserInput, UserController.createUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

export default router;
