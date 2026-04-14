#!/usr/bin/env node

/**
 * Test the signup flow to verify pending status
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testSignupFlow() {
  try {
    // Check a newly created user's status
    const testEmail = 'test-pending@example.com';
    
    const result = await pool.query(
      'SELECT id, email, name, role, status FROM users WHERE email = $1',
      [testEmail]
    );

    if (result.rows.length > 0) {
      console.log('\n📊 Test User Status:\n');
      console.table(result.rows);
    } else {
      console.log('\n❌ Test user not found. Try signing up with:', testEmail);
    }

    // Check all users and their statuses
    const allUsers = await pool.query(
      'SELECT id, email, name, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );

    console.log('\n📊 Recent Users:\n');
    console.table(allUsers.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testSignupFlow();
