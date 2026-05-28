import pool from '../config/database';

interface Finding {
  id: number;
  project_id: number;
  title: string;
  severity: string;
  description: string;
  affected_target?: string;
  likelihood?: { severity: string; detail: string }; // JSONB: {severity: string, detail: string}
  impact?: { severity: string; detail: string }; // JSONB: {severity: string, detail: string}
  steps_to_reproduce?: Array<{
    stepNumber: number;
    description: string;
    imageKey?: string;  // S3 key, not signed URL
    caption?: string;
  }>; // JSONB array - stores S3 keys for images
  recommendation?: string[]; // JSONB array - AI-generated recommendations
  remediation?: string; // TEXT - deprecated, kept for backward compatibility
  references?: string[]; // JSONB array - AI-generated references
  finding_references?: string[]; // JSONB array - deprecated
  tags?: string[];
  status: string;
  created_by?: number;
  approved_by?: number;
  reviewed_by?: number;
  created_at: Date;
  updated_at: Date;
  finding_type?: string; // 'true_positive' | 'false_positive'
  validation_status?: string; // 'confirmed' | 'false_positive' | 'inconclusive' | null
  evidence_items?: Array<{
    imageKey?: string;
    caption?: string;
  }>; // JSONB array for false positive evidence
}

class FindingModel {
  static async create(data: Partial<Finding>): Promise<Finding> {
    const result = await pool.query(
      `INSERT INTO findings (
        project_id, title, severity, description, affected_target,
        likelihood, impact, steps_to_reproduce,
        recommendation, "references", finding_references, tags, created_by, status,
        finding_type, validation_status, evidence_items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        data.project_id,
        data.title,
        data.severity,
        data.description,
        data.affected_target,
        data.likelihood ? JSON.stringify(data.likelihood) : null,
        data.impact ? JSON.stringify(data.impact) : null,
        data.steps_to_reproduce ? JSON.stringify(data.steps_to_reproduce) : null,
        data.recommendation ? JSON.stringify(data.recommendation) : null,
        data.references ? JSON.stringify(data.references) : null,
        data.references ? JSON.stringify(data.references) : null, // Also save to finding_references for backward compatibility
        data.tags ? JSON.stringify(data.tags) : null,
        data.created_by,
        data.status || 'draft', // fallback to draft if missing
        data.finding_type || 'true_positive',
        data.validation_status || null,
        data.evidence_items ? JSON.stringify(data.evidence_items) : '[]',
      ]
    );
    return result.rows[0];
  }

  static async findById(id: number): Promise<Finding | null> {
    const result = await pool.query(
      'SELECT id, project_id, title, severity, description, affected_target, likelihood, impact, steps_to_reproduce, recommendation, "references", finding_references, tags, status, created_by, approved_by, reviewed_by, created_at, updated_at, finding_type, validation_status, evidence_items FROM findings WHERE id = $1',
      [id]
    );
    
    const finding = result.rows[0];
    if (finding) {
      console.log('🔍 Raw finding from DB:', {
        id: finding.id,
        status: finding.status,
        statusType: typeof finding.status,
        statusLength: finding.status?.length,
        statusTrimmed: finding.status?.trim(),
        likelihood: finding.likelihood,
        likelihoodType: typeof finding.likelihood,
        impact: finding.impact,
        impactType: typeof finding.impact,
        recommendation: finding.recommendation,
        recommendationType: typeof finding.recommendation,
        references: finding.references,
        referencesType: typeof finding.references,
        steps_to_reproduce: finding.steps_to_reproduce,
        stepsType: typeof finding.steps_to_reproduce,
      });
    }
    
    return finding || null;
  }

  static async findAll(filters: any = {}): Promise<Finding[]> {
    console.log('🔍 FindingModel.findAll called with filters:', filters);
    let query = 'SELECT id, project_id, title, severity, description, affected_target, likelihood, impact, steps_to_reproduce, recommendation, "references", finding_references, tags, status, created_by, approved_by, reviewed_by, created_at, updated_at, finding_type, validation_status, evidence_items FROM findings WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.severity) {
      query += ` AND severity = $${paramIndex}`;
      params.push(filters.severity);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.project_id) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(filters.project_id);
      paramIndex++;
    }

    if (filters.created_by) {
      query += ` AND created_by = $${paramIndex}`;
      params.push(filters.created_by);
      paramIndex++;
    }

    if (filters.finding_type) {
      query += ` AND finding_type = $${paramIndex}`;
      params.push(filters.finding_type);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';
    console.log('🔍 Query:', query);
    console.log('🔍 Params:', params);

    const start = Date.now();
    const result = await pool.query(query, params);
    console.log(`✅ Query completed in ${Date.now() - start}ms, returned ${result.rows.length} rows`);
    return result.rows;
  }

  static async update(id: number, data: Partial<Finding>): Promise<Finding> {
    console.log('📝 Updating finding with data:', {
      id,
      likelihood: data.likelihood,
      likelihoodType: typeof data.likelihood,
      impact: data.impact,
      impactType: typeof data.impact,
      recommendation: data.recommendation,
      recommendationType: typeof data.recommendation,
      references: data.references,
      referencesType: typeof data.references,
    });

    const result = await pool.query(
      `UPDATE findings SET
        title = COALESCE($1, title),
        severity = COALESCE($2, severity),
        description = COALESCE($3, description),
        affected_target = COALESCE($4, affected_target),
        likelihood = COALESCE($5, likelihood),
        impact = COALESCE($6, impact),
        steps_to_reproduce = COALESCE($7, steps_to_reproduce),
        recommendation = COALESCE($8, recommendation),
        "references" = COALESCE($9, "references"),
        finding_references = COALESCE($10, finding_references),
        tags = COALESCE($11, tags),
        status = COALESCE($12, status),
        approved_by = COALESCE($13, approved_by),
        reviewed_by = COALESCE($14, reviewed_by),
        finding_type = COALESCE($15, finding_type),
        validation_status = COALESCE($16, validation_status),
        evidence_items = COALESCE($17, evidence_items),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *`,
      [
        data.title,
        data.severity,
        data.description,
        data.affected_target,
        data.likelihood ? JSON.stringify(data.likelihood) : null,
        data.impact ? JSON.stringify(data.impact) : null,
        data.steps_to_reproduce ? JSON.stringify(data.steps_to_reproduce) : null,
        data.recommendation ? JSON.stringify(data.recommendation) : null,
        data.references ? JSON.stringify(data.references) : null,
        data.references ? JSON.stringify(data.references) : null, // Also update finding_references
        data.tags ? JSON.stringify(data.tags) : null,
        data.status,
        data.approved_by,
        data.reviewed_by,
        data.finding_type,
        data.validation_status,
        data.evidence_items ? JSON.stringify(data.evidence_items) : null,
        id,
      ]
    );
    
    console.log('✅ Updated finding result:', {
      id: result.rows[0].id,
      likelihood: result.rows[0].likelihood,
      likelihoodType: typeof result.rows[0].likelihood,
      impact: result.rows[0].impact,
      impactType: typeof result.rows[0].impact,
    });
    
    return result.rows[0];
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM findings WHERE id = $1', [id]);
  }
}

export default FindingModel;
