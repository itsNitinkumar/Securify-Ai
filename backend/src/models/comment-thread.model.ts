import pool from '../config/database';

interface CommentThread {
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

interface ThreadReply {
  id: number;
  thread_id: number;
  user_id: number;
  user_name?: string;
  user_role?: string;
  message: string;
  created_at: string;
  updated_at?: string;
}

class CommentThreadModel {
  static async createThread(data: {
    project_id: number;
    finding_id?: number;
    section_type: string;
    section_key: string;
    created_by: number;
  }): Promise<CommentThread> {
    const result = await pool.query(
      `INSERT INTO comment_threads (project_id, finding_id, section_type, section_key, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.project_id, data.finding_id || null, data.section_type, data.section_key, data.created_by]
    );
    return result.rows[0];
  }

  static async findExistingThread(params: {
    project_id: number;
    finding_id?: number;
    section_type: string;
    section_key: string;
  }): Promise<CommentThread | null> {
    const result = await pool.query(
      `SELECT ct.*,
              u.name as created_by_name,
              u.role as created_by_role,
              (SELECT COUNT(*) FROM comment_thread_replies WHERE thread_id = ct.id) as reply_count
       FROM comment_threads ct
       LEFT JOIN users u ON ct.created_by = u.id
       WHERE ct.project_id = $1
         AND (ct.finding_id = $2 OR (ct.finding_id IS NULL AND $2 IS NULL))
         AND ct.section_type = $3
         AND ct.section_key = $4`,
      [params.project_id, params.finding_id || null, params.section_type, params.section_key]
    );
    return result.rows[0] || null;
  }

  static async findByProject(params: {
    project_id: number;
    finding_id?: number;
    section_type?: string;
    section_key?: string;
  }): Promise<CommentThread[]> {
    let query = `SELECT ct.*,
                        u.name as created_by_name,
                        u.role as created_by_role,
                        (SELECT COUNT(*) FROM comment_thread_replies WHERE thread_id = ct.id) as reply_count
                 FROM comment_threads ct
                 LEFT JOIN users u ON ct.created_by = u.id
                 WHERE ct.project_id = $1`;
    const values: any[] = [params.project_id];
    let paramIndex = 2;

    if (params.finding_id !== undefined) {
      query += ` AND (ct.finding_id = $${paramIndex} OR (ct.finding_id IS NULL AND $${paramIndex} IS NULL))`;
      values.push(params.finding_id);
      paramIndex++;
    }

    if (params.section_type) {
      query += ` AND ct.section_type = $${paramIndex}`;
      values.push(params.section_type);
      paramIndex++;
    }

    if (params.section_key) {
      query += ` AND ct.section_key = $${paramIndex}`;
      values.push(params.section_key);
    }

    query += ' ORDER BY ct.created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id: number): Promise<CommentThread | null> {
    const result = await pool.query(
      `SELECT ct.*,
              u.name as created_by_name,
              u.role as created_by_role,
              (SELECT COUNT(*) FROM comment_thread_replies WHERE thread_id = ct.id) as reply_count
       FROM comment_threads ct
       LEFT JOIN users u ON ct.created_by = u.id
       WHERE ct.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async updateStatus(id: number, status: 'OPEN' | 'RESOLVED' | 'REOPENED'): Promise<CommentThread> {
    const result = await pool.query(
      `UPDATE comment_threads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  }

  static async deleteThread(id: number): Promise<void> {
    await pool.query('DELETE FROM comment_threads WHERE id = $1', [id]);
  }

  static async addReply(threadId: number, userId: number, message: string): Promise<ThreadReply> {
    const result = await pool.query(
      `INSERT INTO comment_thread_replies (thread_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [threadId, userId, message]
    );
    return result.rows[0];
  }

  static async getReplies(threadId: number): Promise<ThreadReply[]> {
    const result = await pool.query(
      `SELECT ctr.*, u.name as user_name, u.role as user_role
       FROM comment_thread_replies ctr
       LEFT JOIN users u ON ctr.user_id = u.id
       WHERE ctr.thread_id = $1
       ORDER BY ctr.created_at ASC`,
      [threadId]
    );
    return result.rows;
  }

  static async findReplyById(replyId: number): Promise<ThreadReply | null> {
    const result = await pool.query(
      `SELECT ctr.*, u.name as user_name, u.role as user_role
       FROM comment_thread_replies ctr
       LEFT JOIN users u ON ctr.user_id = u.id
       WHERE ctr.id = $1`,
      [replyId]
    );
    return result.rows[0] || null;
  }

  static async deleteReply(replyId: number): Promise<void> {
    await pool.query('DELETE FROM comment_thread_replies WHERE id = $1', [replyId]);
  }
}

export default CommentThreadModel;
