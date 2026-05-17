import pool from '../config/database';

// interface FindingVersion {
//   finding_id: number;
//   version_number: number;
//   title: string;
//   severity: string;
//   description: string;
//   affected_target?: string;
//   likelihood?: any; // JSONB
//   impact?: any; // JSONB
//   steps_to_reproduce?: any;
//   recommendation?: any; // JSONB array
//   references?: any;
//   tags?: any;
//   status: string;
//   created_by: number;
// }

class VersionService {
  static async createVersion(findingId: number, findingData: any, userId: number): Promise<void> {
    // Get current version number
    const versionResult = await pool.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM finding_versions WHERE finding_id = $1',
      [findingId]
    );
    const nextVersion = versionResult.rows[0].max_version + 1;

    // Create new version
    await pool.query(
      `INSERT INTO finding_versions (
        finding_id, version_number, title, severity, description,
        affected_target, likelihood, impact, steps_to_reproduce,
        recommendation, finding_references, tags, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        findingId,
        nextVersion,
        findingData.title,
        findingData.severity,
        findingData.description,
        findingData.affected_target,
        findingData.likelihood ? JSON.stringify(findingData.likelihood) : null,
        findingData.impact ? JSON.stringify(findingData.impact) : null,
        JSON.stringify(findingData.steps_to_reproduce),
        findingData.recommendation ? JSON.stringify(findingData.recommendation) : null,
        JSON.stringify(findingData.references || findingData.finding_references),
        JSON.stringify(findingData.tags),
        findingData.status,
        userId,
      ]
    );
  }

  static async getVersionHistory(findingId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT fv.*, u.name as created_by_name
       FROM finding_versions fv
       LEFT JOIN users u ON fv.created_by = u.id
       WHERE fv.finding_id = $1
       ORDER BY fv.version_number DESC`,
      [findingId]
    );
    return result.rows;
  }

  static async getVersion(findingId: number, versionNumber: number): Promise<any> {
    const result = await pool.query(
      `SELECT fv.*, u.name as created_by_name
       FROM finding_versions fv
       LEFT JOIN users u ON fv.created_by = u.id
       WHERE fv.finding_id = $1 AND fv.version_number = $2`,
      [findingId, versionNumber]
    );
    return result.rows[0] || null;
  }

  static async getLatestVersion(findingId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM finding_versions WHERE finding_id = $1',
      [findingId]
    );
    return result.rows[0].max_version;
  }
}

export default VersionService;
