const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const readline = require('readline');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'securifyai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  console.log('\n=== SecurifyAI Admin Account Setup ===\n');

  try {
    // Get admin details
    const name = await question('Admin Name: ');
    const email = await question('Admin Email: ');
    const password = await question('Admin Password (min 12 chars): ');

    // Validate inputs
    if (!name || !email || !password) {
      console.error('\n❌ Error: All fields are required');
      process.exit(1);
    }

    if (password.length < 12) {
      console.error('\n❌ Error: Password must be at least 12 characters long');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`\n⚠️  User with email ${email} already exists`);
      console.log(`   Current role: ${user.role}`);
      
      const upgrade = await question('\nUpgrade this user to admin? (yes/no): ');
      
      if (upgrade.toLowerCase() === 'yes' || upgrade.toLowerCase() === 'y') {
        await pool.query(
          'UPDATE users SET role = $1, status = $2 WHERE id = $3',
          ['admin', 'active', user.id]
        );
        console.log('\n✅ User upgraded to admin successfully!');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${email}`);
        console.log(`   Role: admin`);
      } else {
        console.log('\n❌ Operation cancelled');
      }
      
      rl.close();
      pool.end();
      return;
    }

    // Hash password
    console.log('\n⏳ Creating admin account...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, status, created_at, updated_at) 
       VALUES ($1, $2, $3, 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING id, name, email, role, status, created_at`,
      [name, email, hashedPassword]
    );

    const admin = result.rows[0];

    console.log('\n✅ Admin account created successfully!\n');
    console.log('=== Admin Details ===');
    console.log(`ID:       ${admin.id}`);
    console.log(`Name:     ${admin.name}`);
    console.log(`Email:    ${admin.email}`);
    console.log(`Role:     ${admin.role}`);
    console.log(`Status:   ${admin.status}`);
    console.log(`Created:  ${admin.created_at}`);
    console.log('\n🔐 You can now login with these credentials\n');

  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    pool.end();
  }
}

// Run the script
createAdmin();
