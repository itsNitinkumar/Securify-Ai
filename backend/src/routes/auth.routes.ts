import { Router, Request, Response } from 'express';
import passport from 'passport';
import jwt, { SignOptions } from "jsonwebtoken";
import AuthController from '../controllers/auth.controller';
import { validateSignup, validateSignin } from '../middlewares/validate';
import { protect } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';
import { config } from '../config/env';

const router = Router();

// Regular auth routes with rate limiting
router.post('/signup', authLimiter, validateSignup, AuthController.signup);
router.post('/signin', authLimiter, validateSignin, AuthController.signin);
router.post('/signout', AuthController.signout as any);
router.get('/profile', protect, AuthController.getProfile as any);
router.get('/session', protect, AuthController.getSessionInfo as any);
router.get('/permissions', protect, AuthController.getPermissions as any);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

router.get('/google/callback', 
  (req: Request, res: Response, next) => {
    passport.authenticate('google', { 
      failureRedirect: `${config.frontendUrl}/signin?error=google_auth_failed`,
      session: false,
    }, (err, user, _info) => {
      if (err) {
        console.error('❌ Google OAuth error:', err);
        return res.redirect(`${config.frontendUrl}/signin?error=oauth_failed`);
      }
      
      if (!user) {
        console.error('❌ No user returned from Google OAuth');
        return res.redirect(`${config.frontendUrl}/signin?error=no_user`);
      }

      try {
        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, email: user.email },
          config.jwt.secret,
          { expiresIn: config.jwt.expire as SignOptions["expiresIn"] }
        );

        // Set httpOnly cookie - Same configuration as regular signin
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        });

        console.log('✅ Google OAuth successful for user:', user.email);
        console.log('✅ Cookie set, redirecting to frontend');
        
        // Redirect directly to frontend home - Cookie is already set!
        // No need to pass token in URL
        res.redirect(config.frontendUrl);
      } catch (error) {
        console.error('❌ Error generating token:', error);
        res.redirect(`${config.frontendUrl}/signin?error=token_generation_failed`);
      }
    })(req, res, next);
  }
);

export default router;
