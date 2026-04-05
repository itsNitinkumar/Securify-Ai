import pool from '../config/database';
import { User } from '../types';

class UserModel {
  static async findAll(): Promise<User[]> {
    const result = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE email = $1',
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

  static async update(id: number, name: string): Promise<User | null> {
    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, created_at, updated_at',
      [name, id]
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export default UserModel;
