import dotenv from 'dotenv';

// Load environment variables once
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'PORT'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Export all config in one place
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    expire: process.env.JWT_EXPIRE || '7d',
  },
} as const;
