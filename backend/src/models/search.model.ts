import pool from '../config/database';

// Auto-create search_history table if migration hasn't run
pool.query(`
  CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    entity VARCHAR(50),
    filters JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).then(() => {
  pool.query(`CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id)`).catch(() => {});
  pool.query(`CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC)`).catch(() => {});
}).catch(() => {});

// ── Filter column mapping ──────────────────────────────────
// Maps AI filter keys to database columns
const FILTER_COLUMN: Record<string, { table: string; column: string }> = {
  severity: { table: 'f', column: 'severity' },
  client: { table: 'p', column: 'client_name' },
  client_name: { table: 'p', column: 'client_name' },
  reporter: { table: 'u', column: 'name' },
  reporter_name: { table: 'u', column: 'name' },
  project: { table: 'p', column: 'name' },
  project_name: { table: 'p', column: 'name' },
  project_status: { table: 'p', column: 'status' },
  status: { table: 'p', column: 'status' },
  template: { table: 't', column: 'name' },
  template_name: { table: 't', column: 'name' },
  finding_type: { table: 'f', column: 'finding_type' },
  type: { table: 'f', column: 'finding_type' },
  created_by: { table: 'creator', column: 'name' },
  approved_by: { table: 'approver', column: 'name' },
};

// Default page size
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ── SQL generation helpers ─────────────────────────────────
interface FilterResult {
  clauses: string[];
  joins: string[];
  params: any[];
  paramIdx: number;
}

function buildFilters(
  filters: Record<string, string>,
  searchParams: { params: any[]; idx: number },
  entity: string = 'findings'
): FilterResult {
  const clauses: string[] = [];
  const joins: string[] = [];
  const params = searchParams.params;
  let paramIdx = searchParams.idx;
  let hasCreator = false;
  let hasApprover = false;

  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;

    if (key === 'search' || key === 'search_text') {
      continue;
    }

    if (key === 'date_range') {
      const dr = dateRangeToInterval(value);
      if (dr) {
        // handled per-entity with specific table alias
        continue;
      }
      continue;
    }

    if (key === 'finding_type') {
      clauses.push(`f.finding_type = $${paramIdx++}`);
      params.push(value);
      continue;
    }

    const mapping = FILTER_COLUMN[key];
    if (!mapping) continue;

    // Template join handled by caller queries (always joined for template_name in SELECT)
    if (mapping.table === 'creator' && !hasCreator) {
      joins.push(`LEFT JOIN users creator ON ${entity === 'findings' ? 'f' : 'p'}.created_by = creator.id`);
      hasCreator = true;
    }

    if (mapping.table === 'approver' && !hasApprover) {
      joins.push(`LEFT JOIN users approver ON f.approved_by = approver.id`);
      hasApprover = true;
    }

    const col = `${mapping.table}.${mapping.column}`;
    if (mapping.column === 'severity' || mapping.column === 'status' || mapping.column === 'finding_type' || mapping.column === 'role') {
      clauses.push(`${col} = $${paramIdx++}`);
      params.push(value);
    } else {
      clauses.push(`${col} ILIKE $${paramIdx++}`);
      params.push(`%${value}%`);
    }
  }

  return { clauses, joins, params, paramIdx };
}

function dateRangeToInterval(range: string): { clause: string; isThis: boolean } | null {
  const map: Record<string, { clause: string; isThis: boolean }> = {
    today: { clause: "created_at >= CURRENT_DATE", isThis: true },
    yesterday: { clause: "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE", isThis: true },
    this_week: { clause: "created_at >= date_trunc('week', CURRENT_DATE)", isThis: true },
    last_week: { clause: "created_at >= CURRENT_DATE - INTERVAL '1 week'", isThis: false },
    this_month: { clause: "created_at >= date_trunc('month', CURRENT_DATE)", isThis: true },
    last_month: { clause: "created_at >= CURRENT_DATE - INTERVAL '1 month'", isThis: false },
    last_quarter: { clause: "created_at >= CURRENT_DATE - INTERVAL '3 months'", isThis: false },
    this_year: { clause: "created_at >= date_trunc('year', CURRENT_DATE)", isThis: true },
    last_year: { clause: "created_at >= CURRENT_DATE - INTERVAL '1 year'", isThis: false },
  };
  return map[range] || null;
}

function addScope(
  role: string, userId: number, companyId: number | null,
  alias: string, paramIdx: number
): { where: string; params: any[] } {
  if (role === 'client' && companyId) {
    return { where: ` AND ${alias}.company_id = $${paramIdx}`, params: [companyId] };
  }
  if (role === 'reporter') {
    return { where: ` AND ${alias}.assigned_reporter_id = $${paramIdx}`, params: [userId] };
  }
  return { where: '', params: [] };
}

class SearchModel {
  // ── Search History ──────────────────────────────────────────
  static async saveHistory(userId: number, query: string, entity: string, filters: any): Promise<void> {
    await pool.query(
      `INSERT INTO search_history (user_id, query, entity, filters) VALUES ($1, $2, $3, $4)`,
      [userId, query, entity, JSON.stringify(filters)]
    );
  }

  static async getHistory(userId: number, limit = 10): Promise<any[]> {
    const result = await pool.query(
      'SELECT id, query, entity, filters, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  }

  static async clearHistory(userId: number): Promise<void> {
    await pool.query('DELETE FROM search_history WHERE user_id = $1', [userId]);
  }

  // ── Autocomplete Suggestions ────────────────────────────────
  static async getSuggestions(userId: number, role: string, companyId: number | null): Promise<any> {
    let projectCondition = '';
    const params: any[] = [];
    let paramIdx = 1;

    if (role === 'client' && companyId) {
      projectCondition = ` WHERE p.company_id = $${paramIdx++}`;
      params.push(companyId);
    } else if (role === 'reporter') {
      projectCondition = ` WHERE p.assigned_reporter_id = $${paramIdx++}`;
      params.push(userId);
    }

    const [projects, reporters, clients, templates, findings] = await Promise.all([
      pool.query(
        `SELECT DISTINCT p.name FROM projects p${projectCondition} ORDER BY p.name LIMIT 20`,
        params
      ),
      pool.query(
        `SELECT DISTINCT u.name FROM users u
         JOIN projects p ON u.id = p.assigned_reporter_id${projectCondition}
         ORDER BY u.name LIMIT 20`,
        params
      ),
      pool.query(
        `SELECT DISTINCT p.client_name FROM projects p WHERE p.client_name IS NOT NULL${projectCondition ? ` AND ${projectCondition.replace('WHERE p.', '').replace(/^\s*AND\s*/, '')}` : ''} ORDER BY p.client_name LIMIT 20`,
        role === 'client' && companyId ? [companyId] : role === 'reporter' ? [userId] : []
      ),
      pool.query('SELECT name FROM report_templates ORDER BY name LIMIT 20'),
      pool.query(
        `SELECT DISTINCT f.title FROM findings f
         JOIN projects p ON f.project_id = p.id${projectCondition}
         ORDER BY f.title LIMIT 20`,
        params
      ),
    ]);

    return {
      projects: projects.rows.map((r: any) => r.name),
      reporters: reporters.rows.map((r: any) => r.name),
      clients: clients.rows.map((r: any) => r.client_name),
      templates: templates.rows.map((r: any) => r.name),
      findings: findings.rows.map((r: any) => r.title),
    };
  }

  // ── Entity-Specific Searches ────────────────────────────────

  static async searchProjects(
    filters: Record<string, string>, userId: number, role: string, companyId: number | null,
    limit: number = DEFAULT_LIMIT, offset: number = 0
  ): Promise<any[]> {
    const sp = { params: [] as any[], idx: 1 };
    const fb = buildFilters(filters, sp, 'projects');
    const clauses = [...fb.clauses];
    const params = [...fb.params];
    sp.idx = fb.paramIdx;

    if (filters.search || filters.search_text) {
      const like = `%${filters.search || filters.search_text}%`;
      const fuzzy = `%${(filters.search || filters.search_text).replace(/\s+/g, '')}%`;
      clauses.push(`(p.name ILIKE $${sp.idx} OR p.description ILIKE $${sp.idx} OR p.client_name ILIKE $${sp.idx}
        OR REPLACE(LOWER(p.name), ' ', '') LIKE LOWER($${sp.idx + 1})
        OR REPLACE(LOWER(p.client_name), ' ', '') LIKE LOWER($${sp.idx + 1}))`);
      params.push(like, fuzzy);
      sp.idx += 2;
    }

    if (filters.date_range) {
      const dr = dateRangeToInterval(filters.date_range);
      if (dr) clauses.push(`p.${dr.clause}`);
    }

    const where = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '';
    const scoped = addScope(role, userId, companyId, 'p', sp.idx);
    const joins = fb.joins.length > 0 ? fb.joins.join(' ') + ' ' : '';

    const safeLimit = Math.min(limit, MAX_LIMIT);

    const query = `
      SELECT p.id, p.name, p.client_name, p.status, p.created_at,
        p.start_date, p.end_date,
        u.name AS reporter_name, u.email AS reporter_email,
        t.name AS template_name,
        COUNT(f.id)::int AS findings_count,
        COALESCE(
          (SELECT json_agg(sub) FROM (
            SELECT f2.id, f2.title, f2.severity, f2.created_at,
              CASE f2.severity
                WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
                WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4
                ELSE 5
              END AS sev_order
            FROM findings f2
            WHERE f2.project_id = p.id
            ORDER BY sev_order, f2.created_at DESC
            LIMIT 3
          ) sub),
          '[]'::json
        ) AS findings
      FROM projects p
      LEFT JOIN users u ON p.assigned_reporter_id = u.id
      LEFT JOIN findings f ON f.project_id = p.id
      LEFT JOIN report_templates t ON p.template_id = t.id
      ${joins}
      ${where}${scoped.where}
      GROUP BY p.id, u.name, u.email, t.name
      ORDER BY p.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}
    `;

    const result = await pool.query(query, [...params, ...scoped.params]);
    return result.rows;
  }

  static async searchFindings(
    filters: Record<string, string>, userId: number, role: string, companyId: number | null,
    limit: number = DEFAULT_LIMIT, offset: number = 0
  ): Promise<any[]> {
    const sp = { params: [] as any[], idx: 1 };
    const fb = buildFilters(filters, sp, 'findings');
    const clauses = [...fb.clauses];
    const params = [...fb.params];
    const joins = [...fb.joins];
    sp.idx = fb.paramIdx;

    if (filters.finding_type) {
      clauses.push(`f.finding_type = $${sp.idx++}`);
      params.push(filters.finding_type);
    }

    if (filters.search || filters.search_text) {
      const like = `%${filters.search || filters.search_text}%`;
      const fuzzy = `%${(filters.search || filters.search_text).replace(/\s+/g, '')}%`;
      clauses.push(`(f.title ILIKE $${sp.idx} OR f.description ILIKE $${sp.idx}
        OR REPLACE(LOWER(f.title), ' ', '') LIKE LOWER($${sp.idx + 1})
        OR REPLACE(LOWER(f.description), ' ', '') LIKE LOWER($${sp.idx + 1}))`);
      params.push(like, fuzzy);
      sp.idx += 2;
    }

    if (filters.date_range) {
      const dr = dateRangeToInterval(filters.date_range);
      if (dr) clauses.push(`f.${dr.clause}`);
    }

    const where = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '';
    const scoped = addScope(role, userId, companyId, 'p', sp.idx);
    const joinStr = joins.length > 0 ? joins.join(' ') + ' ' : '';
    const safeLimit = Math.min(limit, MAX_LIMIT);

    const query = `
      SELECT f.id, f.title, f.severity, f.status, f.finding_type, f.created_at,
        p.name AS project_name, p.client_name,
        u.name AS reporter_name,
        t.name AS template_name
      FROM findings f
      JOIN projects p ON f.project_id = p.id
      LEFT JOIN users u ON f.created_by = u.id
      LEFT JOIN report_templates t ON p.template_id = t.id
      ${joinStr}
      ${where}${scoped.where}
      ORDER BY
        CASE f.severity
          WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4
          ELSE 5
        END,
        f.created_at DESC
      LIMIT ${safeLimit} OFFSET ${offset}
    `;

    const result = await pool.query(query, [...params, ...scoped.params]);
    return result.rows;
  }

  // ── Users / Reporters Search ────────────────────────────────
  static async searchUsers(
    filters: Record<string, string>, _userId: number, role: string, companyId: number | null,
    limit: number = DEFAULT_LIMIT, offset: number = 0
  ): Promise<any[]> {
    const params: any[] = [];
    let paramIdx = 1;
    const clauses: string[] = [];

    if (filters.role) {
      clauses.push(`r.slug = $${paramIdx++}`);
      params.push(filters.role);
    }

    if (filters.search || filters.search_text) {
      const search = `%${filters.search || filters.search_text}%`;
      clauses.push(`(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
      params.push(search);
      paramIdx++;
    }

    if (filters.reporter || filters.reporter_name) {
      clauses.push(`u.name ILIKE $${paramIdx++}`);
      params.push(`%${filters.reporter || filters.reporter_name}%`);
    }

    // RBAC scope for clients/reporters
    if (role === 'client' && companyId) {
      clauses.push(`u.company_id = $${paramIdx++}`);
      params.push(companyId);
    }

    const where = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '';
    const safeLimit = Math.min(limit, MAX_LIMIT);

    const result = await pool.query(
      `SELECT u.id, u.name, r.name AS role_name, r.slug AS role_slug,
        u.status, u.created_at,
        COUNT(DISTINCT p.id)::int AS project_count,
        COUNT(DISTINCT f.id)::int AS finding_count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN projects p ON p.assigned_reporter_id = u.id
      LEFT JOIN findings f ON f.created_by = u.id
      ${where}
      GROUP BY u.id, u.name, r.name, r.slug, u.status, u.created_at
      ORDER BY u.name
      LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );
    return result.rows;
  }

  // ── Analytics ──────────────────────────────────────────────
  // NEVER ignores filters. ALL AI-extracted filters are applied to SQL.

  static async runAnalytics(
    filters: Record<string, string>, entity: string, action: string,
    userId: number, role: string, companyId: number | null
  ): Promise<any> {
    const buildAnalyticFilters = (): { where: string; params: any[]; joins: string } => {
      const clauses: string[] = [];
      const joins: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;
      let hasTemplate = false;

      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        if (key === 'action' || key === 'entity') continue;

        if (key === 'search' || key === 'search_text') {
          if (entity === 'projects') {
            clauses.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR p.client_name ILIKE $${paramIdx})`);
            params.push(`%${value}%`);
            paramIdx++;
          } else if (entity === 'findings' || entity === 'true_positive' || entity === 'false_positive') {
            clauses.push(`(f.title ILIKE $${paramIdx} OR f.description ILIKE $${paramIdx})`);
            params.push(`%${value}%`);
            paramIdx++;
          }
          continue;
        }

        if (key === 'date_range') {
          const dr = dateRangeToInterval(value);
          if (dr) {
            if (entity === 'projects') clauses.push(`p.${dr.clause}`);
            else clauses.push(`f.${dr.clause}`);
          }
          continue;
        }

        const mapping = FILTER_COLUMN[key];
        if (!mapping) continue;

        if (mapping.table === 't' && !hasTemplate) {
          joins.push(`LEFT JOIN report_templates t ON p.template_id = t.id`);
          hasTemplate = true;
        }

        const col = `${mapping.table}.${mapping.column}`;
        if (mapping.column === 'severity' || mapping.column === 'status' || mapping.column === 'finding_type') {
          clauses.push(`${col} = $${paramIdx++}`);
          params.push(value);
        } else {
          clauses.push(`${col} ILIKE $${paramIdx++}`);
          params.push(`%${value}%`);
        }
      }

      const scoped = addScope(role, userId, companyId, 'p', paramIdx);
      const allWhere = clauses.length > 0
        ? ' WHERE ' + clauses.join(' AND ') + scoped.where
        : ' WHERE 1=1' + scoped.where;

      return {
        where: allWhere,
        params: [...params, ...scoped.params],
        joins: joins.length > 0 ? joins.join(' ') + ' ' : '',
      };
    };

    const af = buildAnalyticFilters();

    if (action === 'count') {
      if (entity === 'projects') {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS count FROM projects p ${af.joins}${af.where}`, af.params
        );
        return { count: parseInt(r.rows[0].count, 10) };
      }
      if (entity === 'findings' || entity === 'true_positive' || entity === 'false_positive') {
        const typeClause = entity === 'true_positive' ? ` AND f.finding_type = 'true_positive'`
          : entity === 'false_positive' ? ` AND f.finding_type = 'false_positive'` : '';
        const r = await pool.query(
          `SELECT COUNT(*)::int AS count FROM findings f
           JOIN projects p ON f.project_id = p.id
           LEFT JOIN users u ON f.created_by = u.id ${af.joins}${af.where}${typeClause}`, af.params
        );
        return { count: parseInt(r.rows[0].count, 10) };
      }
      if (entity === 'reporters') {
        const [countR, listR] = await Promise.all([
          pool.query(
            `SELECT COUNT(DISTINCT u.id)::int AS count FROM users u
             JOIN roles r ON u.role_id = r.id
             JOIN projects p ON u.id = p.assigned_reporter_id
             WHERE r.slug = 'reporter' ${af.where.replace(/^WHERE\s+1=1\s*/i, '').replace(/^WHERE\s+/i, 'AND ')}`, af.params
          ),
          pool.query(
            `SELECT u.id, u.name, 'Reporter' AS role_name, 'reporter' AS role_slug,
              u.status, u.created_at,
              COUNT(DISTINCT p.id)::int AS project_count,
              COUNT(DISTINCT f.id)::int AS finding_count
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN projects p ON p.assigned_reporter_id = u.id
            LEFT JOIN findings f ON f.created_by = u.id
            WHERE r.slug = 'reporter'${af.where.replace(/^WHERE\s+1=1\s*/i, '').replace(/^WHERE\s+/i, ' AND ')}
            GROUP BY u.id, u.name, u.status, u.created_at
            ORDER BY u.name`, af.params
          ),
        ]);
        return {
          count: parseInt(countR.rows[0].count, 10),
          reporters: listR.rows,
        };
      }
      // Generic count
      if (entity === 'clients') {
        const r = await pool.query(
          `SELECT COUNT(DISTINCT p.client_name)::int AS count FROM projects p ${af.joins}${af.where}`, af.params
        );
        return { count: parseInt(r.rows[0].count, 10) };
      }
      if (entity === 'templates') {
        const [countR, listR] = await Promise.all([
          pool.query(
            `SELECT COUNT(*)::int AS count FROM report_templates t
             LEFT JOIN projects p ON p.template_id = t.id ${af.where}`, af.params
          ),
          pool.query(
            `SELECT t.id, t.name, COUNT(p.id)::int AS project_count
             FROM report_templates t
             LEFT JOIN projects p ON p.template_id = t.id ${af.where}
             GROUP BY t.id, t.name
             ORDER BY t.name`, af.params
          ),
        ]);
        return {
          count: parseInt(countR.rows[0].count, 10),
          templates: listR.rows,
        };
      }
      if (entity === 'users' || entity === 'reporters') {
        const roleFilter = filters.role ? ` AND r.slug = '${filters.role}'` : '';
        const r = await pool.query(
          `SELECT COUNT(DISTINCT u.id)::int AS count FROM users u
           LEFT JOIN roles r ON u.role_id = r.id
           WHERE 1=1${roleFilter}`, []
        );
        return { count: parseInt(r.rows[0].count, 10) };
      }
    }

    if (action === 'highest' || action === 'most_common') {
      if (entity === 'reporters') {
        const r = await pool.query(
          `SELECT u.name, u.email, COUNT(DISTINCT p.id)::int AS project_count,
            COUNT(DISTINCT f.id)::int AS finding_count
           FROM users u
           JOIN projects p ON u.id = p.assigned_reporter_id
           LEFT JOIN findings f ON f.project_id = p.id AND f.created_by = u.id
           ${af.joins}${af.where}
           GROUP BY u.id, u.name, u.email
           ORDER BY finding_count DESC LIMIT 1`, af.params
        );
        return r.rows[0] || { name: '', project_count: 0, finding_count: 0 };
      }
      if (entity === 'findings') {
        const r = await pool.query(
          `SELECT f.title, COUNT(*)::int AS count FROM findings f
           JOIN projects p ON f.project_id = p.id
           LEFT JOIN users u ON f.created_by = u.id ${af.joins}${af.where}
           GROUP BY f.title ORDER BY count DESC LIMIT 1`, af.params
        );
        return r.rows[0] || { title: '', count: 0 };
      }
      if (entity === 'clients') {
        const r = await pool.query(
          `SELECT p.client_name AS name, COUNT(DISTINCT p.id)::int AS project_count,
            COUNT(DISTINCT f.id)::int AS finding_count
           FROM projects p
           LEFT JOIN findings f ON f.project_id = p.id
           ${af.joins}${af.where}
           GROUP BY p.client_name ORDER BY finding_count DESC LIMIT 1`, af.params
        );
        return r.rows[0] || { name: '', project_count: 0, finding_count: 0 };
      }
    }

    if (action === 'lowest') {
      if (entity === 'reporters') {
        const r = await pool.query(
          `SELECT u.name, u.email, COUNT(DISTINCT p.id)::int AS project_count,
            COUNT(DISTINCT f.id)::int AS finding_count
           FROM users u
           JOIN projects p ON u.id = p.assigned_reporter_id
           LEFT JOIN findings f ON f.project_id = p.id AND f.created_by = u.id
           ${af.joins}${af.where}
           GROUP BY u.id, u.name, u.email
           ORDER BY finding_count ASC LIMIT 1`, af.params
        );
        return r.rows[0] || { name: '', project_count: 0, finding_count: 0 };
      }
      if (entity === 'findings') {
        const r = await pool.query(
          `SELECT f.title, COUNT(*)::int AS count FROM findings f
           JOIN projects p ON f.project_id = p.id
           LEFT JOIN users u ON f.created_by = u.id ${af.joins}${af.where}
           GROUP BY f.title ORDER BY count ASC LIMIT 1`, af.params
        );
        return r.rows[0] || { title: '', count: 0 };
      }
    }

    if (action === 'group') {
      if (filters.severity || filters.group_by === 'severity') {
        const r = await pool.query(
          `SELECT f.severity, COUNT(*)::int AS count FROM findings f
           JOIN projects p ON f.project_id = p.id
           LEFT JOIN users u ON f.created_by = u.id ${af.joins}${af.where}
           GROUP BY f.severity ORDER BY count DESC`, af.params
        );
        return { groups: r.rows };
      }
      if (filters.project_status || filters.group_by === 'status') {
        const r = await pool.query(
          `SELECT p.status, COUNT(*)::int AS count FROM projects p ${af.joins}${af.where}
           GROUP BY p.status ORDER BY count DESC`, af.params
        );
        return { groups: r.rows };
      }
      if (filters.reporter || filters.group_by === 'reporter') {
        const r = await pool.query(
          `SELECT u.name AS reporter_name, COUNT(p.id)::int AS project_count FROM users u
           JOIN projects p ON u.id = p.assigned_reporter_id ${af.joins}${af.where}
           GROUP BY u.name ORDER BY project_count DESC`, af.params
        );
        return { groups: r.rows };
      }
      if (filters.project || filters.group_by === 'project') {
        const r = await pool.query(
          `SELECT p.name AS project_name, COUNT(f.id)::int AS count FROM projects p
           LEFT JOIN findings f ON f.project_id = p.id
           LEFT JOIN users u ON p.assigned_reporter_id = u.id ${af.joins}${af.where}
           GROUP BY p.name ORDER BY count DESC`, af.params
        );
        return { groups: r.rows };
      }
      // Default group: by severity
      const r = await pool.query(
        `SELECT f.severity, COUNT(*)::int AS count FROM findings f
         JOIN projects p ON f.project_id = p.id
         LEFT JOIN users u ON f.created_by = u.id ${af.joins}${af.where}
         GROUP BY f.severity ORDER BY count DESC`, af.params
      );
      return { groups: r.rows };
    }

    if (action === 'average') {
      if (entity === 'findings' || entity === 'true_positive' || entity === 'false_positive') {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS total, COUNT(DISTINCT f.project_id)::int AS projects,
            ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT f.project_id), 0), 1)::float AS avg_per_project
           FROM findings f
           JOIN projects p ON f.project_id = p.id
           LEFT JOIN users u ON f.created_by = u.id ${af.joins}${af.where}`, af.params
        );
        return r.rows[0] || { total: 0, projects: 0, avg_per_project: 0 };
      }
      if (entity === 'projects') {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS total,
            COUNT(DISTINCT COALESCE(p.client_name, ''))::int AS clients,
            COUNT(DISTINCT p.assigned_reporter_id)::int AS reporters
           FROM projects p ${af.joins}${af.where}`, af.params
        );
        return r.rows[0] || { total: 0, clients: 0, reporters: 0 };
      }
    }

    return {};
  }

  // ── Comprehensive Global Search ────────────────────────────
  // Searches ALL entities with fuzzy matching and ranking

  static async searchAll(
    searchText: string, userId: number, role: string, companyId: number | null
  ): Promise<any[]> {
    const words = searchText.split(/\s+/).filter((w: string) => w.length > 0);
    if (words.length === 0) return [];

    const wordParams = words.map(w => `%${w}%`);
    const exactSearch = searchText.trim();
    const fuzzySearch = searchText.replace(/\s+/g, '');

    // Scope
    const scoped = addScope(role, userId, companyId, 'p', words.length + 4);

    // Ranking: exact match (0) > starts_with (1) > contains (2) > fuzzy space-insensitive (3)
    const rankCol = (col: string, wordIdx: number): string => `
      CASE
        WHEN LOWER(${col}) = LOWER($1) THEN 0
        WHEN LOWER(${col}) LIKE LOWER($2 || '%') THEN 1
        WHEN ${col} ILIKE $${3 + wordIdx} THEN 2
        WHEN REPLACE(LOWER(${col}), ' ', '') LIKE LOWER($${words.length + 3}) THEN 3
        ELSE 4
      END
    `;

    // For exact search (param 1), starts_with (param 2), and fuzzy-no-space (param last)
    const allWordStartIdx = 3; // params 1=exact, 2=starts_with, 3..N=word ILIKE, N+1=fuzzy

    const projRank = rankCol('p.name', 0);
    const findRank = rankCol('f.title', 0);

    const projectLike = words.map((_, i) =>
      `(p.name ILIKE $${allWordStartIdx + i} OR p.description ILIKE $${allWordStartIdx + i} OR p.client_name ILIKE $${allWordStartIdx + i})`
    ).join(' OR ');

    const findingLike = words.map((_, i) =>
      `(f.title ILIKE $${allWordStartIdx + i} OR f.description ILIKE $${allWordStartIdx + i})`
    ).join(' OR ');

    const reporterLike = words.map((_, i) =>
      `u.name ILIKE $${allWordStartIdx + i}`
    ).join(' OR ');

    const clientLike = words.map((_, i) =>
      `p.client_name ILIKE $${allWordStartIdx + i}`
    ).join(' OR ');

    const templateLike = words.map((_, i) =>
      `t.name ILIKE $${allWordStartIdx + i}`
    ).join(' OR ');

    const commentLike = words.map((_, i) =>
      `fc.comment ILIKE $${allWordStartIdx + i}`
    ).join(' OR ');

    const replyLike = words.map((_, i) =>
      `cr.message ILIKE $${allWordStartIdx + i}`
    ).join(' OR ');

    const evidenceLike = words.map((_, i) =>
      `e.caption ILIKE $${allWordStartIdx + i}`
    ).join(' OR ');

    const stepLike = words.map((_, i) =>
      `si.caption ILIKE $${allWordStartIdx + i}`
    ).join(' OR ');

    const projectCommentLike = words.map((_, i) =>
      `pc.comment ILIKE $${allWordStartIdx + i}`
    ).join(' OR ');

    // Common params: exact search (1), starts_with (2), word ILIKE params (3..N), fuzzy (N+1)
    const exactParam = exactSearch;
    const startsWithParam = exactSearch;
    const fuzzyParam = `%${fuzzySearch}%`;
    const commonParams = [exactParam, startsWithParam, ...wordParams, fuzzyParam];
    const finalCommon = [...commonParams, ...scoped.params];

    const [
      projects, findings, reporters, clients, templates,
      comments, replies, evidence, stepImages, projectComments,
    ] = await Promise.all([
      pool.query(
        `SELECT p.id, p.name AS name, p.client_name, p.status, p.created_at,
          u2.name AS reporter_name, NULL AS template_name,
          'project' AS _entity,
          ${projRank} AS _rank
        FROM projects p
        LEFT JOIN users u2 ON p.assigned_reporter_id = u2.id
        WHERE (${projectLike})${scoped.where}
        ORDER BY _rank, p.created_at DESC LIMIT 20`,
        finalCommon
      ),
      pool.query(
        `SELECT f.id, f.title AS name, f.severity, f.status, f.created_at,
          p.name AS project_name, u2.name AS reporter_name,
          'finding' AS _entity,
          ${findRank} AS _rank
        FROM findings f
        JOIN projects p ON f.project_id = p.id
        LEFT JOIN users u2 ON f.created_by = u2.id
        WHERE (${findingLike} OR f."references"::text ILIKE $${allWordStartIdx} OR f.evidence_items::text ILIKE $${allWordStartIdx})${scoped.where}
        ORDER BY _rank, f.created_at DESC LIMIT 20`,
        finalCommon
      ),
      pool.query(
        `SELECT u.id, u.name, u.email,
          COUNT(DISTINCT p.id)::int AS project_count,
          'reporter' AS _entity
        FROM users u
        JOIN projects p ON u.id = p.assigned_reporter_id
        WHERE $1::text IS NOT NULL AND $2::text IS NOT NULL AND (${reporterLike})${scoped.where.replace(/AND\s+p\./g, 'AND p.')}
        GROUP BY u.id, u.name, u.email
        ORDER BY project_count DESC LIMIT 10`,
        finalCommon
      ),
      pool.query(
        `SELECT p.client_name AS name,
          COUNT(DISTINCT p.id)::int AS project_count,
          'client' AS _entity
        FROM projects p
        WHERE $1::text IS NOT NULL AND $2::text IS NOT NULL AND p.client_name IS NOT NULL AND (${clientLike})${scoped.where}
        GROUP BY p.client_name
        ORDER BY project_count DESC LIMIT 10`,
        finalCommon
      ),
      pool.query(
        `SELECT t.id, t.name, COUNT(p.id)::int AS project_count,
          'template' AS _entity
        FROM report_templates t
        LEFT JOIN projects p ON p.template_id = t.id
        WHERE $1::text IS NOT NULL AND $2::text IS NOT NULL AND (${templateLike})
        GROUP BY t.id, t.name
        ORDER BY project_count DESC LIMIT 10`,
        commonParams
      ),
      // Comments on findings
      pool.query(
        `SELECT fc.id, fc.comment AS name, fc.created_at,
          f.title AS finding_name, f.id AS finding_id,
          'comment' AS _entity
        FROM finding_comments fc
        JOIN findings f ON fc.finding_id = f.id
        JOIN projects p ON f.project_id = p.id
        WHERE $1::text IS NOT NULL AND $2::text IS NOT NULL AND (${commentLike})${scoped.where}
        ORDER BY fc.created_at DESC LIMIT 15`,
        finalCommon
      ),
      pool.query(
        `SELECT cr.id, cr.message AS name, cr.created_at,
          ct.project_id, ct.id AS thread_id,
          'reply' AS _entity
        FROM comment_thread_replies cr
        JOIN comment_threads ct ON cr.thread_id = ct.id
        JOIN projects p ON ct.project_id = p.id
        WHERE $1::text IS NOT NULL AND $2::text IS NOT NULL AND (${replyLike})${scoped.where}
        ORDER BY cr.created_at DESC LIMIT 15`,
        finalCommon
      ),
      pool.query(
        `SELECT e.id, e.caption AS name, e.filename, e.created_at,
          f.title AS finding_name, f.id AS finding_id,
          'evidence' AS _entity
        FROM evidence e
        JOIN findings f ON e.finding_id = f.id
        JOIN projects p ON f.project_id = p.id
        WHERE $1::text IS NOT NULL AND $2::text IS NOT NULL AND e.caption IS NOT NULL AND (${evidenceLike})${scoped.where}
        ORDER BY e.created_at DESC LIMIT 15`,
        finalCommon
      ),
      pool.query(
        `SELECT si.id, si.caption AS name, si.created_at,
          f.title AS finding_name, f.id AS finding_id,
          'step_image' AS _entity
        FROM step_images si
        JOIN findings f ON si.finding_id = f.id
        JOIN projects p ON f.project_id = p.id
        WHERE $1::text IS NOT NULL AND $2::text IS NOT NULL AND si.caption IS NOT NULL AND (${stepLike})${scoped.where}
        ORDER BY si.created_at DESC LIMIT 15`,
        finalCommon
      ),
      pool.query(
        `SELECT pc.id, pc.comment AS name, pc.created_at,
          p.name AS project_name, p.id AS project_id,
          'project_comment' AS _entity
        FROM project_comments pc
        JOIN projects p ON pc.project_id = p.id
        WHERE $1::text IS NOT NULL AND $2::text IS NOT NULL AND (${projectCommentLike})${scoped.where}
        ORDER BY pc.created_at DESC LIMIT 15`,
        finalCommon
      ),
    ]);

    const results: any[] = [];
    for (const row of projects.rows) results.push(row);
    for (const row of findings.rows) results.push(row);
    for (const row of reporters.rows) results.push(row);
    for (const row of clients.rows) results.push(row);
    for (const row of templates.rows) results.push(row);
    for (const row of comments.rows) results.push(row);
    for (const row of replies.rows) results.push(row);
    for (const row of evidence.rows) results.push(row);
    for (const row of stepImages.rows) results.push(row);
    for (const row of projectComments.rows) results.push(row);

    // Sort by rank
    results.sort((a: any, b: any) => (a._rank || 4) - (b._rank || 4));
    return results.slice(0, 50);
  }

  // ── Legacy entity searches (kept for backward compat) ──────

  static async searchReporters(
    filters: Record<string, string>, userId: number, role: string, companyId: number | null
  ): Promise<any[]> {
    const scoped = addScope(role, userId, companyId, 'p', 1);
    const nameVal = filters.reporter || filters.reporter_name || filters.search || filters.search_text;
    const nameClause = nameVal ? ` AND u.name ILIKE $${scoped.params.length + 1}` : '';
    if (nameVal) scoped.params.push(`%${nameVal}%`);

    const result = await pool.query(
      `SELECT u.id, u.name, u.email,
        COUNT(DISTINCT p.id)::int AS project_count,
        COUNT(DISTINCT f.id)::int AS finding_count
      FROM users u
      JOIN projects p ON u.id = p.assigned_reporter_id
      LEFT JOIN findings f ON f.project_id = p.id AND f.created_by = u.id
      WHERE 1=1${nameClause}${scoped.where}
      GROUP BY u.id, u.name, u.email
      ORDER BY project_count DESC LIMIT 20`,
      scoped.params
    );
    return result.rows;
  }

  static async searchClients(
    filters: Record<string, string>, userId: number, role: string, companyId: number | null
  ): Promise<any[]> {
    const scoped = addScope(role, userId, companyId, 'p', 1);
    const nameVal = filters.client || filters.client_name || filters.search || filters.search_text;
    const nameClause = nameVal ? ` AND p.client_name ILIKE $${scoped.params.length + 1}` : '';
    if (nameVal) scoped.params.push(`%${nameVal}%`);

    const result = await pool.query(
      `SELECT p.client_name AS name,
        COUNT(DISTINCT p.id)::int AS project_count,
        COUNT(DISTINCT f.id)::int AS finding_count
      FROM projects p
      LEFT JOIN findings f ON f.project_id = p.id
      WHERE p.client_name IS NOT NULL${nameClause}${scoped.where}
      GROUP BY p.client_name
      ORDER BY project_count DESC LIMIT 20`,
      scoped.params
    );
    return result.rows;
  }

  static async searchTemplates(filters: Record<string, string>): Promise<any[]> {
    const nameVal = filters.template || filters.template_name || filters.search || filters.search_text;
    const nameClause = nameVal ? ` WHERE t.name ILIKE $1` : '';
    const params: any[] = [];
    if (nameVal) params.push(`%${nameVal}%`);

    const result = await pool.query(
      `SELECT t.id, t.name, COUNT(p.id)::int AS project_count
      FROM report_templates t
      LEFT JOIN projects p ON p.template_id = t.id
      ${nameClause}
      GROUP BY t.id, t.name
      ORDER BY project_count DESC LIMIT 20`,
      params
    );
    return result.rows;
  }

  static async searchWorkflowStatus(
    filters: Record<string, string>, userId: number, role: string, companyId: number | null
  ): Promise<any[]> {
    const scoped = addScope(role, userId, companyId, 'p', 1);
    const statusVal = filters.project_status || filters.status;
    const statusClause = statusVal ? ` AND p.status = $${scoped.params.length + 1}` : '';
    if (statusVal) scoped.params.push(statusVal);

    const result = await pool.query(
      `SELECT p.id, p.name AS project_name, p.status, p.created_at, p.updated_at
      FROM projects p
      WHERE 1=1${statusClause}${scoped.where}
      ORDER BY p.updated_at DESC LIMIT 50`,
      scoped.params
    );
    return result.rows;
  }

}

export default SearchModel;
