import { Router } from 'express';
import CommentController from '../controllers/comment.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Create comment
router.post('/', authorize(Permissions.CREATE_COMMENTS), apiLimiter, CommentController.createComment);

// Get comments for a finding - All can view
router.get('/finding/:finding_id', authorize(Permissions.VIEW_COMMENTS), apiLimiter, CommentController.getCommentsByFinding);

// Update comment - Only comment author or manager
router.put('/:id', authorize(Permissions.CREATE_COMMENTS), apiLimiter, CommentController.updateComment);

// Delete comment - Only comment author or manager
router.delete('/:id', authorize(Permissions.DELETE_COMMENTS), apiLimiter, CommentController.deleteComment);

export default router;
