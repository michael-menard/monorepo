import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Not Found - ${req.originalUrl}`
  });
};

export const errorHandler: ErrorRequestHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  // Handle mongoose duplicate key error
  // @ts-ignore
  if (err.code === 11000) {
    err.statusCode = 400;
    err.message = 'Duplicate resource found';
  }

  const statusCode = err.statusCode || 500;

  console.error(`[ERROR] ${statusCode} - ${err.message}`);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}; 