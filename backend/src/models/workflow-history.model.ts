import pool from '../config/database';

interface WorkflowHistoryEntry {
  id: number;
  project_id: number;
  from_status?: string;
  to_status: string;
  action: string;
  performed_by: number;
  performed_by_name?: string;
  performed_by_role?: string;
  created_at: string;
}

class WorkflowHistoryModel {
  static async create(data: {
    project_id: number;
    from_status?: string;
    to_status: string;
    action: string;
    performed_by: number;
  }): Promise<WorkflowHistoryEntry> {
    const result = await pool.query(
      `INSERT INTO workflow_history (project_id, from_status, to_status, action, performed_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.project_id, data.from_status || null, data.to_status, data.action, data.performed_by]
    );
    return result.rows[0];
  }

  static async findByProject(projectId: number): Promise<WorkflowHistoryEntry[]> {
    const result = await pool.query(
      `SELECT wh.*, u.name as performed_by_name, u.role as performed_by_role
       FROM workflow_history wh
       LEFT JOIN users u ON wh.performed_by = u.id
       WHERE wh.project_id = $1
       ORDER BY wh.created_at ASC`,
      [projectId]
    );
    return result.rows;
  }
}

export default WorkflowHistoryModel;
