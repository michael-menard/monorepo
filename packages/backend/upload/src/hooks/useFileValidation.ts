import { useCallback } from 'react'
import type { ValidationError, UploadConfig } from '../types/index.js'
import { validateFiles } from '../utils/validation.js'

export interface UseFileValidationOptions {
  config: UploadConfig
}

export interface UseFileValidationReturn {
  validateFiles: (files: File[]) => ValidationError[]
  validateFile: (file: File) => ValidationError[]
}

export const useFileValidation = (options: UseFileValidationOptions): UseFileValidationReturn => {
  const validateFilesCallback = useCallback(
    (files: File[]) => {
      return validateFiles(files, options.config)
    },
    [options.config],
  )

  const validateFile = useCallback(
    (file: File) => {
      return validateFiles([file], options.config)
    },
    [options.config],
  )

  return {
    validateFiles: validateFilesCallback,
    validateFile,
  }
}
