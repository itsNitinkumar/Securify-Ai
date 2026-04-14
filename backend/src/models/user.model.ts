import pool from '../config/database';
import { User } from '../types';

class UserModel {
  static async findAll(): Promise<User[]> {
    const result = await pool.query(
      'SELECT id, email, name, role, status, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, name, role, status, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, name, role, status, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async create(email: string, name: string): Promise<User> {
    const result = await pool.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, created_at, updated_at',
      [email, name]
    );
    return result.rows[0];
  }

  static async update(id: number, name: string, role?: string): Promise<User | null> {
    const updates = ['name = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [name];
    
    if (role) {
      updates.push(`role = $${values.length + 1}`);
      values.push(role);
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} 
       RETURNING id, email, name, role, status, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async approve(id: number, role?: string): Promise<User | null> {
    const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = ['active'];
    
    if (role) {
      updates.push(`role = $${values.length + 1}`);
      values.push(role);
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} 
       RETURNING id, email, name, role, status, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  }
}

export default UserModel;
