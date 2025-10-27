// Core validation types
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  code: string
  message: string
  field?: string
  file?: File | Express.Multer.File
}

// File type definitions
export interface FileTypeConfig {
  name: string
  mimeTypes: string[]
  extensions: string[]
  maxSize?: number
  description?: string
  magicBytes?: number[][]
}

export interface FileValidationConfig {
  maxSize?: number
  minSize?: number
  allowedTypes?: string[]
  allowedExtensions?: string[]
  allowedMimeTypes?: string[]
  requireExtensionMatch?: boolean
  allowMimeTypeFallback?: boolean
  customValidators?: FileValidator[]
}

export interface FileValidator {
  name: string
  validate: (file: File | Express.Multer.File) => ValidationError | null
}

// Predefined file type categories
export interface FileTypeRegistry {
  [key: string]: FileTypeConfig
}

// Browser File interface (for frontend)
export interface BrowserFile {
  name: string
  size: number
  type: string
  lastModified?: number
}

// Multer File interface (for backend)
export interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  destination?: string
  filename?: string
  path?: string
  buffer?: Buffer
}

// Universal file interface
export type UniversalFile = BrowserFile | MulterFile

// Validation context
export interface ValidationContext {
  environment: 'browser' | 'node'
  strict?: boolean
  customTypes?: FileTypeRegistry
}

// Multer integration types
export interface MulterValidationOptions extends FileValidationConfig {
  createError?: (message: string) => Error
}

// Magic bytes for file type detection
export interface MagicBytesMap {
  [mimeType: string]: number[][]
}
