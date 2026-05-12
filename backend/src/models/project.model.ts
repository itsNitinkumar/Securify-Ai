import pool from '../config/database';

interface Project {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  client_id?: number;
  start_date?: string; // DATE in DB
  end_date?: string; // DATE in DB
  application_details?: Array<{ name: string; url: string }>;
  user_roles?: Array<{ role: string; username: string }>;
  template_id?: number;
  template_name?: string;
  out_of_scope_endpoints?: Array<{ name: string; url: string }>;
  include_out_of_scope_endpoints?: boolean;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

class ProjectModel {
  static async create(data: Partial<Project>): Promise<Project> {
    const result = await pool.query(
       `INSERT INTO projects (
         name,
         description,
         client_name,
         client_id,
         start_date,
         end_date,
         application_details,
         user_roles,
         template_id,
         template_name,
         out_of_scope_endpoints,
         include_out_of_scope_endpoints,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
       [
         data.name,
         data.description,
         data.client_name,
         data.client_id ?? null,
         data.start_date ?? null,
         data.end_date ?? null,
         data.application_details ? JSON.stringify(data.application_details) : null,
         data.user_roles ? JSON.stringify(data.user_roles) : null,
         data.template_id ?? null,
         data.template_name ?? null,
         data.out_of_scope_endpoints ? JSON.stringify(data.out_of_scope_endpoints) : null,
         data.include_out_of_scope_endpoints ?? false,
         data.created_by,
       ]
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
    const updates: string[] = [];
    const values: any[] = [];
    let param = 1;

    const set = (field: string, value: any) => {
      updates.push(`${field} = $${param++}`);
      values.push(value);
    };

if (data.name !== undefined) set('name', data.name);
      if (data.description !== undefined) set('description', data.description);
      if (data.client_name !== undefined) set('client_name', data.client_name);
      if (data.client_id !== undefined) set('client_id', data.client_id);
      if (data.start_date !== undefined) set('start_date', data.start_date);
      if (data.end_date !== undefined) set('end_date', data.end_date);
      if (data.application_details !== undefined) set('application_details', data.application_details ? JSON.stringify(data.application_details) : null);
      if (data.user_roles !== undefined) set('user_roles', data.user_roles ? JSON.stringify(data.user_roles) : null);
      if (data.template_id !== undefined) set('template_id', data.template_id);
      if (data.template_name !== undefined) set('template_name', data.template_name);
      if (data.out_of_scope_endpoints !== undefined) set('out_of_scope_endpoints', data.out_of_scope_endpoints ? JSON.stringify(data.out_of_scope_endpoints) : null);
      if (data.include_out_of_scope_endpoints !== undefined) set('include_out_of_scope_endpoints', data.include_out_of_scope_endpoints);

    // Always bump updated_at on any update call.
    updates.push('updated_at = CURRENT_TIMESTAMP');

    values.push(id);
    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${param} RETURNING *`,
      values
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
