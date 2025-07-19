import { Request, Response, NextFunction } from 'express';
import { WishlistUploadError, validateFileSize, validateFileType, getFileInfo } from '../storage/wishlist-storage';
import { apiErrorResponse } from '../utils/response';

// Middleware to handle wishlist upload errors
export const handleWishlistUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Wishlist upload error:', error);

  if (error instanceof WishlistUploadError) {
    return res.status(error.statusCode).json(apiErrorResponse(
      error.statusCode,
      error.statusCode === 413 ? 'FILE_ERROR' : 'VALIDATION_ERROR',
      error.message
    ));
  }

  // Handle multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(apiErrorResponse(
      413,
      'FILE_ERROR',
      `File size too large. Maximum allowed size is 20MB.`
    ));
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json(apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      'Only one file can be uploaded at a time.'
    ));
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json(apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      'Unexpected file field. Please use the correct field name for image upload.'
    ));
  }

  // Generic multer error
  if (error.code && error.code.startsWith('LIMIT_')) {
    return res.status(400).json(apiErrorResponse(
      400,
      'VALIDATION_ERROR',
      error.message || 'File upload validation failed.'
    ));
  }

  // General upload error
  if (error.message && error.message.includes('upload')) {
    return res.status(400).json(apiErrorResponse(
      400,
      'FILE_ERROR',
      error.message
    ));
  }

  // Pass other errors to the general error handler
  next(error);
};

// Middleware to validate uploaded file
export const validateWishlistFile = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json(apiErrorResponse(
        400,
        'VALIDATION_ERROR',
        'No file provided. Please upload an image file.'
      ));
    }

    // Log file info for debugging
    const fileInfo = getFileInfo(req.file);
    console.log('Wishlist file upload info:', fileInfo);

    // Validate file size (additional check beyond multer)
    validateFileSize(req.file.size);

    // Validate file type (additional check beyond multer)
    validateFileType(req.file.mimetype, req.file.originalname);

    next();
  } catch (error) {
    if (error instanceof WishlistUploadError) {
      return res.status(error.statusCode).json(apiErrorResponse(
        error.statusCode,
        error.statusCode === 413 ? 'FILE_ERROR' : 'VALIDATION_ERROR',
        error.message
      ));
    }
    
    next(error);
  }
};

// Middleware to clean up uploaded file on error
export const cleanupWishlistFileOnError = (error: any, req: Request, res: Response, next: NextFunction) => {
  // If there was an uploaded file and an error occurred, clean it up
  if (req.file && error) {
    try {
      const fs = require('fs');
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up uploaded file after error:', req.file.path);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }
  }
  
  next(error);
}; 