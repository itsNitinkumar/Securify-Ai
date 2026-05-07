import pool from '../config/database';

export interface Client {
  id: number;
  name: string;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

class ClientModel {
  static async create(data: { name: string; created_by?: number }): Promise<Client> {
    const result = await pool.query(
      `INSERT INTO clients (name, created_by)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET
         name = EXCLUDED.name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [data.name.trim(), data.created_by ?? null]
    );
    return result.rows[0];
  }

  static async findAll(): Promise<Client[]> {
    const result = await pool.query('SELECT * FROM clients ORDER BY name ASC');
    return result.rows;
  }

  static async findById(id: number): Promise<Client | null> {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByName(name: string): Promise<Client | null> {
    const n = name.trim();
    if (!n) return null;
    const result = await pool.query('SELECT * FROM clients WHERE name = $1', [n]);
    return result.rows[0] || null;
  }
}

export default ClientModel;
