import pool from '../config/database';

interface Comment {
  id: number;
  finding_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

class CommentModel {
  static async create(findingId: number, userId: number, comment: string): Promise<Comment> {
    const query = `
      INSERT INTO finding_comments (finding_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [findingId, userId, comment]);
    return result.rows[0];
  }

  static async findByFinding(findingId: number): Promise<Comment[]> {
    const query = `
      SELECT 
        fc.*,
        u.name as user_name,
        u.role as user_role
      FROM finding_comments fc
      LEFT JOIN users u ON fc.user_id = u.id
      WHERE fc.finding_id = $1
      ORDER BY fc.created_at DESC
    `;
    
    const result = await pool.query(query, [findingId]);
    return result.rows;
  }

  static async findById(id: number): Promise<Comment | null> {
    const query = `
      SELECT 
        fc.*,
        u.name as user_name,
        u.role as user_role
      FROM finding_comments fc
      LEFT JOIN users u ON fc.user_id = u.id
      WHERE fc.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async update(id: number, comment: string): Promise<Comment> {
    const query = `
      UPDATE finding_comments
      SET comment = $1
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [comment, id]);
    return result.rows[0];
  }

  static async delete(id: number): Promise<void> {
    const query = 'DELETE FROM finding_comments WHERE id = $1';
    await pool.query(query, [id]);
  }
}

export default CommentModel;
