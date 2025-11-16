import path from 'path'
import { createLogger } from '../utils/logger'
const logger = createLogger('wishlist-storage')
import fs from 'fs'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { uploadWishlistImageToS3, deleteWishlistImageFromS3 } from './s3'

const uploadsDir = 'uploads'
const wishlistDir = path.join(uploadsDir, 'wishlist')

// Ensure wishlist uploads directory exists
if (!fs.existsSync(wishlistDir)) {
  fs.mkdirSync(wishlistDir, { recursive: true })
}

const USE_S3 = process.env.NODE_ENV !== 'development'

// Supported file types for wishlist images
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/heic']

// 20MB file size limit
const MAX_FILE_SIZE = 20 * 1024 * 1024

// Local storage configuration for wishlist images
export const wishlistLocalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific directory structure
    const userId = req.authenticatedUserId || req.user?.sub || 'unknown'
    const userDir = path.join(wishlistDir, userId)

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true })
    }

    cb(null, userDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const filename = `wishlist-${uuidv4()}${ext}`
    cb(null, filename)
  },
})

// Custom error types for better error handling
export class WishlistUploadError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'WishlistUploadError'
  }
}

// File filter with detailed validation
export const wishlistFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Check file type
  if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new WishlistUploadError(
        `Unsupported file type: ${file.mimetype}. Only JPEG and HEIC files are supported.`,
        400,
      ),
    )
  }

  // Additional validation based on file extension
  const ext = path.extname(file.originalname).toLowerCase()
  const allowedExtensions = ['.jpg', '.jpeg', '.heic']

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new WishlistUploadError(
        `Unsupported file extension: ${ext}. Only .jpg, .jpeg, and .heic files are supported.`,
        400,
      ),
    )
  }

  cb(null, true)
}

// Multer configuration for wishlist images
export const wishlistImageUpload = multer({
  storage: USE_S3 ? multer.memoryStorage() : wishlistLocalStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow one file at a time
  },
  fileFilter: wishlistFileFilter,
})

// Save wishlist image (handles both S3 and local storage)
export async function saveWishlistImage(
  userId: string,
  file: Express.Multer.File,
): Promise<string> {
  if (USE_S3) {
    return uploadWishlistImageToS3(userId, file)
  } else {
    // For local storage, return the relative URL
    return getLocalWishlistImageUrl(userId, file.filename)
  }
}

// Get local wishlist image URL
export function getLocalWishlistImageUrl(userId: string, filename: string): string {
  return `/uploads/wishlist/${userId}/${filename}`
}

// Delete wishlist image (handles both S3 and local storage)
export async function deleteWishlistImage(imageUrl: string): Promise<void> {
  if (USE_S3) {
    await deleteWishlistImageFromS3(imageUrl)
  } else {
    deleteLocalWishlistImage(imageUrl)
  }
}

// Delete local wishlist image file
export function deleteLocalWishlistImage(imageUrl: string): void {
  try {
    const filePath = path.join(
      process.cwd(),
      imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl,
    )
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    logger.error('Error deleting local wishlist image:', error)
    // Don't throw error for cleanup operations
  }
}

// Validate file size manually (useful for additional checks)
export function validateFileSize(fileSize: number): void {
  if (fileSize > MAX_FILE_SIZE) {
    throw new WishlistUploadError(
      `File size too large: ${Math.round(fileSize / (1024 * 1024))}MB. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      413,
    )
  }
}

// Validate file type manually (useful for additional checks)
export function validateFileType(mimetype: string, originalname: string): void {
  if (!SUPPORTED_MIME_TYPES.includes(mimetype)) {
    throw new WishlistUploadError(
      `Unsupported file type: ${mimetype}. Only JPEG and HEIC files are supported.`,
      400,
    )
  }

  const ext = path.extname(originalname).toLowerCase()
  const allowedExtensions = ['.jpg', '.jpeg', '.heic']

  if (!allowedExtensions.includes(ext)) {
    throw new WishlistUploadError(
      `Unsupported file extension: ${ext}. Only .jpg, .jpeg, and .heic files are supported.`,
      400,
    )
  }
}

// Get file info for debugging/logging
export function getFileInfo(file: Express.Multer.File) {
  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    sizeInMB: Math.round((file.size / (1024 * 1024)) * 100) / 100,
    extension: path.extname(file.originalname).toLowerCase(),
  }
}
