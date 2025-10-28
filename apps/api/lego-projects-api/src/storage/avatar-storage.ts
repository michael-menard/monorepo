import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { canProcessImage, processImage, THUMBNAIL_CONFIG } from '../utils/imageProcessor'

// S3 Configuration
const BUCKET = process.env.S3_BUCKET!
const REGION = process.env.S3_REGION!
const s3 = new S3Client({ region: REGION })

const USE_S3 = process.env.NODE_ENV !== 'development'

// Avatar file type configurations
export const AVATAR_FILE_TYPES = {
  AVATAR: 'avatar',
} as const

export type AvatarFileType = (typeof AVATAR_FILE_TYPES)[keyof typeof AVATAR_FILE_TYPES]

export const ALLOWED_AVATAR_EXTENSIONS: Record<AvatarFileType, string[]> = {
  [AVATAR_FILE_TYPES.AVATAR]: ['.jpg', '.jpeg', '.heic'],
}

export const ALLOWED_AVATAR_MIME_TYPES: Record<AvatarFileType, string[]> = {
  [AVATAR_FILE_TYPES.AVATAR]: ['image/jpeg', 'image/jpg', 'image/heic'],
}

// Maximum file size for avatars (10MB)
export const MAX_AVATAR_SIZE = 10 * 1024 * 1024 // 10MB

// Local storage configuration for avatar files
const avatarLocalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.sub
    const uploadPath = `uploads/avatars/${userId}`
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uniqueId = uuidv4()
    cb(null, `avatar-${uniqueId}${ext}`)
  },
})

// Multer configuration for avatar uploads
export const avatarUpload = multer({
  storage: USE_S3 ? multer.memoryStorage() : avatarLocalStorage,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ALLOWED_AVATAR_MIME_TYPES[AVATAR_FILE_TYPES.AVATAR]

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(
        new Error(
          `File type ${file.mimetype} not allowed for avatars. Only .jpg, .jpeg, and .heic files are supported.`,
        ),
      )
    }
  },
})

// S3 Upload function for avatars
export async function uploadAvatarToS3(userId: string, file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname)
  const key = `users/${userId}/avatars/avatar-${uuidv4()}${ext}`

  let fileBuffer = file.buffer
  let contentType = file.mimetype
  let finalExt = ext

  // Process images to ensure consistent format
  if (canProcessImage(file.mimetype)) {
    try {
      fileBuffer = await processImage(file.buffer, THUMBNAIL_CONFIG)
      contentType = 'image/jpeg'
      finalExt = '.jpg'
    } catch (error) {
      console.error('Image processing failed, using original:', error)
    }
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'private', // Avatars are private to the user
    }),
  )

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
}

// Delete avatar from S3
export async function deleteAvatarFromS3(fileUrl: string): Promise<void> {
  const match = fileUrl.match(/\/users\/.*\/avatars\/.*$/)
  if (!match) return

  const key = match[0].replace(/^\//, '')
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  )
}

// Get signed URL for avatar download
export async function getAvatarSignedUrl(
  fileUrl: string,
  expiresIn: number = 3600,
): Promise<string> {
  const match = fileUrl.match(/\/users\/.*\/avatars\/.*$/)
  if (!match) throw new Error('Invalid avatar file URL')

  const key = match[0].replace(/^\//, '')
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  })

  return await getSignedUrl(s3, command, { expiresIn })
}

// Local storage functions
export function getLocalAvatarUrl(filePath: string): string {
  return `/uploads/avatars/${filePath}`
}

export function deleteLocalAvatar(filePath: string): void {
  const fullPath = path.join(process.cwd(), 'uploads', 'avatars', filePath)

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath)
  }
}

// Enhanced avatar download functionality
export interface AvatarDownloadInfo {
  url: string
  filename: string
  mimeType: string
  size?: number
  expiresAt?: Date
}

export async function getAvatarDownloadInfo(
  fileUrl: string,
  originalFilename: string,
  mimeType: string,
  expiresIn: number = 3600,
): Promise<AvatarDownloadInfo> {
  if (USE_S3) {
    const signedUrl = await getAvatarSignedUrl(fileUrl, expiresIn)
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    return {
      url: signedUrl,
      filename: originalFilename,
      mimeType,
      expiresAt,
    }
  } else {
    // For local development, return the file path
    return {
      url: fileUrl,
      filename: originalFilename,
      mimeType,
    }
  }
}

// Stream avatar for direct download (for local files)
export function streamLocalAvatar(
  fileUrl: string,
): { stream: fs.ReadStream; filename: string; mimeType: string } | null {
  try {
    // Extract local path from URL
    const localPath = fileUrl.replace('/uploads/avatars/', '')
    const fullPath = path.join(process.cwd(), 'uploads', 'avatars', localPath)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const stream = fs.createReadStream(fullPath)

    // Determine MIME type from file extension
    const ext = path.extname(fullPath).toLowerCase()
    let mimeType = 'image/jpeg' // Default to JPEG

    if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg'
    else if (ext === '.heic') mimeType = 'image/heic'

    return {
      stream,
      filename: path.basename(fullPath),
      mimeType,
    }
  } catch (error) {
    console.error('Error streaming local avatar:', error)
    return null
  }
}

// Check if avatar exists
export async function checkAvatarExists(fileUrl: string): Promise<boolean> {
  if (USE_S3) {
    try {
      const match = fileUrl.match(/\/users\/.*\/avatars\/.*$/)
      if (!match) return false

      const key = match[0].replace(/^\//, '')
      await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: key,
        }),
      )
      return true
    } catch (error) {
      return false
    }
  } else {
    const localPath = fileUrl.replace('/uploads/avatars/', '')
    const fullPath = path.join(process.cwd(), 'uploads', 'avatars', localPath)
    return fs.existsSync(fullPath)
  }
}

// Main storage interface
export async function uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
  if (USE_S3) {
    return await uploadAvatarToS3(userId, file)
  } else {
    // For local development, return the file path
    const ext = path.extname(file.originalname)
    const uniqueId = uuidv4()
    return `/uploads/avatars/${userId}/avatar-${uniqueId}${ext}`
  }
}

export async function deleteAvatar(fileUrl: string): Promise<void> {
  if (USE_S3) {
    await deleteAvatarFromS3(fileUrl)
  } else {
    const localPath = fileUrl.replace('/uploads/avatars/', '')
    deleteLocalAvatar(localPath)
  }
}

export async function getAvatarDownloadUrl(fileUrl: string): Promise<string> {
  if (USE_S3) {
    return await getAvatarSignedUrl(fileUrl)
  } else {
    return fileUrl
  }
}

// Validation functions
export function validateAvatarFileType(fileType: string): fileType is AvatarFileType {
  return Object.values(AVATAR_FILE_TYPES).includes(fileType as AvatarFileType)
}

export function validateAvatarFileExtension(filename: string, fileType: AvatarFileType): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ALLOWED_AVATAR_EXTENSIONS[fileType].includes(ext)
}

export function validateAvatarMimeType(mimetype: string, fileType: AvatarFileType): boolean {
  return ALLOWED_AVATAR_MIME_TYPES[fileType].includes(mimetype)
}

// File size validation
export function validateAvatarFileSize(fileSize: number): boolean {
  return fileSize <= MAX_AVATAR_SIZE
}
