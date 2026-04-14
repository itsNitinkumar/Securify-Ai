#!/usr/bin/env node

/**
 * Script to create an initial manager account
 * Run this after migrations: node create-initial-manager.js
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createInitialManager() {
  const email = process.env.INITIAL_MANAGER_EMAIL || 'admin@securify.local';
  const password = process.env.INITIAL_MANAGER_PASSWORD || 'ChangeMe123456';
  const name = process.env.INITIAL_MANAGER_NAME || 'System Administrator';

  try {
    // Check if manager already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Initial manager account already exists:', email);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create manager account
    const result = await pool.query(
      `INSERT INTO users (email, name, password, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, role, status`,
      [email, name, hashedPassword, 'manager', 'active']
    );

    console.log('✅ Initial manager account created successfully!');
    console.log('');
    console.log('📧 Email:', result.rows[0].email);
    console.log('🔑 Password:', password);
    console.log('👤 Role:', result.rows[0].role);
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating initial manager:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createInitialManager();
