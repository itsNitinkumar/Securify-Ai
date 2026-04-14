import pool from '../config/database';

export interface TemplateSection {
  type: string;
  title: string;
  enabled: boolean;
  content?: string;
}

export interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  is_default: boolean;
  sections: TemplateSection[];
  company_name?: string;
  company_logo_url?: string;
  header_text?: string;
  footer_text?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

class TemplateModel {
  // Create new template
  static async create(data: {
    name: string;
    description?: string;
    is_default?: boolean;
    sections: TemplateSection[];
    company_name?: string;
    company_logo_url?: string;
    header_text?: string;
    footer_text?: string;
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
    created_by: number;
  }): Promise<ReportTemplate> {
    const {
      name,
      description,
      is_default = false,
      sections,
      company_name,
      company_logo_url,
      header_text,
      footer_text,
      primary_color,
      secondary_color,
      font_family,
      created_by,
    } = data;

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE report_templates SET is_default = false');
    }

    const result = await pool.query(
      `INSERT INTO report_templates (
        name, description, is_default, sections, company_name, company_logo_url,
        header_text, footer_text, primary_color, secondary_color, font_family, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        name,
        description,
        is_default,
        JSON.stringify(sections),
        company_name,
        company_logo_url,
        header_text,
        footer_text,
        primary_color,
        secondary_color,
        font_family,
        created_by,
      ]
    );

    return result.rows[0];
  }

  // Get all templates
  static async getAll(): Promise<ReportTemplate[]> {
    const result = await pool.query(
      'SELECT * FROM report_templates ORDER BY is_default DESC, created_at DESC'
    );
    return result.rows;
  }

  // Get template by ID
  static async getById(id: number): Promise<ReportTemplate | null> {
    const result = await pool.query(
      'SELECT * FROM report_templates WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // Get default template
  static async getDefault(): Promise<ReportTemplate | null> {
    const result = await pool.query(
      'SELECT * FROM report_templates WHERE is_default = true LIMIT 1'
    );
    return result.rows[0] || null;
  }

  // Update template
  static async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      is_default: boolean;
      sections: TemplateSection[];
      company_name: string;
      company_logo_url: string;
      header_text: string;
      footer_text: string;
      primary_color: string;
      secondary_color: string;
      font_family: string;
    }>
  ): Promise<ReportTemplate | null> {
    // If setting as default, unset other defaults
    if (data.is_default) {
      await pool.query('UPDATE report_templates SET is_default = false WHERE id != $1', [id]);
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(key === 'sections' ? JSON.stringify(value) : value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE report_templates SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  // Delete template
  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM report_templates WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Get templates by user
  static async getByUser(userId: number): Promise<ReportTemplate[]> {
    const result = await pool.query(
      'SELECT * FROM report_templates WHERE created_by = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }
}

export default TemplateModel;
