const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SEED_USERS = [
  {
    name: 'Test Admin',
    email: 'test-admin@securify.com',
    password: 'TestAdmin@123',
    roleSlug: 'admin',
    roleName: 'admin',
  },
  {
    name: 'Test Manager',
    email: 'test-manager@securify.com',
    password: 'TestManager@123',
    roleSlug: 'manager',
    roleName: 'manager',
  },
  {
    name: 'Test Reporter',
    email: 'test-reporter@securify.com',
    password: 'TestRep@123',
    roleSlug: 'reporter',
    roleName: 'reporter',
  },
  {
    name: 'Test Client',
    email: 'test-client@securify.com',
    password: 'TestClient@123',
    roleSlug: 'client',
    roleName: 'client',
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const user of SEED_USERS) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (existing.rows.length > 0) {
        console.log(`User ${user.email} already exists, skipping.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);

      const result = await client.query(
        `INSERT INTO users (name, email, password, role, status, role_id)
         VALUES ($1, $2, $3, $4, 'active', (SELECT id FROM roles WHERE slug = $5))
         RETURNING id, email, role, role_id`,
        [user.name, user.email, hashedPassword, user.roleName, user.roleSlug]
      );

      console.log(`Created: ${result.rows[0].email} (role_id=${result.rows[0].role_id}, role=${result.rows[0].role})`);
    }

    // Assign test-client to a company if companies exist
    const companies = await client.query('SELECT id, name FROM companies LIMIT 1');
    if (companies.rows.length > 0) {
      const companyId = companies.rows[0].id;
      await client.query(
        `UPDATE users SET company_id = $1
         WHERE email = 'test-client@securify.com' AND company_id IS NULL`,
        [companyId]
      );
      console.log(`Assigned test-client to company: ${companies.rows[0].name} (id=${companyId})`);
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
