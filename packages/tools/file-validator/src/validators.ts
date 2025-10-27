import type {
  ValidationResult,
  ValidationError,
  FileValidationConfig,
  UniversalFile,
  ValidationContext,
} from './types.js'
import { FILE_TYPES, MAGIC_BYTES } from './file-types.js'

// Core validation functions
export function validateFile(
  file: UniversalFile,
  config: FileValidationConfig,
  context: ValidationContext = { environment: 'browser' },
): ValidationResult {
  const errors: ValidationError[] = []

  // Basic file validation
  if (!file) {
    errors.push({
      code: 'FILE_REQUIRED',
      message: 'File is required',
    })
    return { isValid: false, errors }
  }

  // File size validation
  if (config.maxSize && file.size > config.maxSize) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: `File size ${formatFileSize(file.size)} exceeds maximum allowed size of ${formatFileSize(config.maxSize)}`,
      file: file as any,
    })
  }

  if (config.minSize && file.size < config.minSize) {
    errors.push({
      code: 'FILE_TOO_SMALL',
      message: `File size ${formatFileSize(file.size)} is below minimum required size of ${formatFileSize(config.minSize)}`,
      file: file as any,
    })
  }

  // File type validation
  const fileName = getFileName(file)
  const mimeType = getMimeType(file)
  const extension = getFileExtension(fileName)

  // Validate against allowed types (if specified)
  if (config.allowedTypes && config.allowedTypes.length > 0) {
    const typeValidation = validateFileTypes(file, config.allowedTypes, context)
    errors.push(...typeValidation.errors)
  }

  // Validate MIME type (if specified)
  if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
    if (!config.allowedMimeTypes.includes(mimeType)) {
      // Check if extension matches when MIME type doesn't (fallback for CSV files, etc.)
      if (config.allowMimeTypeFallback && config.allowedExtensions) {
        if (!config.allowedExtensions.includes(extension)) {
          errors.push({
            code: 'INVALID_MIME_TYPE',
            message: `File type ${mimeType} with extension ${extension} is not allowed. Allowed MIME types: ${config.allowedMimeTypes.join(', ')}`,
            file: file as any,
          })
        }
      } else {
        errors.push({
          code: 'INVALID_MIME_TYPE',
          message: `File type ${mimeType} is not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
          file: file as any,
        })
      }
    }
  }

  // Validate file extension (if specified)
  if (config.allowedExtensions && config.allowedExtensions.length > 0) {
    if (!config.allowedExtensions.includes(extension)) {
      errors.push({
        code: 'INVALID_EXTENSION',
        message: `File extension ${extension} is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`,
        file: file as any,
      })
    }
  }

  // Validate extension matches MIME type (if required)
  if (config.requireExtensionMatch) {
    const extensionMatchError = validateExtensionMimeTypeMatch(fileName, mimeType)
    if (extensionMatchError) {
      errors.push(extensionMatchError)
    }
  }

  // Run custom validators
  if (config.customValidators) {
    for (const validator of config.customValidators) {
      const error = validator.validate(file as any)
      if (error) {
        errors.push(error)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateFileTypes(
  file: UniversalFile,
  allowedTypes: string[],
  context: ValidationContext,
): ValidationResult {
  const errors: ValidationError[] = []
  const fileName = getFileName(file)
  const mimeType = getMimeType(file)
  const extension = getFileExtension(fileName)

  let isValidType = false

  for (const typeKey of allowedTypes) {
    const typeConfig = FILE_TYPES[typeKey] || context.customTypes?.[typeKey]

    if (!typeConfig) {
      // If it's not a predefined type, treat it as a direct MIME type
      if (mimeType === typeKey || typeKey === '*/*' || typeKey.endsWith('/*')) {
        if (typeKey.endsWith('/*')) {
          const category = typeKey.split('/')[0]
          if (mimeType.startsWith(category + '/')) {
            isValidType = true
            break
          }
        } else {
          isValidType = true
          break
        }
      }
      continue
    }

    // Check MIME type match
    if (typeConfig.mimeTypes.includes(mimeType)) {
      isValidType = true
      break
    }

    // Check extension match (fallback for MIME type detection issues)
    if (typeConfig.extensions.includes(extension)) {
      isValidType = true
      break
    }
  }

  if (!isValidType) {
    errors.push({
      code: 'INVALID_FILE_TYPE',
      message: `File type ${mimeType} with extension ${extension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      file: file as any,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateExtensionMimeTypeMatch(
  fileName: string,
  mimeType: string,
): ValidationError | null {
  const extension = getFileExtension(fileName)

  // Find file type configs that match the extension
  const matchingTypes = Object.values(FILE_TYPES).filter(config =>
    config.extensions.includes(extension),
  )

  if (matchingTypes.length === 0) {
    return null // Unknown extension, can't validate
  }

  // Check if any matching type supports this MIME type
  const isValidMimeType = matchingTypes.some(config => config.mimeTypes.includes(mimeType))

  if (!isValidMimeType) {
    const expectedMimeTypes = matchingTypes.flatMap(config => config.mimeTypes)
    return {
      code: 'MIME_TYPE_EXTENSION_MISMATCH',
      message: `File extension ${extension} does not match MIME type ${mimeType}. Expected MIME types: ${expectedMimeTypes.join(', ')}`,
    }
  }

  return null
}

// Magic bytes validation (for enhanced security)
export function validateMagicBytes(buffer: Buffer | ArrayBuffer, mimeType: string): boolean {
  const magicBytes = MAGIC_BYTES[mimeType]
  if (!magicBytes) {
    return true // No magic bytes defined, skip validation
  }

  const bytes = new Uint8Array(buffer instanceof Buffer ? buffer : buffer)

  return magicBytes.some(signature => signature.every((byte, index) => bytes[index] === byte))
}

// Preset configurations for common use cases
export function createImageValidationConfig(maxSize = 20 * 1024 * 1024): FileValidationConfig {
  return {
    allowedTypes: ['image-jpeg', 'image-png', 'image-webp', 'image-heic'],
    maxSize,
    requireExtensionMatch: true,
  }
}

export function createDocumentValidationConfig(maxSize = 50 * 1024 * 1024): FileValidationConfig {
  return {
    allowedTypes: ['document-pdf', 'document-text'],
    maxSize,
    requireExtensionMatch: true,
  }
}

export function createLegoInstructionValidationConfig(): FileValidationConfig {
  return {
    allowedTypes: ['lego-instruction'],
    maxSize: 50 * 1024 * 1024,
    allowMimeTypeFallback: true,
  }
}

export function createLegoPartsListValidationConfig(): FileValidationConfig {
  return {
    allowedTypes: ['lego-parts-list'],
    maxSize: 10 * 1024 * 1024,
    allowMimeTypeFallback: true,
  }
}

// Utility functions
export function getFileName(file: UniversalFile): string {
  return 'name' in file ? file.name : file.originalname
}

export function getMimeType(file: UniversalFile): string {
  return 'type' in file ? file.type : file.mimetype
}

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot === -1 ? '' : fileName.slice(lastDot).toLowerCase()
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// File type detection helpers
export function isImageFile(file: UniversalFile): boolean {
  const mimeType = getMimeType(file)
  return mimeType.startsWith('image/')
}

export function isDocumentFile(file: UniversalFile): boolean {
  const mimeType = getMimeType(file)
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]
  return documentTypes.includes(mimeType)
}

export function isDataFile(file: UniversalFile): boolean {
  const mimeType = getMimeType(file)
  return ['text/csv', 'application/json', 'application/xml', 'text/xml'].includes(mimeType)
}
