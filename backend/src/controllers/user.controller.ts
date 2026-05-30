import { Request, Response } from 'express';
import UserModel from '../models/user.model';
import UserService from '../services/user.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

class UserController {
  static getUsers = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    let users = await UserService.getAllUsers();
    
    // If manager, filter out admins and other managers
    if (currentUser.role === 'manager') {
      users = users.filter(user => 
        user.role !== 'admin' && user.role !== 'manager'
      );
    }
    
    ApiResponse.success(res, 200, 'Users retrieved successfully', users);
  });

  static getUser = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const currentUser = (req as any).user;
    const user = await UserService.getUserById(id);
    
    // Manager cannot view admin or other manager details
    if (currentUser.role === 'manager' && (user.role === 'admin' || user.role === 'manager')) {
      throw new ApiError(403, 'You do not have permission to view this user');
    }
    
    ApiResponse.success(res, 200, 'User retrieved successfully', user);
  });

  static getReporters = asyncHandler(async (_req: Request, res: Response) => {
    const reporters = await UserModel.findByRoleSlug('reporter');
    ApiResponse.success(res, 200, 'Reporters retrieved successfully', reporters);
  });

  static createUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, name, role } = req.body;
    const currentUser = (req as any).user;
    
    // Default role is 'client'
    const userRole = role || 'client';
    
    // Manager can only create client or reporter
    if (currentUser.role === 'manager' && !['client', 'reporter'].includes(userRole)) {
      throw new ApiError(403, 'Managers can only create client or reporter users');
    }
    
    // Only admin can create managers
    if (userRole === 'manager' && currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admin can create managers');
    }
    
    // Only admin can create admins
    if (userRole === 'admin' && currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admin can create admins');
    }
    
    const user = await UserService.createUser(email, name);
    ApiResponse.success(res, 201, 'User created successfully', user);
  });

  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const { name, role } = req.body;
    const currentUser = (req as any).user;
    
    // Get the user being updated
    const userToUpdate = await UserService.getUserById(id);
    
    // Manager cannot edit their own role
    if (currentUser.role === 'manager' && id === currentUser.id) {
      throw new ApiError(403, 'You cannot edit your own role');
    }
    
    // Manager cannot edit admin roles
    if (currentUser.role === 'manager' && userToUpdate.role === 'admin') {
      throw new ApiError(403, 'Managers cannot edit admin users');
    }
    
    // Manager cannot edit other managers
    if (currentUser.role === 'manager' && userToUpdate.role === 'manager') {
      throw new ApiError(403, 'Managers cannot edit other managers');
    }
    
    // Only admin and manager can change roles
    if (role && currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      throw new ApiError(403, 'Only admin and manager can change user roles');
    }
    
    // Only admin can create/modify managers
    if (role === 'manager' && currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admin can create or modify managers');
    }
    
    // Only admin can create/modify admins
    if (role === 'admin' && currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admin can create or modify admins');
    }
    
    // Manager can only assign client or reporter roles
    if (currentUser.role === 'manager' && role && !['client', 'reporter'].includes(role)) {
      throw new ApiError(403, 'Managers can only assign client or reporter roles');
    }
    
    const user = await UserService.updateUser(id, name, role);
    ApiResponse.success(res, 200, 'User updated successfully', user);
  });

  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const currentUser = (req as any).user;
    
    // Get user to delete
    const userToDelete = await UserService.getUserById(id);
    
    // Cannot delete yourself
    if (id === currentUser.id) {
      throw new ApiError(400, 'Cannot delete your own account');
    }
    
    // Manager cannot delete admins
    if (currentUser.role === 'manager' && userToDelete.role === 'admin') {
      throw new ApiError(403, 'Managers cannot delete admin users');
    }
    
    // Manager cannot delete other managers
    if (currentUser.role === 'manager' && userToDelete.role === 'manager') {
      throw new ApiError(403, 'Managers cannot delete other managers');
    }
    
    // Manager can only delete client or reporter
    if (currentUser.role === 'manager') {
      if (!['client', 'reporter'].includes(userToDelete.role)) {
        throw new ApiError(403, 'Managers can only delete client or reporter users');
      }
    }
    
    await UserService.deleteUser(id);
    ApiResponse.success(res, 200, 'User deleted successfully');
  });

  static approveUser = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const { role } = req.body;
    const currentUser = (req as any).user;
    
    // Validate role
    if (!role || !['client', 'reporter', 'manager'].includes(role)) {
      throw new ApiError(400, 'Invalid role. Must be client, reporter, or manager');
    }
    
    // Only admin can approve managers
    if (role === 'manager' && currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admin can approve users as managers');
    }
    
    const user = await UserService.approveUser(id, role);
    ApiResponse.success(res, 200, 'User approved successfully', user);
  });

  // Admin only: Create manager
  static createManager = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const currentUser = (req as any).user;
    
    // Only admin can create managers
    if (currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admin can create managers');
    }
    
    if (!name || !email || !password) {
      throw new ApiError(400, 'Name, email, and password are required');
    }
    
    // Validate password strength
    if (password.length < 12) {
      throw new ApiError(400, 'Password must be at least 12 characters long');
    }
    
    const manager = await UserService.createManager(name, email, password);
    ApiResponse.success(res, 201, 'Manager created successfully', manager);
  });

  // Admin only: Delete manager
  static deleteManager = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const currentUser = (req as any).user;
    
    // Only admin can delete managers
    if (currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admin can delete managers');
    }
    
    // Cannot delete yourself
    if (id === currentUser.id) {
      throw new ApiError(400, 'Cannot delete your own account');
    }
    
    await UserService.deleteManager(id);
    ApiResponse.success(res, 200, 'Manager deleted successfully');
  });
}

export default UserController;
