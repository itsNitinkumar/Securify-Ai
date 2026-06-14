import pool from '../config/database';

interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
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

      console.log(`Database query failed (attempt ${i + 1}/${maxRetries}), retrying in ${delay}ms...`);
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
      // Get the reporter role_id (default role for all new users)
      const roleResult = await pool.query(
        "SELECT id FROM roles WHERE slug = 'reporter' LIMIT 1"
      );
      
      if (roleResult.rows.length === 0) {
        throw new Error('Reporter role not found in database');
      }
      
      const reporterRoleId = roleResult.rows[0].id;
      
      // Create user with reporter role and pending status (awaiting approval)
      const result = await pool.query(
        'INSERT INTO users (name, email, password, role, role_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, email, password, 'reporter', reporterRoleId, 'pending']
      );
      
      console.log('✅ User created with reporter role (pending approval):', {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        role_id: result.rows[0].role_id,
        status: result.rows[0].status
      });
      
      return result.rows[0];
    });
  }

  static async createOAuthUser(name: string, email: string, provider: string, oauthId: string): Promise<User> {
    return retryQuery(async () => {
      // Get the reporter role_id (default role for all new users)
      const roleResult = await pool.query(
        "SELECT id FROM roles WHERE slug = 'reporter' LIMIT 1"
      );
      
      if (roleResult.rows.length === 0) {
        throw new Error('Reporter role not found in database');
      }
      
      const reporterRoleId = roleResult.rows[0].id;
      
      // Create user with reporter role and active status
      const result = await pool.query(
        'INSERT INTO users (name, email, oauth_provider, oauth_id, role, role_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, email, provider, oauthId, 'reporter', reporterRoleId, 'active']
      );
      
      console.log('✅ OAuth user created with reporter role:', {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        role_id: result.rows[0].role_id,
        status: result.rows[0].status
      });
      
      return result.rows[0];
    });
  }
}

export default AuthModel;
