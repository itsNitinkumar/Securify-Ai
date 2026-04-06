import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { validateSignup, validateSignin } from '../middlewares/validate';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/signup', validateSignup, AuthController.signup);
router.post('/signin', validateSignin, AuthController.signin);
router.post('/signout', AuthController.signout);
router.get('/profile', protect, AuthController.getProfile);

export default router;
