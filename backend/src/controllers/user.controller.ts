import { Request, Response } from 'express';
import UserService from '../services/user.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';

class UserController {
  static getUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await UserService.getAllUsers();
    ApiResponse.success(res, 200, 'Users retrieved successfully', users);
  });

  static getUser = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = await UserService.getUserById(id);
    ApiResponse.success(res, 200, 'User retrieved successfully', user);
  });

  static createUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, name } = req.body;
    const user = await UserService.createUser(email, name);
    ApiResponse.success(res, 201, 'User created successfully', user);
  });

  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    const user = await UserService.updateUser(id, name);
    ApiResponse.success(res, 200, 'User updated successfully', user);
  });

  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await UserService.deleteUser(id);
    ApiResponse.success(res, 200, 'User deleted successfully');
  });
}

export default UserController;
