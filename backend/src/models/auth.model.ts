import pool from '../config/database';

interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  oauth_provider?: string;
  oauth_id?: string;
  created_at: Date;
  updated_at: Date;
}

// Helper function to retry database queries
async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1;
      const isRetryableError = 
        error.message?.includes('timeout') || 
        error.message?.includes('Connection terminated') ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT';

      if (isLastAttempt || !isRetryableError) {
        throw error;
      }

      console.log(`⚠️  Database query failed (attempt ${i + 1}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

class AuthModel {
  static async findByEmail(email: string): Promise<User | null> {
    return retryQuery(async () => {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    });
  }

  static async findById(id: number): Promise<User | null> {
    return retryQuery(async () => {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    });
  }

  static async create(name: string, email: string, password: string): Promise<User> {
    return retryQuery(async () => {
      const result = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
        [name, email, password]
      );
      return result.rows[0];
    });
  }

  static async createOAuthUser(name: string, email: string, provider: string, oauthId: string): Promise<User> {
    return retryQuery(async () => {
      const result = await pool.query(
        'INSERT INTO users (name, email, oauth_provider, oauth_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, provider, oauthId]
      );
      return result.rows[0];
    });
  }
}

export default AuthModel;
