// Refactored MOC storage using the new file-validator package
import path from 'path'
import { createLogger } from '../utils/logger'
const logger = createLogger('moc-storage-refactored')
import fs from 'fs'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import {
  createMulterFileFilter,
  createLegoInstructionMulterConfig,
  createLegoPartsListMulterConfig,
  createImageMulterConfig,
} from '@monorepo/file-validator/dist/multer'
import {
  createLegoInstructionValidationConfig,
  createLegoPartsListValidationConfig,
  createImageValidationConfig,
} from '@monorepo/file-validator'

const USE_S3 = process.env.NODE_ENV !== 'development'

// Helper function to get user ID from request
const getUserId = (req: any): string => req.user?.sub || req.user?.id || 'anonymous'

// Base upload directory
const UPLOAD_BASE_DIR = 'uploads/moc-files'

// Refactored multer configurations using the file-validator package
export const mocInstructionUpload = createLegoInstructionMulterConfig(UPLOAD_BASE_DIR, getUserId)

export const mocPartsListUpload = createLegoPartsListMulterConfig(UPLOAD_BASE_DIR, getUserId)

export const mocThumbnailUpload = createImageMulterConfig(
  `${UPLOAD_BASE_DIR}/thumbnails`,
  5 * 1024 * 1024, // 5MB for thumbnails
)

// Multi-field upload configuration for modal uploads
export const mocModalUpload = multer({
  storage: USE_S3
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
          const userId = getUserId(req)
          let subDir = ''

          switch (file.fieldname) {
            case 'instructionsFile':
              subDir = 'instructions'
              break
            case 'partsLists':
              subDir = 'parts-list'
              break
            case 'images':
              subDir = 'images'
              break
            default:
              return cb(new Error(`Unexpected field: ${file.fieldname}`), '')
          }

          const uploadPath = `${UPLOAD_BASE_DIR}/${userId}/${subDir}`
          fs.mkdirSync(uploadPath, { recursive: true })
          cb(null, uploadPath)
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname)
          const baseName = path.basename(file.originalname, ext)
          const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
          const uniqueId = uuidv4()
          cb(null, `${sanitizedBaseName}-${uniqueId}${ext}`)
        },
      }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 25, // Max 25 files total
  },
  fileFilter: (req, file, cb) => {
    logger.info('🔍 File filter - fieldname:', file.fieldname, 'mimetype:', file.mimetype)

    // Create appropriate file filter based on field name
    let fileFilter: (req: any, file: Express.Multer.File, cb: any) => void

    switch (file.fieldname) {
      case 'instructionsFile':
        fileFilter = createMulterFileFilter(createLegoInstructionValidationConfig())
        break
      case 'partsLists':
        fileFilter = createMulterFileFilter(createLegoPartsListValidationConfig())
        break
      case 'images':
        fileFilter = createMulterFileFilter(createImageValidationConfig(10 * 1024 * 1024))
        break
      default:
        return cb(new Error(`Unexpected field: ${file.fieldname}`))
    }

    // Use the appropriate file filter
    fileFilter(req, file, cb)
  },
})

// Legacy compatibility - these can be gradually replaced
export const MOC_FILE_TYPES = {
  INSTRUCTION: 'instruction',
  PARTS_LIST: 'parts-list',
  THUMBNAIL: 'thumbnail',
  GALLERY_IMAGE: 'gallery-image',
} as const

export type MocFileType = (typeof MOC_FILE_TYPES)[keyof typeof MOC_FILE_TYPES]

// Validation functions using the new package
export function validateMocFile(
  file: Express.Multer.File,
  fileType: MocFileType,
): { isValid: boolean; error?: string } {
  let config

  switch (fileType) {
    case MOC_FILE_TYPES.INSTRUCTION:
      config = createLegoInstructionValidationConfig()
      break
    case MOC_FILE_TYPES.PARTS_LIST:
      config = createLegoPartsListValidationConfig()
      break
    case MOC_FILE_TYPES.THUMBNAIL:
    case MOC_FILE_TYPES.GALLERY_IMAGE:
      config = createImageValidationConfig()
      break
    default:
      return { isValid: false, error: `Unknown file type: ${fileType}` }
  }

  const { validateFile } = require('@monorepo/file-validator')
  const result = validateFile(file, config, { environment: 'node' })

  return {
    isValid: result.isValid,
    error: result.errors.map((e: any) => e.message).join('; '),
  }
}

// S3 upload functions (unchanged for now, but could be enhanced with validation)
// ... existing S3 functions would remain the same ...
