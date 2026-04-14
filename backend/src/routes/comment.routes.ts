import { Router } from 'express';
import CommentController from '../controllers/comment.controller';
import { protect, requireRole } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Create comment - Only Reviewers and Managers can add comments
router.post('/', requireRole('reviewer', 'manager'), apiLimiter, CommentController.createComment);

// Get comments for a finding - All can view
router.get('/finding/:finding_id', apiLimiter, CommentController.getCommentsByFinding);

// Update comment - Only comment author or manager
router.put('/:id', apiLimiter, CommentController.updateComment);

// Delete comment - Only comment author or manager
router.delete('/:id', apiLimiter, CommentController.deleteComment);

export default router;
