import type { ValidationError, UploadConfig } from '../types/index.js';

export const validateFileType = (file: File, acceptedTypes: string[]): ValidationError | null => {
  if (acceptedTypes.includes('*/*')) {
    return null;
  }

  const isAccepted = acceptedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.split('/')[0];
      return file.type.startsWith(category + '/');
    }
    return file.type === type;
  });

  if (!isAccepted) {
    return {
      code: 'INVALID_FILE_TYPE',
      message: `File type ${file.type} is not accepted. Accepted types: ${acceptedTypes.join(', ')}`,
      file,
    };
  }

  return null;
};

export const validateFileSize = (file: File, maxSize: number): ValidationError | null => {
  if (file.size > maxSize) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File size ${formatFileSize(file.size)} exceeds maximum allowed size of ${formatFileSize(maxSize)}`,
      file,
    };
  }

  return null;
};

export const validateFileCount = (files: File[], maxFiles: number): ValidationError | null => {
  if (files.length > maxFiles) {
    return {
      code: 'TOO_MANY_FILES',
      message: `Cannot upload ${files.length} files. Maximum allowed: ${maxFiles}`,
    };
  }

  return null;
};

export const validateFiles = (files: File[], config: UploadConfig): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Check file count
  if (config.maxFiles) {
    const countError = validateFileCount(files, config.maxFiles);
    if (countError) {
      errors.push(countError);
      return errors; // Don't validate individual files if count is exceeded
    }
  }

  // Validate each file
  files.forEach(file => {
    // Check file type
    if (config.acceptedFileTypes) {
      const typeError = validateFileType(file, config.acceptedFileTypes);
      if (typeError) {
        errors.push(typeError);
      }
    }

    // Check file size
    if (config.maxFileSize) {
      const sizeError = validateFileSize(file, config.maxFileSize);
      if (sizeError) {
        errors.push(sizeError);
      }
    }
  });

  return errors;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const isAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/');
};

export const isDocumentFile = (file: File): boolean => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  
  return documentTypes.includes(file.type);
};
