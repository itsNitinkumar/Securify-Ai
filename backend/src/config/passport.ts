import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './env';
import AuthModel from '../models/auth.model';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔍 Google OAuth callback received for:', profile.displayName);
        
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        if (!email) {
          console.error('❌ No email found in Google profile');
          return done(new Error('No email found from Google'), undefined);
        }

        console.log('📧 Email from Google:', email);

        // Check if user exists
        let user = await AuthModel.findByEmail(email);

        if (!user) {
          console.log('👤 Creating new user for:', email);
          // Create new user
          user = await AuthModel.createOAuthUser(name, email, 'google', profile.id);
          console.log('✅ New user created:', user.id);
        } else {
          console.log('✅ Existing user found:', user.id);
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in Google OAuth strategy:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await AuthModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
