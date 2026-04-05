import { config } from './config/env';
import app from './app';
import pool from './config/database';

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📍 Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
