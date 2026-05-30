import { Request, Response } from 'express';
import CommentModel from '../models/comment.model';
import FindingModel from '../models/finding.model';
import ActivityLogService from '../services/activity-log.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

class CommentController {
  // Create comment
  static createComment = asyncHandler(async (req: Request, res: Response) => {
    const { finding_id, comment } = req.body;
    const user = (req as any).user;

    if (!finding_id || !comment) {
      throw new ApiError(400, 'Finding ID and comment are required');
    }

    // Check if finding exists
    const finding = await FindingModel.findById(finding_id);
    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Create comment
    const newComment = await CommentModel.create(finding_id, user.id, comment);

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'ADD_COMMENT',
      entity_type: 'finding',
      entity_id: finding_id,
      details: { comment: comment.substring(0, 100) },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: newComment,
    });
  });

  // Get comments for a finding
  static getCommentsByFinding = asyncHandler(async (req: Request, res: Response) => {
    const findingId = parseInt(req.params.finding_id as string);

    if (isNaN(findingId)) {
      throw new ApiError(400, 'Invalid finding ID');
    }

    const comments = await CommentModel.findByFinding(findingId);

    res.json({
      success: true,
      data: comments,
    });
  });

  // Update comment
  static updateComment = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const { comment } = req.body;
    const user = (req as any).user;

    if (isNaN(id)) {
      throw new ApiError(400, 'Invalid comment ID');
    }

    if (!comment) {
      throw new ApiError(400, 'Comment text is required');
    }

    // Check if comment exists
    const existingComment = await CommentModel.findById(id);
    if (!existingComment) {
      throw new ApiError(404, 'Comment not found');
    }

    const permissions = (req as any).permissions || [];
    const canManageAll = permissions.includes('manage_roles') || permissions.includes('approve_findings');

    if (existingComment.user_id !== user.id && !canManageAll) {
      throw new ApiError(403, 'You can only edit your own comments');
    }

    const updatedComment = await CommentModel.update(id, comment);

    res.json({
      success: true,
      data: updatedComment,
    });
  });

  // Delete comment
  static deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const user = (req as any).user;

    if (isNaN(id)) {
      throw new ApiError(400, 'Invalid comment ID');
    }

    // Check if comment exists
    const existingComment = await CommentModel.findById(id);
    if (!existingComment) {
      throw new ApiError(404, 'Comment not found');
    }

    const permissions = (req as any).permissions || [];
    const canManageAll = permissions.includes('manage_roles') || permissions.includes('approve_findings');

    if (existingComment.user_id !== user.id && !canManageAll) {
      throw new ApiError(403, 'You can only delete your own comments');
    }

    await CommentModel.delete(id);

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  });
}

export default CommentController;
