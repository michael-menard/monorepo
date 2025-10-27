// Multer integration for Node.js/Express applications
import type { MulterValidationOptions, FileValidationConfig, ValidationContext } from './types.js'
import { validateFile } from './validators.js'

// Multer file filter factory
export function createMulterFileFilter(
  config: FileValidationConfig,
  options: MulterValidationOptions = {},
) {
  const context: ValidationContext = { environment: 'node', ...options }

  return (
    _req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    const validation = validateFile(file, config, context)

    if (!validation.isValid) {
      const errorMessage = validation.errors.map(e => e.message).join('; ')
      const error = options.createError
        ? options.createError(errorMessage)
        : new Error(errorMessage)
      return cb(error)
    }

    cb(null, true)
  }
}

// Multer storage helpers
export function createMulterDestination(
  baseDir: string,
  getSubDir: (req: any, file: Express.Multer.File) => string,
) {
  return (
    req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    try {
      const subDir = getSubDir(req, file)
      const fullPath = `${baseDir}/${subDir}`

      // Ensure directory exists (you'll need to import fs)
      const fs = require('fs')
      fs.mkdirSync(fullPath, { recursive: true })

      cb(null, fullPath)
    } catch (error) {
      cb(error as Error, '')
    }
  }
}

export function createMulterFilename(
  getBaseName?: (req: any, file: Express.Multer.File) => string,
) {
  return (
    req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    try {
      const { v4: uuidv4 } = require('uuid')
      const path = require('path')

      const ext = path.extname(file.originalname)
      const baseName = getBaseName ? getBaseName(req, file) : path.basename(file.originalname, ext)

      // Sanitize filename: replace spaces and special characters with hyphens
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
      const uniqueId = uuidv4()
      const filename = `${sanitizedBaseName}-${uniqueId}${ext}`

      cb(null, filename)
    } catch (error) {
      cb(error as Error, '')
    }
  }
}

// Preset multer configurations
export function createImageMulterConfig(uploadDir: string, maxSize = 20 * 1024 * 1024) {
  const multer = require('multer')

  return multer({
    storage: multer.diskStorage({
      destination: createMulterDestination(uploadDir, () => 'images'),
      filename: createMulterFilename(),
    }),
    limits: { fileSize: maxSize },
    fileFilter: createMulterFileFilter({
      allowedTypes: ['image-jpeg', 'image-png', 'image-webp', 'image-heic'],
      maxSize,
      requireExtensionMatch: true,
    }),
  })
}

export function createDocumentMulterConfig(uploadDir: string, maxSize = 50 * 1024 * 1024) {
  const multer = require('multer')

  return multer({
    storage: multer.diskStorage({
      destination: createMulterDestination(uploadDir, () => 'documents'),
      filename: createMulterFilename(),
    }),
    limits: { fileSize: maxSize },
    fileFilter: createMulterFileFilter({
      allowedTypes: ['document-pdf', 'document-text'],
      maxSize,
      requireExtensionMatch: true,
    }),
  })
}

export function createLegoInstructionMulterConfig(
  uploadDir: string,
  getUserId: (req: any) => string,
) {
  const multer = require('multer')

  return multer({
    storage: multer.diskStorage({
      destination: createMulterDestination(uploadDir, req => `${getUserId(req)}/instructions`),
      filename: createMulterFilename(),
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: createMulterFileFilter({
      allowedTypes: ['lego-instruction'],
      maxSize: 50 * 1024 * 1024,
      allowMimeTypeFallback: true,
    }),
  })
}

export function createLegoPartsListMulterConfig(
  uploadDir: string,
  getUserId: (req: any) => string,
) {
  const multer = require('multer')

  return multer({
    storage: multer.diskStorage({
      destination: createMulterDestination(uploadDir, req => `${getUserId(req)}/parts-list`),
      filename: createMulterFilename(),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: createMulterFileFilter({
      allowedTypes: ['lego-parts-list'],
      maxSize: 10 * 1024 * 1024,
      allowMimeTypeFallback: true,
    }),
  })
}
