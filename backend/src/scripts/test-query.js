const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  query_timeout: 30000,
});

async function test() {
  console.log('🔍 Testing query performance...');
  
  const start = Date.now();
  const result = await pool.query(
    'SELECT id, project_id, title, severity, description, affected_target, likelihood, impact, steps_to_reproduce, recommendation, "references", finding_references, tags, status, created_by, approved_by, reviewed_by, created_at, updated_at FROM findings WHERE project_id = $1 AND status = $2 ORDER BY created_at DESC',
    [10, 'approved']
  );
  console.log(`✅ Full query: ${Date.now() - start}ms, rows:`, result.rows.length);
  console.log('Sample finding:', result.rows[0]);
  
  await pool.end();
}

test().catch(console.error);