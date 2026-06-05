import pool from '../config/database';

class DashboardService {
  // Get overall statistics
  static async getOverallStats(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM findings) as total_findings,
        (SELECT COUNT(*) FROM findings WHERE status = 'approved') as approved_findings,
        (SELECT COUNT(*) FROM findings WHERE status = 'pending_review') as pending_findings,
        (SELECT COUNT(*) FROM findings WHERE status = 'draft') as draft_findings,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM generated_reports) as total_reports
    `);
    return result.rows[0];
  }

  // Get findings by severity
  static async getFindingsBySeverity(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        severity,
        COUNT(*) as count
      FROM findings
      GROUP BY severity
      ORDER BY 
        CASE severity
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          WHEN 'Informational' THEN 5
        END
    `);
    return result.rows;
  }

  // Get findings by status
  static async getFindingsByStatus(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM findings
      GROUP BY status
      ORDER BY count DESC
    `);
    return result.rows;
  }

  // Get top reporters by findings
  static async getTopReporters(limit: number = 5): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(f.id) as findings_count,
        COUNT(CASE WHEN f.status = 'approved' THEN 1 END) as approved_count
      FROM users u
      LEFT JOIN findings f ON u.id = f.created_by
      WHERE u.role = 'reporter' OR u.role_id = (SELECT id FROM roles WHERE slug = 'reporter')
      GROUP BY u.id, u.name, u.email
      ORDER BY findings_count DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  // Get project statistics
  static async getProjectStats(projectId: number): Promise<any> {
    const result = await pool.query(`
      SELECT 
        p.*,
        COUNT(f.id) as total_findings,
        COUNT(CASE WHEN f.status = 'approved' THEN 1 END) as approved_findings,
        COUNT(CASE WHEN f.severity = 'Critical' THEN 1 END) as critical_findings,
        COUNT(CASE WHEN f.severity = 'High' THEN 1 END) as high_findings,
        COUNT(CASE WHEN f.severity = 'Medium' THEN 1 END) as medium_findings,
        COUNT(CASE WHEN f.severity = 'Low' THEN 1 END) as low_findings,
        COUNT(CASE WHEN f.severity = 'Informational' THEN 1 END) as info_findings,
        (SELECT COUNT(*) FROM generated_reports WHERE project_id = p.id) as reports_count
      FROM projects p
      LEFT JOIN findings f ON p.id = f.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [projectId]);
    return result.rows[0];
  }

  // Get findings trend (last 30 days)
  static async getFindingsTrend(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        severity
      FROM findings
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), severity
      ORDER BY date DESC, severity
    `);
    return result.rows;
  }

  // Get user activity summary
  static async getUserActivitySummary(userId: number): Promise<any> {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(DISTINCT f.id) as findings_created,
        COUNT(DISTINCT CASE WHEN f.status = 'approved' THEN f.id END) as findings_approved,
        COUNT(DISTINCT e.id) as evidence_uploaded
      FROM users u
      LEFT JOIN findings f ON u.id = f.created_by
      LEFT JOIN evidence e ON u.id = e.uploaded_by
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.email, u.role
    `, [userId]);
    return result.rows[0];
  }
}

export default DashboardService;
