import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './config/passport';
import { config } from './config/env';
import routes from './routes';
import errorHandler from './middlewares/errorHandler';
import { globalLimiter } from './middlewares/rateLimiter';
import { checkSessionTimeout } from './middlewares/sessionTimeout';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Global rate limiter (apply to all requests)
app.use(globalLimiter);

// Session middleware (required for passport)
app.use(session({
  secret: config.jwt.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.env === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Cookie parser
app.use(cookieParser());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session timeout check (after authentication)
app.use('/api/v1', checkSessionTimeout);

// Routes
app.use('/api/v1', routes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
