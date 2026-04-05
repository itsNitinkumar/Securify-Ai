import { Response } from 'express';
import { ApiResponse as ApiResponseType } from '../types';

class ApiResponse {
  static success<T>(
    res: Response,
    statusCode: number,
    message: string,
    data?: T
  ): Response {
    const response: ApiResponseType<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    statusCode: number,
    message: string
  ): Response {
    const response: ApiResponseType = {
      success: false,
      message,
    };
    return res.status(statusCode).json(response);
  }
}

export default ApiResponse;
