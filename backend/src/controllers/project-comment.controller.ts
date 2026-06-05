import { Request, Response } from 'express';
import ProjectCommentModel from '../models/project-comment.model';
import ProjectModel from '../models/project.model';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

const toId = (raw: any): number => {
  const val = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(val, 10);
};

class ProjectCommentController {
  // Create a project comment
  static createComment = asyncHandler(async (req: Request, res: Response) => {
    const projectId = toId(req.params.projectId);
    const { section_type, section_identifier, comment } = req.body;
    const user = (req as any).user;

    if (!projectId || !section_type || !comment) {
      throw new ApiError(400, 'Project ID, section type, and comment are required');
    }

    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    const newComment = await ProjectCommentModel.create({
      project_id: projectId,
      section_type,
      section_identifier: section_identifier || null,
      comment,
      created_by: user.id,
    });
    res.status(201).json({ success: true, data: newComment });
  });

  // Get comments for a project
  static getComments = asyncHandler(async (req: Request, res: Response) => {
    const projectId = toId(req.params.projectId);

    if (isNaN(projectId)) {
      throw new ApiError(400, 'Invalid project ID');
    }

    const comments = await ProjectCommentModel.findByProject(projectId);
    res.json({ success: true, data: comments });
  });

  // Update comment
  static updateComment = asyncHandler(async (req: Request, res: Response) => {
    const id = toId(req.params.id);
    const { comment } = req.body;
    const user = (req as any).user;

    if (isNaN(id)) throw new ApiError(400, 'Invalid comment ID');
    if (!comment) throw new ApiError(400, 'Comment text is required');

    const existingComment = await ProjectCommentModel.findById(id);
    if (!existingComment) throw new ApiError(404, 'Comment not found');

    const permissions = (req as any).permissions || [];
    const canManageAll = permissions.includes('manage_roles') || permissions.includes('approve_findings');

    if (existingComment.created_by !== user.id && !canManageAll) {
      throw new ApiError(403, 'You can only edit your own comments');
    }

    const updated = await ProjectCommentModel.update(id, comment);
    res.json({ success: true, data: updated });
  });

  // Delete comment
  static deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const id = toId(req.params.id);
    const user = (req as any).user;

    if (isNaN(id)) throw new ApiError(400, 'Invalid comment ID');

    const existingComment = await ProjectCommentModel.findById(id);
    if (!existingComment) throw new ApiError(404, 'Comment not found');

    const permissions = (req as any).permissions || [];
    const canManageAll = permissions.includes('manage_roles') || permissions.includes('approve_findings');

    if (existingComment.created_by !== user.id && !canManageAll) {
      throw new ApiError(403, 'You can only delete your own comments');
    }

    await ProjectCommentModel.delete(id);
    res.json({ success: true, message: 'Comment deleted' });
  });

  // Resolve comment (Reporter)
  static resolveComment = asyncHandler(async (req: Request, res: Response) => {
    const id = toId(req.params.id);
    const user = (req as any).user;

    if (isNaN(id)) throw new ApiError(400, 'Invalid comment ID');

    const existingComment = await ProjectCommentModel.findById(id);
    if (!existingComment) throw new ApiError(404, 'Comment not found');

    const updated = await ProjectCommentModel.resolve(id, user.id);
    res.json({ success: true, data: updated });
  });

  // Reopen comment (Manager/Admin)
  static reopenComment = asyncHandler(async (req: Request, res: Response) => {
    const id = toId(req.params.id);

    if (isNaN(id)) throw new ApiError(400, 'Invalid comment ID');

    const existingComment = await ProjectCommentModel.findById(id);
    if (!existingComment) throw new ApiError(404, 'Comment not found');

    const updated = await ProjectCommentModel.reopen(id);
    res.json({ success: true, data: updated });
  });
}

export default ProjectCommentController;
