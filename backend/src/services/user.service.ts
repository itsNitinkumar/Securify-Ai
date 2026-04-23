import UserModel from '../models/user.model';
import { User } from '../types';
import ApiError from '../utils/ApiError';
import bcrypt from 'bcryptjs';

class UserService {
  static async getAllUsers(): Promise<User[]> {
    return await UserModel.findAll();
  }

  static async getUserById(id: number): Promise<User> {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  static async createUser(email: string, name: string): Promise<User> {
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }
    return await UserModel.create(email, name);
  }

  static async updateUser(id: number, name: string, role?: string): Promise<User> {
    const user = await UserModel.update(id, name, role);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  static async deleteUser(id: number): Promise<void> {
    const deleted = await UserModel.delete(id);
    if (!deleted) {
      throw new ApiError(404, 'User not found');
    }
  }

  static async approveUser(id: number, role?: string): Promise<User> {
    const user = await UserModel.approve(id, role);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  // Admin only: Create manager with credentials
  static async createManager(name: string, email: string, password: string): Promise<User> {
    // Check if user exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create manager with active status
    const manager = await UserModel.createManager(name, email, hashedPassword);
    return manager;
  }

  // Admin only: Delete manager
  static async deleteManager(id: number): Promise<void> {
    // Verify user is a manager
    const user = await UserModel.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    if (user.role !== 'manager') {
      throw new ApiError(400, 'User is not a manager');
    }

    const deleted = await UserModel.delete(id);
    if (!deleted) {
      throw new ApiError(404, 'Manager not found');
    }
  }
}

export default UserService;
