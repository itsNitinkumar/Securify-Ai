import dotenv from 'dotenv';

// Load environment variables once
dotenv.config();

// Validate required environment variables
//have to change it durnign the google drive upload
const requiredEnvVars = ['DATABASE_URL',
  'PORT',
  'JWT_SECRET',
  'JWT_EXPIRE'
,
  'FRONTEND_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Export all config in one place
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173' || "https://your-frontend-url.onrender.com",
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expire: process.env.JWT_EXPIRE!,
  },
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT || '1800000', 10), // 30 minutes default
    warningTime: parseInt(process.env.SESSION_WARNING_TIME || '300000', 10), // 5 minutes warning
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
  },
  gemini: {
    apikey:process.env.GEMINI_API_KEY || ''
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  googleDrive: {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || '',
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3BucketName: process.env.S3_BUCKET_NAME || '',
  },
};
