// Core upload types
export interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled'
  progress: number
  error?: string
  url?: string
  metadata?: Record<string, any>
}

export interface UploadConfig {
  maxFiles?: number
  maxFileSize?: number
  acceptedFileTypes?: string[]
  multiple?: boolean
  autoUpload?: boolean
  endpoint?: string
  headers?: Record<string, string>
}

export interface ValidationError {
  code: string
  message: string
  file?: File
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface ImageProcessingOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right'
}

export interface UploadPreset {
  name: string
  maxFileSize: number
  acceptedFileTypes: string[]
  imageProcessing?: ImageProcessingOptions
  validation?: {
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
    aspectRatio?: number
  }
}

// Component prop types
export type UploadMode = 'inline' | 'modal' | 'avatar'

export interface BaseUploadProps {
  mode?: UploadMode
  config?: UploadConfig
  preset?: string | UploadPreset
  onUploadStart?: (files: File[]) => void
  onUploadProgress?: (progress: UploadProgress, file: UploadFile) => void
  onUploadComplete?: (files: UploadFile[]) => void
  onUploadError?: (error: ValidationError | Error, file?: UploadFile) => void
  onFilesChange?: (files: UploadFile[]) => void
  disabled?: boolean
  className?: string
}

// Hook return types
export interface UploadState {
  files: UploadFile[]
  isUploading: boolean
  progress: number
  errors: ValidationError[]
}

// Hook return types are exported from hooks/index.js to avoid circular dependencies

// Utility types
export type FileValidator = (file: File) => ValidationError | null
export type FileProcessor = (file: File, options?: any) => Promise<File | Blob>
export type UploadHandler = (files: File[], config: UploadConfig) => Promise<UploadFile[]>
