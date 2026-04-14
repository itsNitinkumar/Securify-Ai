import UserModel from '../models/user.model';
import { User } from '../types';
import ApiError from '../utils/ApiError';

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
}

export default UserService;
