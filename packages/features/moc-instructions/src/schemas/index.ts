import { z } from 'zod';

// ============================================================================
// CORE SCHEMAS
// ============================================================================

// Instructions step schema
export const instructionsStepSchema = z.object({
  id: z.string().uuid(),
  instructionsId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, 'Step title is required'),
  description: z.string().min(1, 'Step description is required'),
  imageUrl: z.string().url().optional(),
  imageFile: z.instanceof(File).optional(),
  parts: z
    .array(
      z.object({
        partNumber: z.string().min(1, 'Part number is required'),
        quantity: z.number().int().positive(),
        color: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  notes: z.string().optional(),
  estimatedTime: z.number().positive().optional(), // in minutes
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Instructions schema
export const instructionsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  author: z.string().min(1, 'Author is required'),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  tags: z.array(z.string()).default([]),
  coverImageUrl: z.string().url().optional(),
  coverImageFile: z.instanceof(File).optional(),
  steps: z.array(instructionsStepSchema).min(1, 'At least one step is required'),
  partsList: z
    .array(
      z.object({
        partNumber: z.string().min(1, 'Part number is required'),
        quantity: z.number().int().positive(),
        color: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .default([]),
  isPublic: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  downloadCount: z.number().int().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// CREATE/UPDATE SCHEMAS
// ============================================================================

// Create Instructions schema
export const createInstructionsSchema = instructionsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update Instructions schema
export const updateInstructionsSchema = createInstructionsSchema.partial();

// Create Instructions step schema
export const createInstructionsStepSchema = instructionsStepSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update Instructions step schema
export const updateInstructionsStepSchema = createInstructionsStepSchema.partial();

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

// File upload schema for Instructions images
export const instructionsImageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB max
      'File size must be less than 10MB',
    )
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'File must be a valid image (JPEG, PNG, or WebP)',
    ),
  type: z.enum(['cover', 'step']).default('step'),
  stepNumber: z.number().int().positive().optional(),
});

// ============================================================================
// FILTER AND SEARCH SCHEMAS
// ============================================================================

// Instructions search and filter schema
export const instructionsFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minParts: z.number().int().positive().optional(),
  maxParts: z.number().int().positive().optional(),
  minTime: z.number().positive().optional(),
  maxTime: z.number().positive().optional(),
  sortBy: z
    .enum(['title', 'createdAt', 'updatedAt', 'rating', 'downloadCount'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  isPublic: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

// Instructions review schema
export const instructionsReviewSchema = z.object({
  id: z.string().uuid(),
  instructionsId: z.string().uuid(),
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

// Create Instructions review schema
export const createInstructionsReviewSchema = instructionsReviewSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update Instructions review schema
export const updateInstructionsReviewSchema = createInstructionsReviewSchema.partial();

// ============================================================================
// PARTS LIST SCHEMAS
// ============================================================================

// Instructions parts list schema
export const instructionsPartsListSchema = z.object({
  id: z.string().uuid(),
  instructionsId: z.string().uuid(),
  name: z.string().min(1, 'Parts list name is required'),
  description: z.string().optional(),
  parts: z
    .array(
      z.object({
        partNumber: z.string().min(1, 'Part number is required'),
        quantity: z.number().int().positive(),
        color: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        isAvailable: z.boolean().default(true),
        price: z.number().positive().optional(),
      }),
    )
    .default([]),
  isPublic: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Instructions parts list schema
export const createInstructionsPartsListSchema = instructionsPartsListSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update Instructions parts list schema
export const updateInstructionsPartsListSchema = createInstructionsPartsListSchema.partial();

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

// Sort options schema
export const mockInstructionSortBySchema = z.enum([
  'title',
  'createdAt',
  'updatedAt',
  'rating',
  'downloadCount',
]);

// Category schema
export const mockInstructionCategorySchema = z.enum([
  'vehicles',
  'buildings',
  'characters',
  'scenes',
  'machines',
  'art',
  'other',
]);

// Difficulty levels schema
export const mockInstructionDifficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

export const stepDifficultySchema = z.enum(['easy', 'medium', 'hard']);

// Sort order schema
export const sortOrderSchema = z.enum(['asc', 'desc']);

// Image upload type schema
export const imageUploadTypeSchema = z.enum(['cover', 'step']);

// Form field validation schema
export const formFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.instanceof(RegExp).optional(),
});

// Form field option schema
export const formFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

// Form field schema
export const mockInstructionFormFieldSchema = z.object({
  name: z.string(), // keyof CreateMockInstruction
  label: z.string(),
  type: z.enum(['text', 'textarea', 'number', 'select', 'multiselect', 'file']),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(formFieldOptionSchema).optional(),
  validation: formFieldValidationSchema.optional(),
});

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

// API response schema
export const mockInstructionApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    error: z.string().optional(),
  });

// List response schema
export const mockInstructionListResponseSchema = z.object({
  instructions: z.array(z.any()), // Will be MockInstruction[]
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// Image upload response schema
export const mockInstructionImageUploadResponseSchema = z.object({
  imageUrl: z.string(),
  message: z.string(),
});

// ============================================================================
// COMPONENT PROP SCHEMAS
// ============================================================================

// Drag and drop result schema
export const dragDropResultSchema = z.object({
  sourceIndex: z.number(),
  destinationIndex: z.number(),
  itemId: z.string(),
});

// Component prop schemas
export const mockInstructionCardPropsSchema = z.object({
  instruction: z.any(), // Will be MockInstruction
  onView: z.function().optional(),
  onEdit: z.function().optional(),
  onDelete: z.function().optional(),
  isEditable: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionStepPropsSchema = z.object({
  step: z.any(), // Will be MockInstructionStep
  stepNumber: z.number(),
  onEdit: z.function().optional(),
  onDelete: z.function().optional(),
  isEditable: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionFormPropsSchema = z.object({
  instruction: z.any().optional(), // Will be MockInstruction
  onSubmit: z.function(),
  onCancel: z.function().optional(),
  isLoading: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionStepFormPropsSchema = z.object({
  step: z.any().optional(), // Will be MockInstructionStep
  stepNumber: z.number(),
  onSubmit: z.function(),
  onCancel: z.function().optional(),
  isLoading: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionImageUploadPropsSchema = z.object({
  onUpload: z.function(),
  type: imageUploadTypeSchema,
  stepNumber: z.number().optional(),
  currentImage: z.string().optional(),
  isLoading: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionFilterBarPropsSchema = z.object({
  filters: z.any(), // Will be MockInstructionFilter
  onFilterChange: z.function(),
  onReset: z.function().optional(),
  className: z.string().optional(),
});

export const mockInstructionReviewPropsSchema = z.object({
  review: z.any(), // Will be MockInstructionReview
  onEdit: z.function().optional(),
  onDelete: z.function().optional(),
  isEditable: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionReviewFormPropsSchema = z.object({
  instructionsId: z.string(),
  review: z.any().optional(), // Will be MockInstructionReview
  onSubmit: z.function(),
  onCancel: z.function().optional(),
  isLoading: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionPartsListPropsSchema = z.object({
  partsList: z.any(), // Will be MockInstructionPartsList
  onEdit: z.function().optional(),
  onDelete: z.function().optional(),
  isEditable: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionPartsListFormPropsSchema = z.object({
  instructionsId: z.string(),
  partsList: z.any().optional(), // Will be MockInstructionPartsList
  onSubmit: z.function(),
  onCancel: z.function().optional(),
  isLoading: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionListPropsSchema = z.object({
  instructions: z.array(z.any()), // Will be MockInstruction[]
  onInstructionClick: z.function().optional(),
  onEdit: z.function().optional(),
  onDelete: z.function().optional(),
  isEditable: z.boolean().optional(),
  className: z.string().optional(),
});

export const mockInstructionStepsListPropsSchema = z.object({
  steps: z.array(z.any()), // Will be MockInstructionStep[]
  onStepClick: z.function().optional(),
  onEdit: z.function().optional(),
  onDelete: z.function().optional(),
  onReorder: z.function().optional(),
  isEditable: z.boolean().optional(),
  className: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Core types
export type MockInstructionStep = z.infer<typeof instructionsStepSchema>;
export type MockInstruction = z.infer<typeof instructionsSchema>;
export type CreateMockInstruction = z.infer<typeof createInstructionsSchema>;
export type UpdateMockInstruction = z.infer<typeof updateInstructionsSchema>;
export type CreateMockInstructionStep = z.infer<typeof createInstructionsStepSchema>;
export type UpdateMockInstructionStep = z.infer<typeof updateInstructionsStepSchema>;

// File upload types
export type MockInstructionImageUpload = z.infer<typeof instructionsImageUploadSchema>;

// Filter types
export type MockInstructionFilter = z.infer<typeof instructionsFilterSchema>;

// Review types
export type MockInstructionReview = z.infer<typeof instructionsReviewSchema>;
export type CreateMockInstructionReview = z.infer<typeof createInstructionsReviewSchema>;
export type UpdateMockInstructionReview = z.infer<typeof updateInstructionsReviewSchema>;

// Parts list types
export type MockInstructionPartsList = z.infer<typeof instructionsPartsListSchema>;
export type CreateMockInstructionPartsList = z.infer<typeof createInstructionsPartsListSchema>;
export type UpdateMockInstructionPartsList = z.infer<typeof updateInstructionsPartsListSchema>;

// Utility types
export type MockInstructionSortBy = z.infer<typeof mockInstructionSortBySchema>;
export type MockInstructionCategory = z.infer<typeof mockInstructionCategorySchema>;
export type MockInstructionDifficulty = z.infer<typeof mockInstructionDifficultySchema>;
export type StepDifficulty = z.infer<typeof stepDifficultySchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;
export type ImageUploadType = z.infer<typeof imageUploadTypeSchema>;

// Form field types
export type MockInstructionFormField = z.infer<typeof mockInstructionFormFieldSchema>;

// API response types
export type MockInstructionApiResponse<T extends z.ZodTypeAny> = z.infer<
  ReturnType<typeof mockInstructionApiResponseSchema<T>>
>;
export type MockInstructionListResponse = z.infer<typeof mockInstructionListResponseSchema>;
export type MockInstructionImageUploadResponse = z.infer<
  typeof mockInstructionImageUploadResponseSchema
>;

// Component prop types
export type DragDropResult = z.infer<typeof dragDropResultSchema>;
export type MockInstructionCardProps = z.infer<typeof mockInstructionCardPropsSchema>;
export type MockInstructionStepProps = z.infer<typeof mockInstructionStepPropsSchema>;
export type MockInstructionFormProps = z.infer<typeof mockInstructionFormPropsSchema>;
export type MockInstructionStepFormProps = z.infer<typeof mockInstructionStepFormPropsSchema>;
export type MockInstructionImageUploadProps = z.infer<typeof mockInstructionImageUploadPropsSchema>;
export type MockInstructionFilterBarProps = z.infer<typeof mockInstructionFilterBarPropsSchema>;
export type MockInstructionReviewProps = z.infer<typeof mockInstructionReviewPropsSchema>;
export type MockInstructionReviewFormProps = z.infer<typeof mockInstructionReviewFormPropsSchema>;
export type MockInstructionPartsListProps = z.infer<typeof mockInstructionPartsListPropsSchema>;
export type MockInstructionPartsListFormProps = z.infer<
  typeof mockInstructionPartsListFormPropsSchema
>;
export type MockInstructionListProps = z.infer<typeof mockInstructionListPropsSchema>;
export type MockInstructionStepsListProps = z.infer<typeof mockInstructionStepsListPropsSchema>;
