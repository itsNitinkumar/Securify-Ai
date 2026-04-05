import { Pool } from 'pg';
import { config } from './env';

const pool = new Pool({
  connectionString: config.database.url,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error(' Unexpected database error:', err);
  process.exit(-1);
});

export default pool;
