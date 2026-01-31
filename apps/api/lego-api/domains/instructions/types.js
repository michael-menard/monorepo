import { z } from 'zod';
/**
 * Instructions Domain Types
 *
 * Zod schemas for MOC Instructions validation + type inference
 */
// ─────────────────────────────────────────────────────────────────────────
// Core Enums and Constants
// ─────────────────────────────────────────────────────────────────────────
export const InstructionTypeSchema = z.enum(['moc', 'set']);
export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);
export const StatusSchema = z.enum(['draft', 'published', 'archived', 'pending_review']);
export const VisibilitySchema = z.enum(['public', 'private', 'unlisted']);
export const FileTypeSchema = z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']);
// ─────────────────────────────────────────────────────────────────────────
// Nested JSONB Schemas
// ─────────────────────────────────────────────────────────────────────────
export const DesignerSchema = z.object({
    username: z.string(),
    displayName: z.string().nullable().optional(),
    profileUrl: z.string().url().nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    socialLinks: z
        .object({
        instagram: z.string().nullable().optional(),
        twitter: z.string().nullable().optional(),
        youtube: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
    })
        .nullable()
        .optional(),
});
export const DimensionsSchema = z.object({
    height: z
        .object({
        cm: z.number().nullable().optional(),
        inches: z.number().nullable().optional(),
    })
        .nullable()
        .optional(),
    width: z
        .object({
        cm: z.number().nullable().optional(),
        inches: z.number().nullable().optional(),
        openCm: z.number().nullable().optional(),
        openInches: z.number().nullable().optional(),
    })
        .nullable()
        .optional(),
    depth: z
        .object({
        cm: z.number().nullable().optional(),
        inches: z.number().nullable().optional(),
        openCm: z.number().nullable().optional(),
        openInches: z.number().nullable().optional(),
    })
        .nullable()
        .optional(),
    weight: z
        .object({
        kg: z.number().nullable().optional(),
        lbs: z.number().nullable().optional(),
    })
        .nullable()
        .optional(),
    studsWidth: z.number().nullable().optional(),
    studsDepth: z.number().nullable().optional(),
});
export const InstructionsMetadataSchema = z.object({
    instructionType: z.enum(['pdf', 'xml', 'studio', 'ldraw', 'lxf', 'other']).nullable().optional(),
    hasInstructions: z.boolean(),
    pageCount: z.number().int().nullable().optional(),
    fileSize: z.number().int().nullable().optional(),
    previewImages: z.array(z.string()),
});
export const FeatureSchema = z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
});
// ─────────────────────────────────────────────────────────────────────────
// MOC Instructions Entity
// ─────────────────────────────────────────────────────────────────────────
export const MocInstructionsSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    type: InstructionTypeSchema,
    // Core Identification
    mocId: z.string().nullable(),
    slug: z.string().nullable(),
    // MOC-specific fields
    author: z.string().nullable(),
    partsCount: z.number().int().nullable(),
    minifigCount: z.number().int().nullable(),
    theme: z.string().nullable(),
    themeId: z.number().int().nullable(),
    subtheme: z.string().nullable(),
    uploadedDate: z.date().nullable(),
    // Set-specific fields
    brand: z.string().nullable(),
    setNumber: z.string().nullable(),
    releaseYear: z.number().int().nullable(),
    retired: z.boolean().nullable(),
    // Extended Metadata
    designer: DesignerSchema.nullable(),
    dimensions: DimensionsSchema.nullable(),
    instructionsMetadata: InstructionsMetadataSchema.nullable(),
    features: z.array(FeatureSchema).nullable(),
    // Rich Description
    descriptionHtml: z.string().nullable(),
    shortDescription: z.string().nullable(),
    // Difficulty & Build Info
    difficulty: DifficultySchema.nullable(),
    buildTimeHours: z.number().int().nullable(),
    ageRecommendation: z.string().nullable(),
    // Status & Visibility
    status: StatusSchema,
    visibility: VisibilitySchema,
    isFeatured: z.boolean(),
    isVerified: z.boolean(),
    // Common fields
    tags: z.array(z.string()).nullable(),
    thumbnailUrl: z.string().nullable(),
    totalPieceCount: z.number().int().nullable(),
    // Timestamps
    publishedAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
// ─────────────────────────────────────────────────────────────────────────
// MOC Files Entity
// ─────────────────────────────────────────────────────────────────────────
export const MocFileSchema = z.object({
    id: z.string().uuid(),
    mocId: z.string().uuid(),
    fileType: z.string(),
    fileUrl: z.string().url(),
    originalFilename: z.string().nullable(),
    mimeType: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
    deletedAt: z.date().nullable(),
});
// ─────────────────────────────────────────────────────────────────────────
// Input Schemas
// ─────────────────────────────────────────────────────────────────────────
export const CreateMocInputSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    type: InstructionTypeSchema.default('moc'),
    // MOC-specific
    author: z.string().max(200).optional(),
    partsCount: z.number().int().positive().optional(),
    minifigCount: z.number().int().min(0).optional(),
    theme: z.string().max(100).optional(),
    subtheme: z.string().max(100).optional(),
    // Set-specific
    brand: z.string().max(100).optional(),
    setNumber: z.string().max(50).optional(),
    releaseYear: z.number().int().min(1900).max(2100).optional(),
    // Metadata
    tags: z.array(z.string()).max(20).optional(),
    difficulty: DifficultySchema.optional(),
    buildTimeHours: z.number().int().positive().optional(),
    ageRecommendation: z.string().max(20).optional(),
    // Visibility
    status: StatusSchema.default('draft'),
    visibility: VisibilitySchema.default('private'),
});
export const UpdateMocInputSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    type: InstructionTypeSchema.optional(),
    // MOC-specific
    author: z.string().max(200).nullable().optional(),
    partsCount: z.number().int().positive().nullable().optional(),
    minifigCount: z.number().int().min(0).nullable().optional(),
    theme: z.string().max(100).nullable().optional(),
    subtheme: z.string().max(100).nullable().optional(),
    // Set-specific
    brand: z.string().max(100).nullable().optional(),
    setNumber: z.string().max(50).nullable().optional(),
    releaseYear: z.number().int().min(1900).max(2100).nullable().optional(),
    // Metadata
    tags: z.array(z.string()).max(20).nullable().optional(),
    difficulty: DifficultySchema.nullable().optional(),
    buildTimeHours: z.number().int().positive().nullable().optional(),
    ageRecommendation: z.string().max(20).nullable().optional(),
    thumbnailUrl: z.string().url().nullable().optional(),
    // Visibility
    status: StatusSchema.optional(),
    visibility: VisibilitySchema.optional(),
});
export const ListMocsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    type: InstructionTypeSchema.optional(),
    status: StatusSchema.optional(),
    theme: z.string().optional(),
});
// ─────────────────────────────────────────────────────────────────────────
// File Input Schemas
// ─────────────────────────────────────────────────────────────────────────
export const CreateMocFileInputSchema = z.object({
    fileType: FileTypeSchema,
    originalFilename: z.string().optional(),
    mimeType: z.string().optional(),
});
export const UploadedFileSchema = z.object({
    buffer: z.instanceof(Buffer),
    filename: z.string(),
    mimetype: z.string(),
    size: z.number(),
});
