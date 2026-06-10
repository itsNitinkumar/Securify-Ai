import pool from '../config/database';

class DashboardService {
  static async getOverallStats(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'completed') as completed_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'draft') as draft_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'pending_review') as pending_review_projects,
        (SELECT COUNT(*) FROM findings) as total_findings,
        (SELECT COUNT(*) FROM findings WHERE status = 'approved') as approved_findings,
        (SELECT COUNT(*) FROM findings WHERE status IN ('draft','submitted','pending_review')) as open_findings,
        (SELECT COUNT(*) FROM findings WHERE status = 'draft') as draft_findings,
        (SELECT COUNT(*) FROM findings WHERE status = 'pending_review') as pending_findings,
        (SELECT COUNT(*) FROM findings WHERE severity = 'Critical') as critical_findings,
        (SELECT COUNT(*) FROM findings WHERE severity = 'High') as high_findings,
        (SELECT COUNT(*) FROM findings WHERE severity = 'Medium') as medium_findings,
        (SELECT COUNT(*) FROM findings WHERE severity = 'Low') as low_findings,
        (SELECT COUNT(*) FROM findings WHERE severity = 'Informational') as info_findings,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM generated_reports) as total_reports,
        (SELECT COUNT(*) FROM comment_threads WHERE status = 'OPEN') as unresolved_comments
    `);
    return result.rows[0];
  }

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
          WHEN 'None' THEN 6
        END
    `);
    const total = result.rows.reduce((sum: number, r: any) => sum + parseInt(r.count), 0);
    return result.rows.map((r: any) => ({
      ...r,
      count: parseInt(r.count),
      percentage: total > 0 ? Math.round((parseInt(r.count) / total) * 100) : 0,
    }));
  }

  static async getFindingsByStatus(): Promise<any[]> {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM findings
      GROUP BY status
      ORDER BY count DESC
    `);
    return result.rows.map((r: any) => ({ ...r, count: parseInt(r.count) }));
  }

  static async getTopReporters(limit: number = 5): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(f.id) as findings_count,
        COUNT(CASE WHEN f.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN f.severity IN ('Critical','High') THEN 1 END) as critical_high_count
      FROM users u
      LEFT JOIN findings f ON u.id = f.created_by
      WHERE u.role = 'reporter' OR u.role_id = (SELECT id FROM roles WHERE slug = 'reporter')
      GROUP BY u.id, u.name, u.email
      ORDER BY findings_count DESC
      LIMIT $1
    `, [limit]);
    return result.rows.map((r: any) => ({
      ...r,
      findings_count: parseInt(r.findings_count),
      approved_count: parseInt(r.approved_count),
      critical_high_count: parseInt(r.critical_high_count),
    }));
  }

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

  static async getMttr(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (f.updated_at - f.created_at)) / 86400),
          0
        ) as avg_resolution_days,
        COUNT(CASE WHEN f.status = 'approved' THEN 1 END) as resolved_count,
        COUNT(*) as total_count
      FROM findings f
      WHERE f.status = 'approved' OR f.created_at < NOW() - INTERVAL '7 days'
    `);
    const row = result.rows[0];
    return {
      avg_resolution_days: Math.round(parseFloat(row.avg_resolution_days) * 10) / 10,
      resolved_count: parseInt(row.resolved_count),
      total_count: parseInt(row.total_count),
    };
  }

  static async getRemediationVelocity(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        week_label,
        SUM(created_count) as created_count,
        SUM(closed_count) as closed_count
      FROM (
        SELECT 
          TO_CHAR(DATE_TRUNC('week', created_at), 'MM/DD') as week_label,
          COUNT(*) as created_count,
          0 as closed_count
        FROM findings
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        
        UNION ALL
        
        SELECT 
          TO_CHAR(DATE_TRUNC('week', updated_at), 'MM/DD') as week_label,
          0 as created_count,
          COUNT(*) as closed_count
        FROM findings
        WHERE status = 'approved' AND updated_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', updated_at)
      ) combined
      GROUP BY week_label
      ORDER BY week_label
    `);
    return result.rows.map((r: any) => ({
      ...r,
      created_count: parseInt(r.created_count),
      closed_count: parseInt(r.closed_count),
    }));
  }

  static async getFindingsByCategory(): Promise<any[]> {
    const result = await pool.query(`
      SELECT category, COUNT(*) as count FROM (
        SELECT COALESCE(
          (SELECT tag FROM jsonb_array_elements_text(f.tags) AS tag LIMIT 1),
          'Uncategorized'
        ) as category
        FROM findings f
      ) sub
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);
    if (result.rows.length === 0 || (result.rows.length === 1 && result.rows[0].category === 'Uncategorized')) {
      const byType = await pool.query(`
        SELECT 
          COALESCE(finding_type, 'true_positive') as category,
          COUNT(*) as count
        FROM findings
        GROUP BY finding_type
        ORDER BY count DESC
      `);
      return byType.rows.map((r: any) => ({
        category: r.category === 'true_positive' ? 'True Positive' : r.category === 'false_positive' ? 'False Positive' : r.category,
        count: parseInt(r.count),
      }));
    }
    return result.rows.map((r: any) => ({ ...r, count: parseInt(r.count) }));
  }

  static async getFindingsByDomain(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        domain,
        COUNT(*) as count,
        COUNT(CASE WHEN severity IN ('Critical','High') THEN 1 END) as critical_high_count
      FROM (
        SELECT 
          f.severity,
          COALESCE(
            (SELECT value FROM jsonb_array_elements_text(
              CASE WHEN jsonb_typeof(f.affected_target) = 'array' 
                   THEN f.affected_target 
                   ELSE '[]'::jsonb END
            ) AS value LIMIT 1),
            'Unknown'
          ) as domain
        FROM findings f
      ) sub
      WHERE domain != '' AND domain IS NOT NULL
      GROUP BY domain
      ORDER BY count DESC
      LIMIT 10
    `);
    return result.rows.map((r: any) => ({
      ...r,
      count: parseInt(r.count),
      critical_high_count: parseInt(r.critical_high_count),
    }));
  }

  static async getClientRiskBreakdown(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        COALESCE(c.name, p.client_name, p.name, 'Unknown Client') as client_name,
        COALESCE(c.id, 0) as client_id,
        COUNT(f.id) as total_findings,
        COUNT(CASE WHEN f.severity = 'Critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN f.severity = 'High' THEN 1 END) as high_count,
        COUNT(CASE WHEN f.severity = 'Medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN f.severity = 'Low' THEN 1 END) as low_count,
        COUNT(CASE WHEN f.severity = 'Informational' THEN 1 END) as info_count
      FROM findings f
      LEFT JOIN projects p ON f.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      GROUP BY c.name, c.id, p.client_name, p.name
      HAVING COUNT(f.id) > 0
      ORDER BY COUNT(f.id) DESC
      LIMIT 10
    `);
    return result.rows.map((r: any) => ({
      ...r,
      total_findings: parseInt(r.total_findings),
      critical_count: parseInt(r.critical_count),
      high_count: parseInt(r.high_count),
      medium_count: parseInt(r.medium_count),
      low_count: parseInt(r.low_count),
      info_count: parseInt(r.info_count),
    }));
  }

  static async getRecentFindings(limit: number = 10): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        f.id,
        f.title,
        f.severity,
        f.status,
        f.created_at,
        f.affected_target,
        f.finding_type,
        p.name as project_name
      FROM findings f
      LEFT JOIN projects p ON f.project_id = p.id
      ORDER BY f.created_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  static async getCommentActivity(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM comment_threads WHERE status = 'OPEN') as open_threads,
          (SELECT COUNT(*) FROM comment_threads WHERE status = 'RESOLVED') as resolved_threads
      `);
      const row = result.rows[0];
      return {
        open_threads: parseInt(row.open_threads),
        resolved_threads: parseInt(row.resolved_threads),
        unresolved_comments: 0,
        resolved_comments: 0,
      };
    } catch {
      return { open_threads: 0, resolved_threads: 0, unresolved_comments: 0, resolved_comments: 0 };
    }
  }

  static async getProjectsByStatus(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM projects
      GROUP BY status
      ORDER BY count DESC
    `);
    return result.rows.map((r: any) => ({ ...r, count: parseInt(r.count) }));
  }
}

export default DashboardService;
