import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  errors?: any;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Database connection or buffering error: return 503 Service Unavailable
  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    (err.name === 'MongooseError' && err.message?.includes('buffering timed out'))
  ) {
    console.error(`[Database Error] 503 Service Unavailable - ${err.message}`);
    res.status(503).json({
      success: false,
      message: 'Database service is temporarily unavailable. Please try again shortly.',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error occurred';

  // Log error with details
  console.error(`[Error] ${statusCode} - ${message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.errors ? { errors: err.errors } : {}),
    ...(!config.isProduction && err.stack ? { stack: err.stack } : {}),
  });
};
