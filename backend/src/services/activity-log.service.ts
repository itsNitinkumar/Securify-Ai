import pool from '../config/database';

interface ActivityLog {
  user_id: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

class ActivityLogService {
  static async log(data: ActivityLog): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO activity_logs (
          user_id, action, entity_type, entity_id, details, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          data.user_id,
          data.action,
          data.entity_type,
          data.entity_id,
          JSON.stringify(data.details),
          data.ip_address,
          data.user_agent,
        ]
      );
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - logging should not break the main flow
    }
  }

  static async getRecentActivity(userId?: number, limit: number = 50): Promise<any[]> {
    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const params: any[] = [];

    if (userId) {
      query += ' WHERE al.user_id = $1';
      params.push(userId);
    }

    query += ' ORDER BY al.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getEntityActivity(entityType: string, entityId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = $1 AND al.entity_id = $2
       ORDER BY al.created_at DESC`,
      [entityType, entityId]
    );
    return result.rows;
  }
}

export default ActivityLogService;
