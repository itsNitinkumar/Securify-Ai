import { Request, Response, NextFunction } from 'express';

type AsyncFunction<T = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

const asyncHandler = <T = Request>(fn: AsyncFunction<T>) => {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
