import pool from '../config/database';

interface Project {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

class ProjectModel {
  static async create(data: Partial<Project>): Promise<Project> {
    const result = await pool.query(
      `INSERT INTO projects (name, description, client_name, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.description, data.client_name, data.created_by]
    );
    return result.rows[0];
  }

  static async findById(id: number): Promise<Project | null> {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(): Promise<Project[]> {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    return result.rows;
  }

  static async update(id: number, data: Partial<Project>): Promise<Project> {
    const result = await pool.query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        client_name = COALESCE($3, client_name),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [data.name, data.description, data.client_name, id]
    );
    return result.rows[0];
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  }

  static async getProjectWithFindings(id: number): Promise<any> {
    const result = await pool.query(
      `SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', f.id,
            'title', f.title,
            'severity', f.severity,
            'status', f.status,
            'created_at', f.created_at
          ) ORDER BY f.severity, f.created_at
        ) FILTER (WHERE f.id IS NOT NULL) as findings
       FROM projects p
       LEFT JOIN findings f ON p.id = f.project_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    return result.rows[0] || null;
  }
}

export default ProjectModel;
