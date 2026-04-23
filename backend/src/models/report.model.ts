import pool from '../config/database';

export interface ReportTemplate {
    id: number;
    name: string;
    description?: string;
    template_data: any;
    logo_path?: string;
    is_default: boolean;
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
        template_data: any;
        logo_path?: string;
        is_default?: boolean;
        created_by: number;
    }): Promise<ReportTemplate> {
        const result = await pool.query(
            `INSERT INTO report_templates (name, description, template_data, logo_path, is_default, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [
                data.name,
                data.description,
                JSON.stringify(data.template_data),
                data.logo_path,
                data.is_default || false,
                data.created_by,
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
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(data.description);
        }
        if (data.template_data !== undefined) {
            updates.push(`template_data = $${paramCount++}`);
            values.push(JSON.stringify(data.template_data));
        }
        if (data.logo_path !== undefined) {
            updates.push(`logo_path = $${paramCount++}`);
            values.push(data.logo_path);
        }
        if (data.is_default !== undefined) {
            updates.push(`is_default = $${paramCount++}`);
            values.push(data.is_default);
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
