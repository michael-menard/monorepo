// Refactored frontend validation using the file-validator package
import {
  validateFile,
  createLegoInstructionValidationConfig,
  createLegoPartsListValidationConfig,
  createImageValidationConfig,
  formatFileSize,
  getFileExtension,
  isImageFile,
  isDocumentFile,
  isDataFile,
} from '@monorepo/file-validator'

// Validation functions for different file types
export const validateInstructionFile = (file: File): { isValid: boolean; error?: string } => {
  const config = createLegoInstructionValidationConfig()
  const result = validateFile(file, config, { environment: 'browser' })

  return {
    isValid: result.isValid,
    error: result.errors.map(e => e.message).join('; '),
  }
}

export const validatePartsListFile = (file: File): { isValid: boolean; error?: string } => {
  const config = createLegoPartsListValidationConfig()
  const result = validateFile(file, config, { environment: 'browser' })

  return {
    isValid: result.isValid,
    error: result.errors.map(e => e.message).join('; '),
  }
}

export const validateImageFile = (
  file: File,
  maxSize = 10 * 1024 * 1024,
): { isValid: boolean; error?: string } => {
  const config = createImageValidationConfig(maxSize)
  const result = validateFile(file, config, { environment: 'browser' })

  return {
    isValid: result.isValid,
    error: result.errors.map(e => e.message).join('; '),
  }
}

// Enhanced file type detection
export const getFileTypeCategory = (
  file: File,
): 'instruction' | 'parts-list' | 'image' | 'unknown' => {
  if (isImageFile(file)) {
    return 'image'
  }

  if (isDocumentFile(file)) {
    const extension = getFileExtension(file.name)
    if (extension === '.pdf' || extension === '.io') {
      return 'instruction'
    }
  }

  if (isDataFile(file)) {
    return 'parts-list'
  }

  return 'unknown'
}

// File validation for upload components
export const validateUploadFiles = (
  files: File[],
  fileType: 'instruction' | 'parts-list' | 'image',
): { validFiles: File[]; errors: string[] } => {
  const validFiles: File[] = []
  const errors: string[] = []

  for (const file of files) {
    let validation

    switch (fileType) {
      case 'instruction':
        validation = validateInstructionFile(file)
        break
      case 'parts-list':
        validation = validatePartsListFile(file)
        break
      case 'image':
        validation = validateImageFile(file)
        break
      default:
        errors.push(`Unknown file type: ${fileType}`)
        continue
    }

    if (validation.isValid) {
      validFiles.push(file)
    } else {
      errors.push(`${file.name}: ${validation.error}`)
    }
  }

  return { validFiles, errors }
}

// Re-export utility functions for backward compatibility
export { formatFileSize, getFileExtension, isImageFile, isDocumentFile, isDataFile }

// Legacy function mappings for gradual migration
export const validateInstructionFileType = validateInstructionFile
export const validatePartsListFileType = validatePartsListFile
export const getFileTypeLabel = (file: File): string => {
  const category = getFileTypeCategory(file)
  const extension = getFileExtension(file.name)

  switch (category) {
    case 'instruction':
      return extension === '.io' ? 'Stud.io' : 'PDF'
    case 'parts-list':
      return extension.toUpperCase().slice(1) || 'Data'
    case 'image':
      return extension.toUpperCase().slice(1) || 'Image'
    default:
      return 'Unknown'
  }
}

export const getPartsListFileTypeLabel = (file: File): string => {
  const extension = getFileExtension(file.name)

  switch (extension) {
    case '.csv':
      return 'CSV'
    case '.json':
      return 'JSON'
    case '.xml':
      return 'XML'
    case '.txt':
      return 'Text'
    default:
      return 'Data'
  }
}
