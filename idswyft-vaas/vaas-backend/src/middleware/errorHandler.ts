import { Request, Response, NextFunction } from 'express';
import { VaasApiResponse } from '../types/index.js';

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  const response: VaasApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error'
    }
  };
  
  res.status(500).json(response);
};