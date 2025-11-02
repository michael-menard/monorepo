/**
 * MOC Instructions Type Definitions
 *
 * Zod schemas and TypeScript types for MOC Instructions API.
 * Maintains backward compatibility with existing Express API contracts.
 */

import { z } from 'zod';

/**
 * MOC Instruction Entity Schema
 * Matches database schema and existing API response format
 */
export const MocInstructionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['moc', 'set']),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  author: z.string().min(1).max(255).nullable(),
  brand: z.string().max(255).nullable(),
  theme: z.string().nullable(),
  subtheme: z.string().nullable(),
  setNumber: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  retired: z.boolean().nullable(),
  partsCount: z.number().int().nullable(),
  tags: z.array(z.string()).nullable(),
  thumbnailUrl: z.string().url().nullable(),
  uploadedDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MocInstruction = z.infer<typeof MocInstructionSchema>;

/**
 * Create MOC Schema (Simple - metadata only)
 * Used for POST /api/mocs
 */
export const CreateMocSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().url().optional(),
});

export type CreateMoc = z.infer<typeof CreateMocSchema>;

/**
 * Base schema for MOC creation with files
 */
const BaseCreateWithFilesSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * MOC-specific creation schema
 */
const CreateMocWithFilesSchemaBase = BaseCreateWithFilesSchema.extend({
  type: z.literal('moc'),
  author: z.string().min(1, 'Author is required for MOCs').max(255),
  setNumber: z.string().min(1, 'MOC ID is required'), // e.g., "MOC-172552"
  partsCount: z.number().int().min(1, 'Parts count must be at least 1'),
  theme: z.string().min(1, 'Theme is required'),
  subtheme: z.string().optional(),
  uploadedDate: z.string().datetime().optional(), // ISO string
});

/**
 * Set-specific creation schema
 */
const CreateSetWithFilesSchemaBase = BaseCreateWithFilesSchema.extend({
  type: z.literal('set'),
  brand: z.string().min(1, 'Brand is required for Sets').max(255),
  theme: z.string().min(1, 'Theme is required for Sets'),
  setNumber: z.string().min(1, 'Set number is required'),
  releaseYear: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 2)
    .optional(),
  retired: z.boolean().default(false),
});

/**
 * Discriminated union for MOC/Set creation with files
 */
export const CreateMocWithFilesSchema = z.discriminatedUnion('type', [
  CreateMocWithFilesSchemaBase,
  CreateSetWithFilesSchemaBase,
]);

export type CreateMocWithFiles = z.infer<typeof CreateMocWithFilesSchema>;

/**
 * Update MOC Schema (Partial updates)
 * Used for PATCH /api/mocs/:id
 */
export const UpdateMocSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  author: z.string().min(1).max(255).optional(),
  theme: z.string().optional(),
  subtheme: z.string().optional(),
  partsCount: z.number().int().min(1).optional(),
  tags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().url().optional(),
});

export type UpdateMoc = z.infer<typeof UpdateMocSchema>;

/**
 * MOC List Query Parameters
 * Used for GET /api/mocs
 */
export const MocListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tag: z.string().optional(),
});

export type MocListQuery = z.infer<typeof MocListQuerySchema>;

/**
 * MOC File Entity
 */
export const MocFileSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),
  fileUrl: z.string(),
  originalFilename: z.string().nullable(),
  mimeType: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MocFile = z.infer<typeof MocFileSchema>;

/**
 * MOC Gallery Image (linked from gallery_images table)
 */
export const MocGalleryImageSchema = z.object({
  id: z.string().uuid(),
  galleryImageId: z.string().uuid(),
  url: z.string().url(),
  alt: z.string().nullable(),
  caption: z.string().nullable(),
});

export type MocGalleryImage = z.infer<typeof MocGalleryImageSchema>;

/**
 * MOC Parts List
 */
export const MocPartsListSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileId: z.string().uuid().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  built: z.boolean(),
  purchased: z.boolean(),
  inventoryPercentage: z.string(), // Decimal string
  totalPartsCount: z.string().nullable(),
  acquiredPartsCount: z.string(),
  costEstimate: z.string().nullable(),
  actualCost: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MocPartsList = z.infer<typeof MocPartsListSchema>;

/**
 * MOC Detail Response (includes related entities)
 */
export interface MocDetailResponse extends MocInstruction {
  files: MocFile[];
  images: MocGalleryImage[];
  partsLists: MocPartsList[];
}

/**
 * MOC List Response Format
 * Maintains backward compatibility with existing API
 */
export interface MocListResponse {
  success: true;
  data: MocInstruction[];
  total: number;
  page: number;
  limit: number;
}

/**
 * File Upload Validation
 */
export const FileUploadSchema = z.object({
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;
