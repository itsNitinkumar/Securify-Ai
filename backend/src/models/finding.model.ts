import pool from '../config/database';

interface Finding {
  id: number;
  project_id: number;
  title: string;
  severity: string;
  description: string;
  affected_target?: string;
  likelihood?: string;
  impact?: string;
  steps_to_reproduce?: any;
  proof_of_concept?: string;
  remediation?: string;
  references?: any;
  tags?: any;
  status: string;
  created_by?: number;
  approved_by?: number;
  reviewed_by?: number;
  created_at: Date;
  updated_at: Date;
}

class FindingModel {
  static async create(data: Partial<Finding>): Promise<Finding> {
    const result = await pool.query(
      `INSERT INTO findings (
        project_id, title, severity, description, affected_target,
        likelihood, impact, steps_to_reproduce, proof_of_concept,
        remediation, finding_references, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.project_id,
        data.title,
        data.severity,
        data.description,
        data.affected_target,
        data.likelihood,
        data.impact,
        JSON.stringify(data.steps_to_reproduce),
        data.proof_of_concept,
        data.remediation,
        JSON.stringify(data.references),
        JSON.stringify(data.tags),
        data.created_by,
      ]
    );
    return result.rows[0];
  }

  static async findById(id: number): Promise<Finding | null> {
    const result = await pool.query('SELECT * FROM findings WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(filters: any = {}): Promise<Finding[]> {
    let query = 'SELECT * FROM findings WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.severity) {
      query += ` AND severity = $${paramIndex}`;
      params.push(filters.severity);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.project_id) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(filters.project_id);
      paramIndex++;
    }

    if (filters.created_by) {
      query += ` AND created_by = $${paramIndex}`;
      params.push(filters.created_by);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async update(id: number, data: Partial<Finding>): Promise<Finding> {
    const result = await pool.query(
      `UPDATE findings SET
        title = COALESCE($1, title),
        severity = COALESCE($2, severity),
        description = COALESCE($3, description),
        affected_target = COALESCE($4, affected_target),
        likelihood = COALESCE($5, likelihood),
        impact = COALESCE($6, impact),
        steps_to_reproduce = COALESCE($7, steps_to_reproduce),
        proof_of_concept = COALESCE($8, proof_of_concept),
        remediation = COALESCE($9, remediation),
        finding_references = COALESCE($10, finding_references),
        tags = COALESCE($11, tags),
        status = COALESCE($12, status),
        approved_by = COALESCE($13, approved_by),
        reviewed_by = COALESCE($14, reviewed_by),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        data.title,
        data.severity,
        data.description,
        data.affected_target,
        data.likelihood,
        data.impact,
        data.steps_to_reproduce ? JSON.stringify(data.steps_to_reproduce) : null,
        data.proof_of_concept,
        data.remediation,
        data.references ? JSON.stringify(data.references) : null,
        data.tags ? JSON.stringify(data.tags) : null,
        data.status,
        data.approved_by,
        data.reviewed_by,
        id,
      ]
    );
    return result.rows[0];
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM findings WHERE id = $1', [id]);
  }
}

export default FindingModel;
