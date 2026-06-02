import { Router } from 'express';
import CommentThreadController from '../controllers/comment-thread.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';

const router = Router();

router.use(protect);

router.post('/', authorize(Permissions.CREATE_COMMENTS), CommentThreadController.createThread);

router.get('/', authorize(Permissions.VIEW_COMMENTS), CommentThreadController.getThreads);

router.delete('/:id', authorize(Permissions.DELETE_COMMENTS), CommentThreadController.deleteThread);

router.patch('/:id/resolve', authorize(Permissions.CREATE_COMMENTS), CommentThreadController.resolveThread);

router.patch('/:id/reopen', authorize(Permissions.APPROVE_FINDINGS), CommentThreadController.reopenThread);

router.get('/:threadId/replies', authorize(Permissions.VIEW_COMMENTS), CommentThreadController.getReplies);

router.post('/:threadId/replies', authorize(Permissions.CREATE_COMMENTS), CommentThreadController.addReply);

router.delete('/replies/:replyId', authorize(Permissions.DELETE_COMMENTS), CommentThreadController.deleteReply);

export default router;
