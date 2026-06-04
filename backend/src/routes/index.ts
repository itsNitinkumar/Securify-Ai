import { Router } from 'express';
import userRoutes from './user.routes';
import authRoutes from './auth.routes';
import findingRoutes from './finding.routes';
import evidenceRoutes from './evidence.routes';
import projectRoutes from './project.routes';
import projectCommentRoutes from './project-comment.routes';
import reportRoutes from './report.routes';
import dashboardRoutes from './dashboard.routes';
import templateRoutes from './template.routes';
import commentRoutes from './comment.routes';
import commentThreadRoutes from './comment-thread.routes';
import roleRequestRoutes from './role-request.routes';
import clientRoutes from './client.routes';
import uploadRoutes from './upload.routes';
import roleRoutes from './role.routes';
import searchRoutes from './search.routes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Role request routes
router.use('/role-requests', roleRequestRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Project routes
router.use('/projects', projectRoutes);

// Project comment routes (nested under /projects)
router.use('/projects', projectCommentRoutes);

// Client routes
router.use('/clients', clientRoutes);

// Finding routes
router.use('/findings', findingRoutes);

// Evidence routes
router.use('/evidence', evidenceRoutes);

// Comment routes (legacy finding comments)
router.use('/comments', commentRoutes);

// Comment thread routes (section-based threaded comments)
router.use('/comment-threads', commentThreadRoutes);

// Report routes
router.use('/reports', reportRoutes);

// Template routes
router.use('/templates', templateRoutes);

// Upload routes
router.use('/upload', uploadRoutes);

// Role routes (RBAC admin)
router.use('/roles', roleRoutes);

// Search routes
router.use('/search', searchRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
