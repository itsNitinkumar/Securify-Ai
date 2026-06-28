import pool from '../config/database';

interface Project {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  client_id?: number;
  company_id?: number;
  assigned_reporter_id?: number;
  start_date?: string;
  end_date?: string;
  application_details?: Array<{ name: string; url: string }>;
  user_roles?: Array<{ role: string; username: string }>;
  domains?: string[];
  template_id?: number;
  template_name?: string;
  out_of_scope_endpoints?: Array<{ name: string; url: string }>;
  include_out_of_scope_endpoints?: boolean;
  created_by?: number;
  status?: string;
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
         company_id,
         assigned_reporter_id,
         start_date,
         end_date,
         application_details,
         user_roles,
         domains,
         template_id,
         template_name,
         out_of_scope_endpoints,
         include_out_of_scope_endpoints,
         created_by,
         status
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
       [
         data.name,
         data.description,
         data.client_name,
         data.client_id ?? null,
         data.company_id ?? null,
         data.assigned_reporter_id ?? null,
         data.start_date ?? null,
         data.end_date ?? null,
         data.application_details ? JSON.stringify(data.application_details) : null,
         data.user_roles ? JSON.stringify(data.user_roles) : null,
         data.domains ? JSON.stringify(data.domains) : null,
         data.template_id ?? null,
         data.template_name ?? null,
         data.out_of_scope_endpoints ? JSON.stringify(data.out_of_scope_endpoints) : null,
         data.include_out_of_scope_endpoints ?? false,
         data.created_by,
         data.status || 'draft',
        ]
      );
    return result.rows[0];
  }

  static async findById(id: number): Promise<Project | null> {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(filters?: {
    client_id?: number;
    status?: string;
    assigned_reporter_id?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<Project[]> {
    let query = `SELECT p.*, u.name as assigned_reporter_name,
      (SELECT COUNT(*) FROM findings f WHERE f.project_id = p.id) as findings_count
      FROM projects p LEFT JOIN users u ON p.assigned_reporter_id = u.id WHERE 1=1`;
    const params: any[] = [];
    let param = 1;

    if (filters?.client_id) {
      query += ` AND p.client_id = $${param++}`;
      params.push(filters.client_id);
    }

    if (filters?.status) {
      query += ` AND p.status = $${param++}`;
      params.push(filters.status);
    }

    if (filters?.assigned_reporter_id) {
      query += ` AND p.assigned_reporter_id = $${param++}`;
      params.push(filters.assigned_reporter_id);
    }

    if (filters?.start_date) {
      query += ` AND p.start_date >= $${param++}`;
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      query += ` AND p.end_date <= $${param++}`;
      params.push(filters.end_date);
    }

    if (filters?.search) {
      query += ` AND (p.name ILIKE $${param} OR p.description ILIKE $${param} OR p.client_name ILIKE $${param})`;
      params.push(`%${filters.search}%`);
      param++;
    }

    query += ' ORDER BY p.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findByReporter(userId: number): Promise<Project[]> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE assigned_reporter_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async findByCompany(companyId: number): Promise<Project[]> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
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
      if (data.company_id !== undefined) set('company_id', data.company_id);
      if (data.assigned_reporter_id !== undefined) set('assigned_reporter_id', data.assigned_reporter_id);
      if (data.start_date !== undefined) set('start_date', data.start_date);
      if (data.end_date !== undefined) set('end_date', data.end_date);
      if (data.application_details !== undefined) set('application_details', data.application_details ? JSON.stringify(data.application_details) : null);
      if (data.user_roles !== undefined) set('user_roles', data.user_roles ? JSON.stringify(data.user_roles) : null);
      if (data.domains !== undefined) set('domains', data.domains ? JSON.stringify(data.domains) : null);
      if (data.template_id !== undefined) set('template_id', data.template_id);
      if (data.template_name !== undefined) set('template_name', data.template_name);
      if (data.out_of_scope_endpoints !== undefined) set('out_of_scope_endpoints', data.out_of_scope_endpoints ? JSON.stringify(data.out_of_scope_endpoints) : null);
      if (data.include_out_of_scope_endpoints !== undefined) set('include_out_of_scope_endpoints', data.include_out_of_scope_endpoints);
      if (data.status !== undefined) set('status', data.status);

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
        u.name AS assigned_reporter_name,
        u.email AS assigned_reporter_email,
        json_agg(
          json_build_object(
            'id', f.id,
            'title', f.title,
            'severity', f.severity,
            'status', f.status,
            'finding_type', f.finding_type,
            'validation_status', f.validation_status,
            'created_at', f.created_at
          ) ORDER BY f.severity, f.created_at
        ) FILTER (WHERE f.id IS NOT NULL) as findings
       FROM projects p
       LEFT JOIN findings f ON p.id = f.project_id
       LEFT JOIN users u ON p.assigned_reporter_id = u.id
       WHERE p.id = $1
       GROUP BY p.id, u.name, u.email`,
      [id]
    );
    return result.rows[0] || null;
  }
}

export default ProjectModel;
