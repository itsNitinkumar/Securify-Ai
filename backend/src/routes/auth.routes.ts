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
  {
    expiresIn: config.jwt.expire as SignOptions["expiresIn"],
  }
);

        // Set cookie (for cookie-based auth if needed)
        res.cookie('token', token, {
          httpOnly: true,
          secure: config.env === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        console.log('✅ Google OAuth successful for user:', user.email);
        
        // Redirect to frontend with token in URL (for localStorage)
        const userData = encodeURIComponent(JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }));
        
        const redirectUrl = `${config.frontendUrl}/auth/callback?token=${token}&user=${userData}`;
        console.log('🔄 Redirecting to:', redirectUrl);
        
        res.redirect(redirectUrl);
      } catch (error) {
        console.error('❌ Error generating token:', error);
        res.redirect(`${config.frontendUrl}/signin?error=token_generation_failed`);
      }
    })(req, res, next);
  }
);

export default router;
