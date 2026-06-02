import pool from '../config/database';

interface ProjectComment {
  id: number;
  project_id: number;
  section_type: string;
  section_identifier?: string;
  comment: string;
  created_by?: number;
  resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

class ProjectCommentModel {
  static async create(data: {
    project_id: number;
    section_type: string;
    section_identifier?: string;
    comment: string;
    created_by: number;
  }): Promise<ProjectComment> {
    const result = await pool.query(
      `INSERT INTO project_comments (project_id, section_type, section_identifier, comment, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.project_id, data.section_type, data.section_identifier || null, data.comment, data.created_by]
    );
    return result.rows[0];
  }

  static async findByProject(projectId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT pc.*, u.name as created_by_name, u.role as created_by_role,
              ru.name as resolved_by_name
       FROM project_comments pc
       LEFT JOIN users u ON pc.created_by = u.id
       LEFT JOIN users ru ON pc.resolved_by = ru.id
       WHERE pc.project_id = $1
       ORDER BY pc.created_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  static async findById(id: number): Promise<ProjectComment | null> {
    const result = await pool.query('SELECT * FROM project_comments WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async update(id: number, comment: string): Promise<ProjectComment> {
    const result = await pool.query(
      `UPDATE project_comments SET comment = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [comment, id]
    );
    return result.rows[0];
  }

  static async resolve(id: number, userId: number): Promise<ProjectComment> {
    const result = await pool.query(
      `UPDATE project_comments SET resolved = TRUE, resolved_by = $1, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [userId, id]
    );
    return result.rows[0];
  }

  static async reopen(id: number): Promise<ProjectComment> {
    const result = await pool.query(
      `UPDATE project_comments SET resolved = FALSE, resolved_by = NULL, resolved_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM project_comments WHERE id = $1', [id]);
  }

  static async countUnresolved(projectId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM project_comments WHERE project_id = $1 AND resolved = FALSE',
      [projectId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}

export default ProjectCommentModel;
