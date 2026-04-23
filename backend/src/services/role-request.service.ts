import pool from '../config/database';
import ApiError from '../utils/ApiError';

interface RoleRequest {
  id: number;
  user_id: number;
  requested_role: string;
  previous_role: string;
  status: string;
  request_reason?: string;
  reviewed_by?: number;
  reviewed_at?: Date;
  review_notes?: string;
  created_at: Date;
  updated_at: Date;
}

class RoleRequestService {
  // Create new role request
  static async createRequest(data: {
    user_id: number;
    requested_role: string;
    current_role: string;
    request_reason?: string;
  }): Promise<RoleRequest> {
    const result = await pool.query(
      `INSERT INTO role_requests (user_id, requested_role, previous_role, request_reason, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [data.user_id, data.requested_role, data.current_role, data.request_reason]
    );

    // Update user's role_request_status
    await pool.query(
      `UPDATE users 
       SET requested_role = $1, role_request_status = 'pending', role_request_date = NOW()
       WHERE id = $2`,
      [data.requested_role, data.user_id]
    );

    return result.rows[0];
  }

  // Check if user has pending request
  static async hasPendingRequest(userId: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT id FROM role_requests 
       WHERE user_id = $1 AND status = 'pending'
       LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0;
  }

  // Get user's requests
  static async getUserRequests(userId: number): Promise<RoleRequest[]> {
    const result = await pool.query(
      `SELECT rr.*, 
              u.name as user_name, u.email as user_email,
              r.name as reviewer_name
       FROM role_requests rr
       LEFT JOIN users u ON rr.user_id = u.id
       LEFT JOIN users r ON rr.reviewed_by = r.id
       WHERE rr.user_id = $1
       ORDER BY rr.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Get pending requests
  static async getPendingRequests(): Promise<RoleRequest[]> {
    const result = await pool.query(
      `SELECT rr.*, 
              u.name as user_name, u.email as user_email
       FROM role_requests rr
       LEFT JOIN users u ON rr.user_id = u.id
       WHERE rr.status = 'pending'
       ORDER BY rr.created_at ASC`
    );
    return result.rows;
  }

  // Get all requests with optional status filter
  static async getAllRequests(status?: string): Promise<RoleRequest[]> {
    let query = `
      SELECT rr.*, 
             u.name as user_name, u.email as user_email,
             r.name as reviewer_name
      FROM role_requests rr
      LEFT JOIN users u ON rr.user_id = u.id
      LEFT JOIN users r ON rr.reviewed_by = r.id
    `;

    const params: any[] = [];
    if (status) {
      query += ' WHERE rr.status = $1';
      params.push(status);
    }

    query += ' ORDER BY rr.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Review request (approve/reject)
  static async reviewRequest(
    requestId: number,
    status: 'approved' | 'rejected',
    reviewedBy: number,
    reviewNotes?: string
  ): Promise<RoleRequest> {
    // Get the request
    const requestResult = await pool.query(
      'SELECT * FROM role_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      throw new ApiError(404, 'Role request not found');
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      throw new ApiError(400, 'This request has already been reviewed');
    }

    // Update request status
    const result = await pool.query(
      `UPDATE role_requests 
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, reviewedBy, reviewNotes, requestId]
    );

    // If approved, update user's role
    if (status === 'approved') {
      await pool.query(
        `UPDATE users 
         SET role = $1, 
             role_request_status = 'approved', 
             role_approved_by = $2, 
             role_approved_date = NOW(),
             requested_role = NULL
         WHERE id = $3`,
        [request.requested_role, reviewedBy, request.user_id]
      );
    } else {
      // If rejected, clear the request status
      await pool.query(
        `UPDATE users 
         SET role_request_status = 'rejected',
             requested_role = NULL
         WHERE id = $1`,
        [request.user_id]
      );
    }

    return result.rows[0];
  }
}

export default RoleRequestService;
