import { Request, Response } from 'express';
import CommentThreadModel from '../models/comment-thread.model';
import ProjectModel from '../models/project.model';
import FindingModel from '../models/finding.model';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

const toId = (raw: any): number => {
  const val = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(val, 10);
};

class CommentThreadController {
  static createThread = asyncHandler(async (req: Request, res: Response) => {
    const { project_id, finding_id, section_type, section_key, message } = req.body;
    const user = (req as any).user;

    if (!project_id || !section_type || !section_key || !message) {
      throw new ApiError(400, 'project_id, section_type, section_key, and message are required');
    }

    const project = await ProjectModel.findById(project_id);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    if (finding_id) {
      const finding = await FindingModel.findById(finding_id);
      if (!finding) {
        throw new ApiError(404, 'Finding not found');
      }
    }

    const existingThread = await CommentThreadModel.findExistingThread({
      project_id,
      finding_id: finding_id || undefined,
      section_type,
      section_key,
    });

    let thread;
    if (existingThread) {
      thread = existingThread;
      if (thread.status === 'RESOLVED') {
        thread = await CommentThreadModel.updateStatus(thread.id, 'REOPENED');
      }
    } else {
      thread = await CommentThreadModel.createThread({
        project_id,
        finding_id: finding_id || undefined,
        section_type,
        section_key,
        created_by: user.id,
      });
    }

    await CommentThreadModel.addReply(thread.id, user.id, message);
    const replies = await CommentThreadModel.getReplies(thread.id);

    // If project is completed, move it to pending_comment_resolution
    if (project.status === 'completed') {
      await ProjectModel.update(project_id, { status: 'pending_comment_resolution' });
    }
    res.status(existingThread ? 200 : 201).json({
      success: true,
      data: { ...thread, replies },
    });
  });

  static getThreads = asyncHandler(async (req: Request, res: Response) => {
    const projectId = toId(req.query.project_id);
    if (isNaN(projectId)) {
      throw new ApiError(400, 'project_id query parameter is required');
    }

    const findingId = req.query.finding_id ? toId(req.query.finding_id) : undefined;
    const sectionType = req.query.section_type as string | undefined;
    const sectionKey = req.query.section_key as string | undefined;

    const threads = await CommentThreadModel.findByProject({
      project_id: projectId,
      finding_id: findingId,
      section_type: sectionType,
      section_key: sectionKey,
    });

    res.json({ success: true, data: threads });
  });

  static deleteThread = asyncHandler(async (req: Request, res: Response) => {
    const id = toId(req.params.id);
    const user = (req as any).user;

    if (isNaN(id)) throw new ApiError(400, 'Invalid thread ID');

    const thread = await CommentThreadModel.findById(id);
    if (!thread) throw new ApiError(404, 'Thread not found');

    const permissions = (req as any).permissions || [];
    const canManageAll = permissions.includes('manage_roles') || permissions.includes('approve_findings');

    if (thread.created_by !== user.id && !canManageAll) {
      throw new ApiError(403, 'You can only delete your own threads');
    }

    await CommentThreadModel.deleteThread(id);
    res.json({ success: true, message: 'Thread deleted' });
  });

  static resolveThread = asyncHandler(async (req: Request, res: Response) => {
    const id = toId(req.params.id);

    if (isNaN(id)) throw new ApiError(400, 'Invalid thread ID');

    const thread = await CommentThreadModel.findById(id);
    if (!thread) throw new ApiError(404, 'Thread not found');

    const updated = await CommentThreadModel.updateStatus(id, 'RESOLVED');
    res.json({ success: true, data: updated });
  });

  static reopenThread = asyncHandler(async (req: Request, res: Response) => {
    const id = toId(req.params.id);

    if (isNaN(id)) throw new ApiError(400, 'Invalid thread ID');

    const thread = await CommentThreadModel.findById(id);
    if (!thread) throw new ApiError(404, 'Thread not found');

    const updated = await CommentThreadModel.updateStatus(id, 'REOPENED');

    res.json({ success: true, data: updated });
  });

  static getReplies = asyncHandler(async (req: Request, res: Response) => {
    const threadId = toId(req.params.threadId);

    if (isNaN(threadId)) throw new ApiError(400, 'Invalid thread ID');

    const thread = await CommentThreadModel.findById(threadId);
    if (!thread) throw new ApiError(404, 'Thread not found');

    const replies = await CommentThreadModel.getReplies(threadId);
    res.json({ success: true, data: replies });
  });

  static addReply = asyncHandler(async (req: Request, res: Response) => {
    const threadId = toId(req.params.threadId);
    const { message } = req.body;
    const user = (req as any).user;

    if (isNaN(threadId)) throw new ApiError(400, 'Invalid thread ID');
    if (!message) throw new ApiError(400, 'Message is required');

    const thread = await CommentThreadModel.findById(threadId);
    if (!thread) throw new ApiError(404, 'Thread not found');

    // If project is completed, move it to pending_comment_resolution
    const project = await ProjectModel.findById(thread.project_id);
    if (project && project.status === 'completed') {
      await ProjectModel.update(thread.project_id, { status: 'pending_comment_resolution' });
    }

    if (thread.status === 'RESOLVED') {
      await CommentThreadModel.updateStatus(threadId, 'REOPENED');
    }

    const reply = await CommentThreadModel.addReply(threadId, user.id, message);
    const enriched = await CommentThreadModel.findReplyById(reply.id);
    res.status(201).json({ success: true, data: enriched || reply });
  });

  static deleteReply = asyncHandler(async (req: Request, res: Response) => {
    const replyId = toId(req.params.replyId);
    const user = (req as any).user;

    if (isNaN(replyId)) throw new ApiError(400, 'Invalid reply ID');

    const reply = await CommentThreadModel.findReplyById(replyId);
    if (!reply) throw new ApiError(404, 'Reply not found');

    const permissions = (req as any).permissions || [];
    const canManageAll = permissions.includes('manage_roles') || permissions.includes('approve_findings');

    if (reply.user_id !== user.id && !canManageAll) {
      throw new ApiError(403, 'You can only delete your own replies');
    }

    await CommentThreadModel.deleteReply(replyId);

    res.json({ success: true, message: 'Reply deleted' });
  });
}

export default CommentThreadController;
