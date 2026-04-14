import pool from '../config/database';

export interface FindingTemplate {
  id: number;
  title: string;
  category: string;
  severity: string;
  description: string;
  affected_component?: string;
  likelihood: string;
  impact: string;
  steps_to_reproduce?: string;
  remediation: string;
  reference_links?: string[];
  owasp_category?: string;
  cwe_id?: string;
  cvss_score?: number;
  is_public: boolean;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

class FindingLibraryModel {
  // Get all public templates
  static async getAll(): Promise<FindingTemplate[]> {
    const result = await pool.query(
      'SELECT * FROM finding_library WHERE is_public = true ORDER BY category, severity DESC, title'
    );
    return result.rows;
  }

  // Get templates by category
  static async getByCategory(category: string): Promise<FindingTemplate[]> {
    const result = await pool.query(
      'SELECT * FROM finding_library WHERE category = $1 AND is_public = true ORDER BY severity DESC, title',
      [category]
    );
    return result.rows;
  }

  // Get templates by severity
  static async getBySeverity(severity: string): Promise<FindingTemplate[]> {
    const result = await pool.query(
      'SELECT * FROM finding_library WHERE severity = $1 AND is_public = true ORDER BY category, title',
      [severity]
    );
    return result.rows;
  }

  // Get template by ID
  static async getById(id: number): Promise<FindingTemplate | null> {
    const result = await pool.query(
      'SELECT * FROM finding_library WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // Search templates
  static async search(query: string): Promise<FindingTemplate[]> {
    const result = await pool.query(
      `SELECT * FROM finding_library 
       WHERE is_public = true 
       AND (
         title ILIKE $1 
         OR description ILIKE $1 
         OR category ILIKE $1
         OR owasp_category ILIKE $1
         OR cwe_id ILIKE $1
       )
       ORDER BY category, severity DESC, title`,
      [`%${query}%`]
    );
    return result.rows;
  }

  // Get all categories
  static async getCategories(): Promise<string[]> {
    const result = await pool.query(
      'SELECT DISTINCT category FROM finding_library WHERE is_public = true ORDER BY category'
    );
    return result.rows.map(row => row.category);
  }

  // Create custom template
  static async create(data: {
    title: string;
    category: string;
    severity: string;
    description: string;
    affected_component?: string;
    likelihood: string;
    impact: string;
    steps_to_reproduce?: string;
    remediation: string;
    reference_links?: string[];
    owasp_category?: string;
    cwe_id?: string;
    cvss_score?: number;
    is_public?: boolean;
    created_by: number;
  }): Promise<FindingTemplate> {
    const {
      title,
      category,
      severity,
      description,
      affected_component,
      likelihood,
      impact,
      steps_to_reproduce,
      remediation,
      reference_links,
      owasp_category,
      cwe_id,
      cvss_score,
      is_public = false,
      created_by,
    } = data;

    const result = await pool.query(
      `INSERT INTO finding_library (
        title, category, severity, description, affected_component,
        likelihood, impact, steps_to_reproduce, remediation, reference_links,
        owasp_category, cwe_id, cvss_score, is_public, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        title, category, severity, description, affected_component,
        likelihood, impact, steps_to_reproduce, remediation, reference_links,
        owasp_category, cwe_id, cvss_score, is_public, created_by
      ]
    );

    return result.rows[0];
  }

  // Update template
  static async update(id: number, data: Partial<FindingTemplate>): Promise<FindingTemplate | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE finding_library SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  // Delete template
  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM finding_library WHERE id = $1 AND is_public = false RETURNING id',
      [id]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Get user's custom templates
  static async getByUser(userId: number): Promise<FindingTemplate[]> {
    const result = await pool.query(
      'SELECT * FROM finding_library WHERE created_by = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  // Clone template to create a finding
  static async cloneToFinding(templateId: number, projectId: number, userId: number): Promise<any> {
    const template = await this.getById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const result = await pool.query(
      `INSERT INTO findings (
        title, severity, description, affected_url, likelihood, impact,
        steps_to_reproduce, remediation, reference_links, project_id, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
      RETURNING *`,
      [
        template.title,
        template.severity,
        template.description,
        template.affected_component || '',
        template.likelihood,
        template.impact,
        template.steps_to_reproduce || '',
        template.remediation,
        template.reference_links || [],
        projectId,
        userId
      ]
    );

    return result.rows[0];
  }
}

export default FindingLibraryModel;
