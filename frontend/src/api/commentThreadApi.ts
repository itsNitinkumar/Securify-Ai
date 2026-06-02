import axiosInstance from './axios';
import { ApiResponse } from '../types';

export interface CommentThread {
  id: number;
  project_id: number;
  finding_id?: number;
  section_type: string;
  section_key: string;
  status: 'OPEN' | 'RESOLVED' | 'REOPENED';
  created_by: number;
  created_by_name?: string;
  created_by_role?: string;
  created_at: string;
  reply_count?: number;
}

export interface ThreadReply {
  id: number;
  thread_id: number;
  user_id: number;
  user_name?: string;
  user_role?: string;
  message: string;
  created_at: string;
  updated_at?: string;
}

export const commentThreadApi = {
  getThreads: (params: { projectId: number; findingId?: number; sectionType?: string; sectionKey?: string }) => {
    const query = new URLSearchParams();
    query.set('project_id', String(params.projectId));
    if (params.findingId) query.set('finding_id', String(params.findingId));
    if (params.sectionType) query.set('section_type', params.sectionType);
    if (params.sectionKey) query.set('section_key', params.sectionKey);
    return axiosInstance.get<ApiResponse<CommentThread[]>>(`/comment-threads?${query.toString()}`);
  },

  createThread: (data: {
    project_id: number;
    finding_id?: number;
    section_type: string;
    section_key: string;
    message: string;
  }) => axiosInstance.post<ApiResponse<CommentThread>>('/comment-threads', data),

  deleteThread: (id: number) =>
    axiosInstance.delete<ApiResponse>(`/comment-threads/${id}`),

  resolveThread: (id: number) =>
    axiosInstance.patch<ApiResponse<CommentThread>>(`/comment-threads/${id}/resolve`),

  reopenThread: (id: number) =>
    axiosInstance.patch<ApiResponse<CommentThread>>(`/comment-threads/${id}/reopen`),

  getReplies: (threadId: number) =>
    axiosInstance.get<ApiResponse<ThreadReply[]>>(`/comment-threads/${threadId}/replies`),

  addReply: (threadId: number, message: string) =>
    axiosInstance.post<ApiResponse<ThreadReply>>(`/comment-threads/${threadId}/replies`, { message }),

  deleteReply: (replyId: number) =>
    axiosInstance.delete<ApiResponse>(`/comment-threads/replies/${replyId}`),
};
