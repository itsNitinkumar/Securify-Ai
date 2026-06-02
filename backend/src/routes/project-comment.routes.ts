import { Router } from 'express';
import ProjectCommentController from '../controllers/project-comment.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';

const router = Router();

router.use(protect);

// Create comment on a project (requires create_comments)
router.post('/:projectId/comments', authorize(Permissions.CREATE_COMMENTS), ProjectCommentController.createComment);

// Get comments for a project
router.get('/:projectId/comments', authorize(Permissions.VIEW_COMMENTS), ProjectCommentController.getComments);

// Update comment
router.put('/comments/:id', authorize(Permissions.CREATE_COMMENTS), ProjectCommentController.updateComment);

// Delete comment
router.delete('/comments/:id', authorize(Permissions.DELETE_COMMENTS), ProjectCommentController.deleteComment);

// Resolve comment (Reporter)
router.patch('/comments/:id/resolve', authorize(Permissions.CREATE_COMMENTS), ProjectCommentController.resolveComment);

// Reopen comment (Manager/Admin)
router.patch('/comments/:id/reopen', authorize(Permissions.APPROVE_FINDINGS), ProjectCommentController.reopenComment);

export default router;
