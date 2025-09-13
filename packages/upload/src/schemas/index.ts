import { z } from 'zod';

// File validation schemas
export const FileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().positive('File size must be positive'),
  type: z.string().min(1, 'File type is required'),
  lastModified: z.number().optional(),
});

export const UploadConfigSchema = z.object({
  maxFiles: z.number().positive().optional().default(10),
  maxFileSize: z.number().positive().optional().default(10 * 1024 * 1024), // 10MB
  acceptedFileTypes: z.array(z.string()).optional().default(['*/*']),
  multiple: z.boolean().optional().default(true),
  autoUpload: z.boolean().optional().default(false),
  endpoint: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
});

export const ImageProcessingOptionsSchema = z.object({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  quality: z.number().min(0).max(100).optional().default(85),
  format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional().default('jpeg'),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional().default('cover'),
  position: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional().default('center'),
});

export const UploadPresetSchema = z.object({
  name: z.string().min(1, 'Preset name is required'),
  maxFileSize: z.number().positive(),
  acceptedFileTypes: z.array(z.string()).min(1, 'At least one file type must be accepted'),
  imageProcessing: ImageProcessingOptionsSchema.optional(),
  validation: z.object({
    minWidth: z.number().positive().optional(),
    minHeight: z.number().positive().optional(),
    maxWidth: z.number().positive().optional(),
    maxHeight: z.number().positive().optional(),
    aspectRatio: z.number().positive().optional(),
  }).optional(),
});

export const ValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  file: z.any().optional(), // File object can't be validated with Zod
});

export const UploadProgressSchema = z.object({
  loaded: z.number().min(0),
  total: z.number().positive(),
  percentage: z.number().min(0).max(100),
});

export const UploadFileSchema = z.object({
  id: z.string().uuid(),
  file: z.any(), // File object can't be validated with Zod
  status: z.enum(['pending', 'uploading', 'processing', 'completed', 'error']),
  progress: z.number().min(0).max(100),
  error: z.string().optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

// Validation functions
export const validateFile = (file: File) => {
  try {
    FileSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.errors[0]?.message || 'File validation failed',
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown validation error',
    };
  }
};

export const validateUploadConfig = (config: any) => {
  try {
    return UploadConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid upload config: ${error.errors[0]?.message}`);
    }
    throw error;
  }
};

export const validateUploadPreset = (preset: any) => {
  try {
    return UploadPresetSchema.parse(preset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid upload preset: ${error.errors[0]?.message}`);
    }
    throw error;
  }
};
