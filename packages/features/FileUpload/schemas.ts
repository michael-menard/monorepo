import { z } from 'zod';

// File upload configuration schema
export const FileUploadConfigSchema = z.object({
  accept: z.union([z.string(), z.array(z.string())]).optional(),
  maxSizeMB: z.number().positive().optional(),
  multiple: z.boolean().optional(),
  onError: z.function().optional(),
});

// Metadata field schema
export const MetadataFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

// File upload props schema
export const FileUploadPropsSchema = z.object({
  accept: z.union([z.string(), z.array(z.string())]).optional(),
  maxSizeMB: z.number().positive().optional(),
  multiple: z.boolean().optional(),
  showPreview: z.boolean().optional(),
  showCropper: z.boolean().optional(),
  cropAspectRatio: z.number().positive().optional(),
  onUpload: z
    .function()
    .args(z.union([z.array(z.instanceof(File)), z.instanceof(File)]), z.record(z.any()).optional())
    .returns(z.union([z.promise(z.void()), z.void()])),
  onRemove: z.function().args(z.instanceof(File)).returns(z.void()).optional(),
  onError: z.function().args(z.string()).returns(z.void()).optional(),
  metadataFields: z.array(MetadataFieldSchema).optional(),
  mode: z.enum(['modal', 'inline', 'avatar']).optional(),
  initialFiles: z.array(z.instanceof(File)).optional(),
  uploadButtonLabel: z.string().optional(),
  disabled: z.boolean().optional(),
  className: z.string().optional(),
  dragAreaClassName: z.string().optional(),
  previewClassName: z.string().optional(),
});

// Upload progress schema
export const UploadProgressSchema = z.object({
  file: z.instanceof(File),
  progress: z.number().min(0).max(100),
  status: z.enum(['pending', 'uploading', 'completed', 'error']),
  error: z.string().optional(),
});

// File validation result schema
export const FileValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
});

// TypeScript types inferred from Zod schemas
export type FileUploadConfig = z.infer<typeof FileUploadConfigSchema>;
export type MetadataField = z.infer<typeof MetadataFieldSchema>;
export type FileUploadProps = z.infer<typeof FileUploadPropsSchema>;
export type UploadProgress = z.infer<typeof UploadProgressSchema>;
export type FileValidationResult = z.infer<typeof FileValidationResultSchema>; 