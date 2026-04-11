import { Router } from 'express';
import userRoutes from './user.routes';
import authRoutes from './auth.routes';
import findingRoutes from './finding.routes';
import evidenceRoutes from './evidence.routes';
import projectRoutes from './project.routes';
import reportRoutes from './report.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Project routes
router.use('/projects', projectRoutes);

// Finding routes
router.use('/findings', findingRoutes);

// Evidence routes
router.use('/evidence', evidenceRoutes);

// Report routes
router.use('/reports', reportRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
