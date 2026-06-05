import { Pool, types } from 'pg';
import { config } from './env';

// Force the Node process to UTC so that `new Date(naiveTimestampString)` parses the value
// as UTC (not the server's local timezone). The database stores TIMESTAMP (no tz) values
// that we want to treat as UTC consistently across environments.
process.env.TZ = 'UTC';

// Force TIMESTAMPTZ (oid 1184) and TIMESTAMP (oid 1114) to be returned as ISO 8601 UTC strings
// so the frontend can correctly convert to the user's local timezone.
types.setTypeParser(1114, (val) => new Date(`${val}Z`).toISOString());
types.setTypeParser(1184, (val) => new Date(val).toISOString());

const pool = new Pool({
  connectionString: config.database.url,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 30, // Increased pool size for report generation
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000, // 30 seconds to acquire connection
  query_timeout: 300000, // 5 minute query timeout for report generation with large images
  statement_timeout: 300000, // 5 minute statement timeout
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  // Don't exit process, just log the error
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('Database connection test successful'))
  .catch((err) => console.error('Database connection test failed:', err.message));

// Keep connection warm with periodic pings (every 5 minutes)
// This helps avoid cold starts on Neon free tier
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection keepalive ping');
    } catch (err: any) {
      console.error('Keepalive ping failed:', err.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

export default pool;
