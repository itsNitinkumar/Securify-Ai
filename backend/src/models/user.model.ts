import pool from '../config/database';
import { User, RoleSlug } from '../types';
import { PermissionSlug } from '../types/permissions';

const USER_COLUMNS = 'id, email, name, role, role_id, company_id, status, created_at, updated_at';

class UserModel {
  static async findAll(): Promise<User[]> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  static async findByRoleSlug(slug: RoleSlug): Promise<User[]> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE role_id = (SELECT id FROM roles WHERE slug = $1)`,
      [slug]
    );
    return result.rows;
  }

  static async create(email: string, name: string, role: string = 'client'): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (email, name, role, status) VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`,
      [email, name, role, 'active']
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
       RETURNING ${USER_COLUMNS}`,
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
       RETURNING ${USER_COLUMNS}`,
      values
    );
    return result.rows[0] || null;
  }

  static async getPermissions(userId: number): Promise<PermissionSlug[]> {
    const result = await pool.query(
      `SELECT p.slug
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = $1`,
      [userId]
    );
    return result.rows.map((r: { slug: string }) => r.slug as PermissionSlug);
  }

  static async setRole(userId: number, roleSlug: RoleSlug): Promise<void> {
    await pool.query(
      `UPDATE users SET role_id = (SELECT id FROM roles WHERE slug = $1), role = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [roleSlug, roleSlug, userId]
    );
  }

  static async setCompany(userId: number, companyId: number): Promise<void> {
    await pool.query(
      'UPDATE users SET company_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [companyId, userId]
    );
  }

  // Admin only: Create manager with credentials
  static async createManager(name: string, email: string, hashedPassword: string): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, status, role_id)
       VALUES ($1, $2, $3, 'manager', 'active', (SELECT id FROM roles WHERE slug = 'manager'))
       RETURNING ${USER_COLUMNS}`,
      [name, email, hashedPassword]
    );
    return result.rows[0];
  }
}

export default UserModel;
