import { useState, useCallback } from 'react';

export interface FileUploadConfig {
  accept?: string | string[];
  maxSizeMB?: number;
  multiple?: boolean;
  onError?: ((error: string) => void) | undefined;
}

export interface FileUploadState {
  files: File[];
  isUploading: boolean;
  errors: string[];
}

export interface FileUploadActions {
  addFiles: (newFiles: File[]) => void;
  removeFile: (file: File) => void;
  clearFiles: () => void;
  upload: (metadata?: Record<string, any>) => Promise<void>;
  validateFiles: (files: File[]) => string[];
}

export const useFileUpload = (
  config: FileUploadConfig,
  onUpload: (files: File[] | File, metadata?: Record<string, any>) => Promise<void> | void
) => {
  const {
    accept = 'image/*',
    maxSizeMB = 20,
    multiple = false,
    onError
  } = config;

  const [state, setState] = useState<FileUploadState>({
    files: [],
    isUploading: false,
    errors: []
  });

  const validateFiles = useCallback((files: File[]): string[] => {
    const errors: string[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    files.forEach((file) => {
      // Check file size
      if (file.size > maxSizeBytes) {
        errors.push(`${file.name} is too large. Maximum size is ${maxSizeMB}MB.`);
      }

      // Check file type
      const acceptArray = Array.isArray(accept) ? accept : [accept];
      const isValidType = acceptArray.some((type) => {
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return baseType && file.type.startsWith(baseType);
        }
        return file.type === type;
      });

      if (!isValidType) {
        errors.push(`${file.name} is not an accepted file type.`);
      }
    });

    return errors;
  }, [accept, maxSizeMB]);

  const addFiles = useCallback((newFiles: File[]) => {
    const validationErrors = validateFiles(newFiles);
    
    if (validationErrors.length > 0) {
      setState(prev => ({ ...prev, errors: validationErrors }));
      validationErrors.forEach(error => onError?.(error));
      return;
    }

    setState(prev => {
      let updatedFiles: File[];
      
      if (multiple) {
        updatedFiles = [...prev.files, ...newFiles];
      } else {
        updatedFiles = newFiles.slice(0, 1);
      }

      return {
        ...prev,
        files: updatedFiles,
        errors: []
      };
    });
  }, [multiple, validateFiles, onError]);

  const removeFile = useCallback((file: File) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f !== file),
      errors: []
    }));
  }, []);

  const clearFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      files: [],
      errors: []
    }));
  }, []);

  const upload = useCallback(async (metadata?: Record<string, any>) => {
    if (state.files.length === 0) {
      const error = 'No files to upload';
      setState(prev => ({ ...prev, errors: [error] }));
      onError?.(error);
      return;
    }

    setState(prev => ({ ...prev, isUploading: true, errors: [] }));

    try {
      const filesToUpload = multiple ? state.files : state.files[0]!;
      await onUpload(filesToUpload, metadata);
      setState(prev => ({ ...prev, isUploading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        errors: [errorMessage] 
      }));
      onError?.(errorMessage);
    }
  }, [state.files, multiple, onUpload, onError]);

  return {
    state,
    actions: {
      addFiles,
      removeFile,
      clearFiles,
      upload,
      validateFiles
    }
  };
}; 