import { z } from 'zod';

// MOC instruction step schema
export const mocStepSchema = z.object({
  id: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, 'Step title is required'),
  description: z.string().min(1, 'Step description is required'),
  imageUrl: z.string().url().optional(),
  imageFile: z.instanceof(File).optional(),
  parts: z.array(z.object({
    partNumber: z.string().min(1, 'Part number is required'),
    quantity: z.number().int().positive(),
    color: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
  estimatedTime: z.number().positive().optional(), // in minutes
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// MOC instruction schema
export const mocInstructionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'MOC title is required'),
  description: z.string().min(1, 'MOC description is required'),
  author: z.string().min(1, 'Author is required'),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  estimatedTime: z.number().positive().optional(), // in hours
  totalParts: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().url().optional(),
  coverImageFile: z.instanceof(File).optional(),
  steps: z.array(mocStepSchema).min(1, 'At least one step is required'),
  partsList: z.array(z.object({
    partNumber: z.string().min(1, 'Part number is required'),
    quantity: z.number().int().positive(),
    color: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
  })).default([]),
  isPublic: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).default(0),
  downloadCount: z.number().int().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create MOC instruction schema
export const createMocInstructionSchema = mocInstructionSchema.omit({
  id: true,
  rating: true,
  reviewCount: true,
  downloadCount: true,
  createdAt: true,
  updatedAt: true,
});

// Update MOC instruction schema
export const updateMocInstructionSchema = createMocInstructionSchema.partial();

// Create MOC step schema
export const createMocStepSchema = mocStepSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update MOC step schema
export const updateMocStepSchema = createMocStepSchema.partial();

// File upload schema for MOC images
export const mocImageUploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= 10 * 1024 * 1024, // 10MB max
    'File size must be less than 10MB'
  ).refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'File must be a valid image (JPEG, PNG, or WebP)'
  ),
  type: z.enum(['cover', 'step']).default('step'),
  stepNumber: z.number().int().positive().optional(),
});

// MOC search and filter schema
export const mocFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minParts: z.number().int().positive().optional(),
  maxParts: z.number().int().positive().optional(),
  minTime: z.number().positive().optional(),
  maxTime: z.number().positive().optional(),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'rating', 'downloadCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  isPublic: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

// MOC review schema
export const mocReviewSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  title: z.string().min(1, 'Review title is required'),
  comment: z.string().min(1, 'Review comment is required'),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create MOC review schema
export const createMocReviewSchema = mocReviewSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update MOC review schema
export const updateMocReviewSchema = createMocReviewSchema.partial();

// MOC parts list schema
export const mocPartsListSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  name: z.string().min(1, 'Parts list name is required'),
  description: z.string().optional(),
  parts: z.array(z.object({
    partNumber: z.string().min(1, 'Part number is required'),
    quantity: z.number().int().positive(),
    color: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    isAvailable: z.boolean().default(true),
    price: z.number().positive().optional(),
  })),
  isPublic: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create MOC parts list schema
export const createMocPartsListSchema = mocPartsListSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update MOC parts list schema
export const updateMocPartsListSchema = createMocPartsListSchema.partial();

// Export types
export type MocStep = z.infer<typeof mocStepSchema>;
export type MocInstruction = z.infer<typeof mocInstructionSchema>;
export type CreateMocInstruction = z.infer<typeof createMocInstructionSchema>;
export type UpdateMocInstruction = z.infer<typeof updateMocInstructionSchema>;
export type CreateMocStep = z.infer<typeof createMocStepSchema>;
export type UpdateMocStep = z.infer<typeof updateMocStepSchema>;
export type MocImageUpload = z.infer<typeof mocImageUploadSchema>;
export type MocFilter = z.infer<typeof mocFilterSchema>;
export type MocReview = z.infer<typeof mocReviewSchema>;
export type CreateMocReview = z.infer<typeof createMocReviewSchema>;
export type UpdateMocReview = z.infer<typeof updateMocReviewSchema>;
export type MocPartsList = z.infer<typeof mocPartsListSchema>;
export type CreateMocPartsList = z.infer<typeof createMocPartsListSchema>;
export type UpdateMocPartsList = z.infer<typeof updateMocPartsListSchema>; 