import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AuthModel from '../models/auth.model';
import { config } from '../config/env';
import ApiError from '../utils/ApiError';

class AuthService {
  static async signup(name: string, email: string, password: string) {
    // Check if user exists
    const existingUser = await AuthModel.findByEmail(email);
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Validate password strength
    if (password.length < 12) {
      throw new ApiError(400, 'Password must be at least 12 characters long');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await AuthModel.create(name, email, hashedPassword);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      token,
    };
  }

  static async signin(email: string, password: string) {
    // Find user
    const user = await AuthModel.findByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      token,
    };
  }

  static async getProfile(userId: number) {
    const user = await AuthModel.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    };
  }
}

export default AuthService;
