import type { UploadPreset } from '../types/index.js';

// Predefined upload presets based on the existing shared-image-utils
export const UPLOAD_PRESETS: Record<string, UploadPreset> = {
  avatar: {
    name: 'avatar',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
    imageProcessing: {
      width: 200,
      height: 200,
      quality: 90,
      format: 'webp',
      fit: 'cover',
      position: 'center',
    },
    validation: {
      minWidth: 100,
      minHeight: 100,
      maxWidth: 2000,
      maxHeight: 2000,
      aspectRatio: 1, // Square images only
    },
  },

  thumbnail: {
    name: 'thumbnail',
    maxFileSize: 3 * 1024 * 1024, // 3MB
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
    imageProcessing: {
      width: 150,
      height: 150,
      quality: 85,
      format: 'webp',
      fit: 'cover',
      position: 'center',
    },
    validation: {
      minWidth: 50,
      minHeight: 50,
      maxWidth: 1500,
      maxHeight: 1500,
    },
  },

  gallery: {
    name: 'gallery',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageProcessing: {
      width: 800,
      height: 800,
      quality: 85,
      format: 'webp',
      fit: 'inside',
      position: 'center',
    },
    validation: {
      minWidth: 200,
      minHeight: 200,
      maxWidth: 4000,
      maxHeight: 4000,
    },
  },

  hero: {
    name: 'hero',
    maxFileSize: 15 * 1024 * 1024, // 15MB
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageProcessing: {
      width: 1200,
      height: 800,
      quality: 90,
      format: 'webp',
      fit: 'cover',
      position: 'center',
    },
    validation: {
      minWidth: 600,
      minHeight: 400,
      maxWidth: 5000,
      maxHeight: 5000,
    },
  },

  background: {
    name: 'background',
    maxFileSize: 20 * 1024 * 1024, // 20MB
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageProcessing: {
      width: 1920,
      height: 1080,
      quality: 85,
      format: 'webp',
      fit: 'cover',
      position: 'center',
    },
    validation: {
      minWidth: 800,
      minHeight: 600,
      maxWidth: 6000,
      maxHeight: 6000,
    },
  },

  document: {
    name: 'document',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    acceptedFileTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ],
    validation: {},
  },

  general: {
    name: 'general',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    acceptedFileTypes: ['*/*'], // Accept all file types
    validation: {},
  },
};

export const getPreset = (name: string): UploadPreset | undefined => {
  return UPLOAD_PRESETS[name];
};

export const getPresetNames = (): string[] => {
  return Object.keys(UPLOAD_PRESETS);
};

export const isImagePreset = (preset: UploadPreset): boolean => {
  return preset.acceptedFileTypes.some(type => type.startsWith('image/'));
};

export const getImagePresets = (): UploadPreset[] => {
  return Object.values(UPLOAD_PRESETS).filter(isImagePreset);
};
