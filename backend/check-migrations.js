const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkMigrations() {
  try {
    console.log('🔍 Checking migration status...\n');
    
    const result = await pool.query(
      'SELECT * FROM pgmigrations ORDER BY run_on DESC'
    );
    
    if (result.rows.length === 0) {
      console.log('No migrations have been run yet.');
    } else {
      console.log('Migrations that have been run:');
      console.log('================================');
      result.rows.forEach(row => {
        console.log(`✅ ${row.name} (run on: ${row.run_on})`);
      });
    }
    
    console.log('\n📁 Migration files in directory:');
    console.log('================================');
    const fs = require('fs');
    const files = fs.readdirSync('./migrations')
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    files.forEach(file => {
      const timestamp = file.split('_')[0];
      const isRun = result.rows.some(row => row.name === file.replace('.sql', ''));
      console.log(`${isRun ? '✅' : '⏳'} ${file}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMigrations();
