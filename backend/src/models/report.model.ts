import pool from '../config/database';

export interface ReportTemplate {
    id: number;
    name: string;
    description?: string;
    template_data: any;
    logo_path?: string;
    is_default: boolean;
    confidentiality_text?: string;
    introduction_text?: string;
    approach_text?: string;
    scope_text?: string;
    scope_applications?: any[];
    scope_user_roles?: any[];
    scope_tools?: any[];
    appendix_text?: string;
    highlight_color?: string;
    created_by?: number;
    created_at: Date;
    updated_at: Date;
}

export interface GeneratedReport {
    id: number;
    project_id: number;
    template_id?: number;
    report_name: string;
    file_path?: string;
    file_type: 'docx' | 'pdf';
    google_drive_id?: string;
    generated_by?: number;
    created_at: Date;
}

class ReportModel {
    // Template Management
    static async createTemplate(data: {
        name: string;
        description?: string;
        template_data?: any;
        logo_path?: string;
        is_default?: boolean;
        confidentiality_text?: string;
        introduction_text?: string;
        approach_text?: string;
        scope_text?: string;
        scope_applications?: any[];
        scope_user_roles?: any[];
        scope_tools?: any[];
        appendix_text?: string;
        highlight_color?: string;
        created_by: number;
    }): Promise<ReportTemplate> {
        const result = await pool.query(
            `INSERT INTO report_templates (
                name, description, template_data, logo_path, is_default, created_by,
                confidentiality_text, introduction_text, approach_text, scope_text,
                scope_applications, scope_user_roles, scope_tools, appendix_text, highlight_color
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                data.name,
                data.description,
                data.template_data ? JSON.stringify(data.template_data) : null,
                data.logo_path,
                data.is_default || false,
                data.created_by,
                data.confidentiality_text,
                data.introduction_text,
                data.approach_text,
                data.scope_text,
                data.scope_applications ? JSON.stringify(data.scope_applications) : null,
                data.scope_user_roles ? JSON.stringify(data.scope_user_roles) : null,
                data.scope_tools ? JSON.stringify(data.scope_tools) : null,
                data.appendix_text,
                data.highlight_color || '#ffff00',
            ]
        );
        return result.rows[0];
    }

    static async getAllTemplates(): Promise<ReportTemplate[]> {
        const result = await pool.query(
            'SELECT * FROM report_templates ORDER BY is_default DESC, created_at DESC'
        );
        return result.rows;
    }

    static async getTemplateById(id: number): Promise<ReportTemplate | null> {
        const result = await pool.query(
            'SELECT * FROM report_templates WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    static async getDefaultTemplate(): Promise<ReportTemplate | null> {
        const result = await pool.query(
            'SELECT * FROM report_templates WHERE is_default = true LIMIT 1'
        );
        return result.rows[0] || null;
    }

    static async updateTemplate(
        id: number,
        data: Partial<ReportTemplate>
    ): Promise<ReportTemplate | null> {
        // If setting is_default to true, first remove default from all other templates
        if (data.is_default === true) {
            await pool.query('UPDATE report_templates SET is_default = false WHERE id != $1', [id]);
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        const fields = [
            'name', 'description', 'template_data', 'logo_path', 'is_default',
            'confidentiality_text', 'introduction_text', 'approach_text', 'scope_text',
            'scope_applications', 'scope_user_roles', 'scope_tools', 'appendix_text', 'highlight_color'
        ];

        fields.forEach(field => {
            if (data[field as keyof ReportTemplate] !== undefined) {
                updates.push(`${field} = $${paramCount++}`);
                const value = data[field as keyof ReportTemplate];
                if (typeof value === 'object' && value !== null) {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
            }
        });

        if (updates.length === 0) {
            return await this.getTemplateById(id);
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
            `UPDATE report_templates SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    static async deleteTemplate(id: number): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM report_templates WHERE id = $1',
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    }

    // Generated Reports
    static async createReport(data: {
        project_id: number;
        template_id?: number;
        report_name: string;
        file_path?: string;
        file_type: 'docx' | 'pdf';
        google_drive_id?: string;
        generated_by: number;
    }): Promise<GeneratedReport> {
        const result = await pool.query(
            `INSERT INTO generated_reports (project_id, template_id, report_name, file_path, file_type, google_drive_id, generated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [
                data.project_id,
                data.template_id,
                data.report_name,
                data.file_path,
                data.file_type,
                data.google_drive_id,
                data.generated_by,
            ]
        );
        return result.rows[0];
    }

    static async getReportsByProject(projectId: number): Promise<GeneratedReport[]> {
        const result = await pool.query(
            'SELECT * FROM generated_reports WHERE project_id = $1 ORDER BY created_at DESC',
            [projectId]
        );
        return result.rows;
    }

    static async getReportById(id: number): Promise<GeneratedReport | null> {
        const result = await pool.query(
            'SELECT * FROM generated_reports WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    static async deleteReport(id: number): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM generated_reports WHERE id = $1',
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    }
}

export default ReportModel;
