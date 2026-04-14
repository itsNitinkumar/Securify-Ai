import pool from '../config/database';

interface Evidence {
  id: number;
  finding_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  caption?: string;
  uploaded_by?: number;
  created_at: Date;
}

class EvidenceModel {
  static async create(data: Partial<Evidence>): Promise<Evidence> {
    const result = await pool.query(
      `INSERT INTO evidence (
        finding_id, filename, original_filename, file_path,
        file_type, file_size, caption, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.finding_id,
        data.filename,
        data.original_filename,
        data.file_path,
        data.file_type,
        data.file_size,
        data.caption,
        data.uploaded_by,
      ]
    );
    return result.rows[0];
  }

  static async findByFindingId(findingId: number): Promise<Evidence[]> {
    const result = await pool.query(
      'SELECT * FROM evidence WHERE finding_id = $1 ORDER BY created_at DESC',
      [findingId]
    );
    return result.rows;
  }

  static async findById(id: number): Promise<Evidence | null> {
    const result = await pool.query('SELECT * FROM evidence WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM evidence WHERE id = $1', [id]);
  }

  static async updateCaption(id: number, caption: string): Promise<Evidence> {
    const result = await pool.query(
      'UPDATE evidence SET caption = $1 WHERE id = $2 RETURNING *',
      [caption, id]
    );
    return result.rows[0];
  }
}

export default EvidenceModel;
