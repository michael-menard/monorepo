/**
 * MOC Instructions Type Definitions
 *
 * Zod schemas and TypeScript types for MOC Instructions API.
 * Maintains backward compatibility with existing Express API contracts.
 *
 * Extended with comprehensive metadata fields inspired by Rebrickable's MOC data model.
 */

import { z } from 'zod'

// ============================================================================
// Sub-Schemas for Nested Objects
// ============================================================================

/**
 * Designer Statistics Schema
 * Aggregate statistics for a designer across all their MOCs (BrickLink: dmUserBuilder.stats)
 */
export const MocDesignerStatsSchema = z.object({
  /** Total number of public creations/MOCs by this designer (BrickLink: nPublicCreations) */
  publicCreationsCount: z.number().int().nonnegative().nullable().optional(),

  /** Total views across all designer's public MOCs (BrickLink: nPublicViews) */
  totalPublicViews: z.number().int().nonnegative().nullable().optional(),

  /** Total likes across all designer's public MOCs (BrickLink: nPublicLikes) */
  totalPublicLikes: z.number().int().nonnegative().nullable().optional(),

  /** Number of staff-picked designs by this designer (BrickLink: nStaffPicked) */
  staffPickedCount: z.number().int().nonnegative().nullable().optional(),
})

export type MocDesignerStats = z.infer<typeof MocDesignerStatsSchema>

/**
 * Designer/Creator Information Schema
 * Represents the MOC designer's profile and statistics
 */
export const MocDesignerSchema = z.object({
  /** Designer's unique username on the platform (e.g., "Made With Brix") */
  username: z.string().min(1).max(100),

  /** Designer's preferred display name, may differ from username */
  displayName: z.string().max(255).nullable().optional(),

  /** URL to designer's public profile page */
  profileUrl: z.string().url().nullable().optional(),

  /** URL to designer's profile avatar/photo */
  avatarUrl: z.string().url().nullable().optional(),

  /** Designer's social media and website links */
  socialLinks: z
    .object({
      /** Instagram profile URL (e.g., "https://instagram.com/madewithbrix") */
      instagram: z.string().url().nullable().optional(),

      /** Twitter/X profile URL */
      twitter: z.string().url().nullable().optional(),

      /** YouTube channel URL */
      youtube: z.string().url().nullable().optional(),

      /** Personal website or portfolio URL */
      website: z.string().url().nullable().optional(),
    })
    .nullable()
    .optional(),

  /** Designer's aggregate statistics across all their MOCs (BrickLink-specific) */
  stats: MocDesignerStatsSchema.nullable().optional(),
})

export type MocDesigner = z.infer<typeof MocDesignerSchema>

/**
 * Physical Dimensions Schema
 * Real-world measurements of the built MOC
 */
export const MocDimensionsSchema = z.object({
  /** Height of the built MOC */
  height: z
    .object({
      /** Height in centimeters (e.g., 52) */
      cm: z.number().positive().nullable().optional(),

      /** Height in inches (e.g., 20.5) */
      inches: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),

  /** Width of the built MOC */
  width: z
    .object({
      /** Width in centimeters when closed (e.g., 34) */
      cm: z.number().positive().nullable().optional(),

      /** Width in inches when closed (e.g., 13) */
      inches: z.number().positive().nullable().optional(),

      /** Width in cm when opened/unfolded (e.g., 36) - for foldable MOCs */
      openCm: z.number().positive().nullable().optional(),

      /** Width in inches when opened/unfolded (e.g., 14) */
      openInches: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),

  /** Depth of the built MOC */
  depth: z
    .object({
      /** Depth in centimeters when closed (e.g., 24) */
      cm: z.number().positive().nullable().optional(),

      /** Depth in inches when closed (e.g., 9.5) */
      inches: z.number().positive().nullable().optional(),

      /** Depth in cm when opened/unfolded (e.g., 22) */
      openCm: z.number().positive().nullable().optional(),

      /** Depth in inches when opened/unfolded (e.g., 9) */
      openInches: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),

  /** Weight of the built MOC */
  weight: z
    .object({
      /** Weight in kilograms */
      kg: z.number().positive().nullable().optional(),

      /** Weight in pounds */
      lbs: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),

  /** Base plate width in studs (e.g., 32 for a 32x32 baseplate) */
  studsWidth: z.number().int().positive().nullable().optional(),

  /** Base plate depth in studs */
  studsDepth: z.number().int().positive().nullable().optional(),
})

export type MocDimensions = z.infer<typeof MocDimensionsSchema>

/**
 * Building Instructions Metadata Schema
 * Information about the instruction files
 */
export const MocInstructionsMetadataSchema = z.object({
  /** Format of instruction file: pdf, xml (LDraw), studio (BrickLink), ldraw, lxf (LEGO Digital Designer) */
  instructionType: z.enum(['pdf', 'xml', 'studio', 'ldraw', 'lxf', 'other']).nullable().optional(),

  /** True if building instructions are available */
  hasInstructions: z.boolean().default(false),

  /** Number of pages in PDF instructions (e.g., 148) */
  pageCount: z.number().int().positive().nullable().optional(),

  /** File size in bytes (e.g., 52428800 for 50MB) */
  fileSize: z.number().int().positive().nullable().optional(),

  /** URLs to preview images of instruction pages */
  previewImages: z.array(z.string().url()).default([]),
})

export type MocInstructionsMetadata = z.infer<typeof MocInstructionsMetadataSchema>

/**
 * Alternate Build Information Schema
 * For MOCs that can be built using parts from official LEGO sets
 */
export const MocAlternateBuildSchema = z.object({
  /** True if this MOC is designed as an alternate build of official set(s) */
  isAlternateBuild: z.boolean().default(false),

  /** Set numbers that provide parts (e.g., ["31168-1"]) */
  sourceSetNumbers: z.array(z.string()).default([]),

  /** Names of source sets (e.g., ["Medieval Horse Knight Castle"]) */
  sourceSetNames: z.array(z.string()).default([]),

  /** Number of copies of the source set needed (e.g., 3 if you need 3x set 31168) */
  setsRequired: z.number().int().positive().nullable().optional(),

  /** Count of extra parts needed beyond what's in source sets */
  additionalPartsNeeded: z.number().int().nonnegative().default(0),
})

export type MocAlternateBuild = z.infer<typeof MocAlternateBuildSchema>

/**
 * Image/Media Schema
 * For gallery images and thumbnails
 */
export const MocImageSchema = z.object({
  /** Unique identifier for the image */
  id: z.string().uuid().optional(),

  /** Full-size image URL */
  url: z.string().url(),

  /** Smaller thumbnail URL for gallery grids (e.g., 200x160) */
  thumbnailUrl: z.string().url().nullable().optional(),

  /** Alt text for accessibility (e.g., "MOC-243400 King Mearas Castle front view") */
  alt: z.string().max(500).nullable().optional(),

  /** Image caption/description shown below image */
  caption: z.string().max(1000).nullable().optional(),

  /** Image width in pixels (e.g., 1000) */
  width: z.number().int().positive().nullable().optional(),

  /** Image height in pixels (e.g., 562) */
  height: z.number().int().positive().nullable().optional(),

  /** True if this is the main/hero image for the MOC */
  isPrimary: z.boolean().default(false),

  /** Display order in gallery (0 = first) */
  sortOrder: z.number().int().nonnegative().default(0),
})

export type MocImage = z.infer<typeof MocImageSchema>

/**
 * Feature/Highlight Schema
 * Notable features of the MOC build (displayed as bullet points)
 */
export const MocFeatureSchema = z.object({
  /** Feature name (e.g., "Working Gate Door", "Fold-Open Walls", "Modular Keep Tower") */
  title: z.string().min(1).max(255),

  /** Detailed description of the feature */
  description: z.string().max(1000).nullable().optional(),

  /** Emoji or icon identifier (e.g., "🚪", "door", "fa-door-open") */
  icon: z.string().max(50).nullable().optional(),
})

export type MocFeature = z.infer<typeof MocFeatureSchema>

/**
 * Event Badge Schema
 * Represents participation in competitions/events (BrickLink: listEventBadges)
 */
export const MocEventBadgeSchema = z.object({
  /** Event identifier */
  eventId: z.string().max(100),

  /** Event name (e.g., "Summer Building Contest 2024") */
  eventName: z.string().max(255),

  /** Badge type (e.g., "winner", "finalist", "participant") */
  badgeType: z.string().max(50).nullable().optional(),

  /** URL to badge image */
  badgeImageUrl: z.string().url().nullable().optional(),

  /** Date badge was awarded */
  awardedAt: z.date().nullable().optional(),
})

export type MocEventBadge = z.infer<typeof MocEventBadgeSchema>

/**
 * Source Platform Schema
 * Identifies where a MOC was imported from
 */
export const MocSourcePlatformSchema = z.object({
  /** Platform identifier: rebrickable, bricklink, brickowl, etc. */
  platform: z.enum(['rebrickable', 'bricklink', 'brickowl', 'mecabricks', 'studio', 'other']),

  /** Original ID on the source platform (e.g., "MOC-243400" or BrickLink model ID) */
  externalId: z.string().max(100).nullable().optional(),

  /** URL to the original listing on the source platform */
  sourceUrl: z.string().url().nullable().optional(),

  /** Upload source within platform: web, desktop_app, mobile_app (BrickLink: nUploadedFrom) */
  uploadSource: z
    .enum(['web', 'desktop_app', 'mobile_app', 'api', 'unknown'])
    .nullable()
    .optional(),

  /** If this MOC is a fork/remix, the ID of the original model (BrickLink: idModelFrom) */
  forkedFromId: z.string().max(100).nullable().optional(),

  /** When the MOC was imported to our platform */
  importedAt: z.date().nullable().optional(),
})

export type MocSourcePlatform = z.infer<typeof MocSourcePlatformSchema>

/**
 * Moderation Info Schema
 * Platform moderation status (BrickLink: nModerateAction, udtModerated, etc.)
 */
export const MocModerationSchema = z.object({
  /** Moderation action taken: none, approved, flagged, removed (BrickLink: nModerateAction) */
  action: z.enum(['none', 'approved', 'flagged', 'removed', 'pending']).default('none'),

  /** When moderation action was taken (BrickLink: udtModerated) */
  moderatedAt: z.date().nullable().optional(),

  /** Reason for moderation action */
  reason: z.string().max(500).nullable().optional(),

  /** True if forced private by moderation (BrickLink: bForcedPrivate) */
  forcedPrivate: z.boolean().default(false),
})

export type MocModeration = z.infer<typeof MocModerationSchema>

// ============================================================================
// Main MOC Instruction Schema
// ============================================================================

/**
 * MOC Instruction Entity Schema
 * Matches database schema and existing API response format
 * Extended with comprehensive metadata fields
 */
export const MocInstructionSchema = z.object({
  // ─────────────────────────────────────────────────────────────────────────
  // Core Identification
  // ─────────────────────────────────────────────────────────────────────────

  /** Primary database UUID for this MOC record */
  id: z.string().uuid(),

  /** External platform ID (e.g., "MOC-243400" from Rebrickable) */
  mocId: z.string().max(50).nullable().optional(),

  /** URL-friendly identifier (e.g., "king-mearas-castle") */
  slug: z.string().max(255).nullable().optional(),

  /** UUID of the user who owns/uploaded this MOC */
  userId: z.string().uuid(),

  /** Type of instruction: 'moc' for custom builds, 'set' for official LEGO sets */
  type: z.enum(['moc', 'set']),

  // ─────────────────────────────────────────────────────────────────────────
  // Basic Information (existing fields - backward compatible)
  // ─────────────────────────────────────────────────────────────────────────

  /** Display title of the MOC (e.g., "King Mearas Castle") */
  title: z.string().min(1).max(255),

  /** Plain text description of the MOC */
  description: z.string().nullable(),

  /** Name of the MOC designer/creator (e.g., "Made With Brix") */
  author: z.string().min(1).max(255).nullable(),

  /** Brand name for official sets (e.g., "LEGO", "Mega Construx") */
  brand: z.string().max(255).nullable(),

  /** Primary theme category (e.g., "Castle", "Star Wars", "Creator") */
  theme: z.string().nullable(),

  /** Numeric theme ID from external platform (e.g., 186 for Castle) */
  themeId: z.number().int().nullable().optional(),

  /** Sub-theme within main theme (e.g., "Lion Knights" under Castle) */
  subtheme: z.string().nullable(),

  /** Set or MOC number identifier (e.g., "31168-1" or "MOC-243400") */
  setNumber: z.string().nullable(),

  /** Year the set was released or MOC was designed (e.g., 2025) */
  releaseYear: z.number().int().nullable(),

  /** True if an official LEGO set is no longer in production */
  retired: z.boolean().nullable(),

  /** Total number of LEGO parts/pieces in this MOC (e.g., 3212) */
  partsCount: z.number().int().nullable(),

  /** Number of minifigures included (e.g., 4) */
  minifigCount: z.number().int().nonnegative().nullable().optional(),

  /** Searchable tags/keywords (e.g., ["castle", "medieval", "modular"]) */
  tags: z.array(z.string()).nullable(),

  /** URL to main thumbnail image for listings */
  thumbnailUrl: z.string().url().nullable(),

  // ─────────────────────────────────────────────────────────────────────────
  // Extended Metadata (new fields)
  // ─────────────────────────────────────────────────────────────────────────

  /** Designer profile and social information */
  designer: MocDesignerSchema.nullable().optional(),

  /** Physical dimensions of built MOC in cm/inches */
  dimensions: MocDimensionsSchema.nullable().optional(),

  /** Information about instruction files (format, pages, size) */
  instructionsMetadata: MocInstructionsMetadataSchema.nullable().optional(),

  /** Info if this is an alternate build of official sets */
  alternateBuild: MocAlternateBuildSchema.nullable().optional(),

  /** List of notable features/highlights of this MOC */
  features: z.array(MocFeatureSchema).default([]),

  /** Gallery of images showing the MOC from different angles */
  galleryImages: z.array(MocImageSchema).default([]),

  // ─────────────────────────────────────────────────────────────────────────
  // Platform & Source Tracking (BrickLink-specific)
  // ─────────────────────────────────────────────────────────────────────────

  /** Source platform info (where MOC was imported from) */
  sourcePlatform: MocSourcePlatformSchema.nullable().optional(),

  /** Competition/event badges earned by this MOC */
  eventBadges: z.array(MocEventBadgeSchema).default([]),

  /** Moderation status and actions */
  moderation: MocModerationSchema.nullable().optional(),

  /** Platform-specific category ID (BrickLink: idModelCategory) */
  platformCategoryId: z.number().int().nullable().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // Rich Description Content
  // ─────────────────────────────────────────────────────────────────────────

  /** HTML-formatted description with rich text, tables, lists */
  descriptionHtml: z.string().nullable().optional(),

  /** Brief 1-2 sentence summary for previews (max 500 chars) */
  shortDescription: z.string().max(500).nullable().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // Difficulty & Build Info
  // ─────────────────────────────────────────────────────────────────────────

  /** Skill level required: beginner, intermediate, advanced, expert */
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).nullable().optional(),

  /** Estimated time to build in hours (e.g., 8.5) */
  buildTimeHours: z.number().positive().nullable().optional(),

  /** Recommended minimum age (e.g., "16+", "12+", "8-14") */
  ageRecommendation: z.string().max(20).nullable().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // Status & Visibility
  // ─────────────────────────────────────────────────────────────────────────

  /** Publication status: draft (editing), published (live), archived, pending_review */
  status: z.enum(['draft', 'published', 'archived', 'pending_review']).default('draft'),

  /** Who can see this MOC: public (everyone), private (owner only), unlisted (link only) */
  visibility: z.enum(['public', 'private', 'unlisted']).default('private'),

  /** True if featured/promoted on homepage or category pages */
  isFeatured: z.boolean().default(false),

  /** True if verified by platform moderators (authentic, quality checked) */
  isVerified: z.boolean().default(false),

  // ─────────────────────────────────────────────────────────────────────────
  // Timestamps
  // ─────────────────────────────────────────────────────────────────────────

  /** Date files were originally uploaded (may differ from createdAt) */
  uploadedDate: z.date().nullable(),

  /** Date MOC was first published/made public */
  publishedAt: z.date().nullable().optional(),

  /** Database record creation timestamp */
  createdAt: z.date(),

  /** Last modification timestamp */
  updatedAt: z.date(),

  // ─────────────────────────────────────────────────────────────────────────
  // Audit Trail
  // ─────────────────────────────────────────────────────────────────────────

  /** UUID of user who first added this record (may differ from owner) */
  addedByUserId: z.string().uuid().nullable().optional(),

  /** UUID of user who last modified this record */
  lastUpdatedByUserId: z.string().uuid().nullable().optional(),
})

export type MocInstruction = z.infer<typeof MocInstructionSchema>

// ============================================================================
// Create/Update Schemas
// ============================================================================

/**
 * Create MOC Schema (Simple - metadata only)
 * Used for POST /api/mocs
 */
export const CreateMocSchema = z.object({
  /** Display title of the MOC */
  title: z.string().min(1, 'Title is required').max(255),

  /** Plain text description */
  description: z.string().optional(),

  /** Searchable tags */
  tags: z.array(z.string()).optional(),

  /** URL to thumbnail image */
  thumbnailUrl: z.string().url().optional(),
})

export type CreateMoc = z.infer<typeof CreateMocSchema>

/**
 * Base schema for MOC creation with files
 * Extended with optional rich metadata fields
 */
const BaseCreateWithFilesSchema = z.object({
  /** Display title of the MOC */
  title: z.string().min(1, 'Title is required').max(255),

  /** Plain text description */
  description: z.string().optional(),

  /** HTML-formatted description */
  descriptionHtml: z.string().optional(),

  /** Brief summary for previews */
  shortDescription: z.string().max(500).optional(),

  /** Searchable tags */
  tags: z.array(z.string()).optional(),

  /** Physical dimensions */
  dimensions: MocDimensionsSchema.optional(),

  /** Notable features list */
  features: z.array(MocFeatureSchema).optional(),

  /** Skill level required */
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),

  /** Estimated build time in hours */
  buildTimeHours: z.number().positive().optional(),

  /** Recommended age range */
  ageRecommendation: z.string().max(20).optional(),

  /** Who can see this MOC */
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),

  // BrickLink-specific fields
  /** Source platform info (where MOC was imported from) */
  sourcePlatform: MocSourcePlatformSchema.optional(),

  /** Competition/event badges earned by this MOC */
  eventBadges: z.array(MocEventBadgeSchema).optional(),

  /** Moderation status and actions */
  moderation: MocModerationSchema.optional(),

  /** Platform-specific category ID (BrickLink: idModelCategory) */
  platformCategoryId: z.number().int().optional(),
})

/**
 * MOC-specific creation schema
 */
const CreateMocWithFilesSchemaBase = BaseCreateWithFilesSchema.extend({
  /** Discriminator: this is a custom MOC */
  type: z.literal('moc'),

  /** Designer/creator name (required for MOCs) */
  author: z.string().min(1, 'Author is required for MOCs').max(255),

  /** External platform ID (e.g., "MOC-243400") */
  mocId: z.string().max(50).optional(),

  /** URL-friendly identifier */
  slug: z.string().max(255).optional(),

  /** MOC number identifier (required) */
  setNumber: z.string().min(1, 'MOC ID is required'),

  /** Total parts count (required, min 1) */
  partsCount: z.number().int().min(1, 'Parts count must be at least 1'),

  /** Number of minifigures */
  minifigCount: z.number().int().nonnegative().optional(),

  /** Primary theme category (required) */
  theme: z.string().min(1, 'Theme is required'),

  /** Numeric theme ID */
  themeId: z.number().int().optional(),

  /** Sub-theme within main theme */
  subtheme: z.string().optional(),

  /** Original upload date as ISO string */
  uploadedDate: z.string().datetime().optional(),

  /** Designer profile info */
  designer: MocDesignerSchema.optional(),

  /** Instruction file metadata */
  instructionsMetadata: MocInstructionsMetadataSchema.optional(),

  /** Alternate build info */
  alternateBuild: MocAlternateBuildSchema.optional(),
})

/**
 * Set-specific creation schema
 */
const CreateSetWithFilesSchemaBase = BaseCreateWithFilesSchema.extend({
  /** Discriminator: this is an official LEGO set */
  type: z.literal('set'),

  /** Brand name (required for sets) */
  brand: z.string().min(1, 'Brand is required for Sets').max(255),

  /** Primary theme category (required) */
  theme: z.string().min(1, 'Theme is required for Sets'),

  /** Numeric theme ID */
  themeId: z.number().int().optional(),

  /** Official set number (required) */
  setNumber: z.string().min(1, 'Set number is required'),

  /** Year of release (1950 to 2 years in future) */
  releaseYear: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 2)
    .optional(),

  /** True if set is no longer in production */
  retired: z.boolean().default(false),

  /** Total parts count */
  partsCount: z.number().int().min(1).optional(),

  /** Number of minifigures */
  minifigCount: z.number().int().nonnegative().optional(),
})

/**
 * Discriminated union for MOC/Set creation with files
 */
export const CreateMocWithFilesSchema = z.discriminatedUnion('type', [
  CreateMocWithFilesSchemaBase,
  CreateSetWithFilesSchemaBase,
])

export type CreateMocWithFiles = z.infer<typeof CreateMocWithFilesSchema>

/**
 * Update MOC Schema (Partial updates)
 * Used for PATCH /api/mocs/:id
 * Extended with all optional metadata fields
 */
export const UpdateMocSchema = z.object({
  // ─────────────────────────────────────────────────────────────────────────
  // Basic fields
  // ─────────────────────────────────────────────────────────────────────────

  /** Display title */
  title: z.string().min(1).max(255).optional(),

  /** Plain text description */
  description: z.string().optional(),

  /** HTML-formatted description */
  descriptionHtml: z.string().optional(),

  /** Brief summary */
  shortDescription: z.string().max(500).optional(),

  /** Designer/creator name */
  author: z.string().min(1).max(255).optional(),

  /** Primary theme */
  theme: z.string().optional(),

  /** Numeric theme ID */
  themeId: z.number().int().optional(),

  /** Sub-theme */
  subtheme: z.string().optional(),

  /** Total parts count */
  partsCount: z.number().int().min(1).optional(),

  /** Minifigure count */
  minifigCount: z.number().int().nonnegative().optional(),

  /** Searchable tags */
  tags: z.array(z.string()).optional(),

  /** Thumbnail image URL */
  thumbnailUrl: z.string().url().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // Extended metadata
  // ─────────────────────────────────────────────────────────────────────────

  /** External platform ID */
  mocId: z.string().max(50).optional(),

  /** URL-friendly slug */
  slug: z.string().max(255).optional(),

  /** Designer profile info */
  designer: MocDesignerSchema.optional(),

  /** Physical dimensions */
  dimensions: MocDimensionsSchema.optional(),

  /** Instruction file metadata */
  instructionsMetadata: MocInstructionsMetadataSchema.optional(),

  /** Alternate build info */
  alternateBuild: MocAlternateBuildSchema.optional(),

  /** Notable features list */
  features: z.array(MocFeatureSchema).optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // Build info
  // ─────────────────────────────────────────────────────────────────────────

  /** Skill level */
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),

  /** Build time in hours */
  buildTimeHours: z.number().positive().optional(),

  /** Recommended age */
  ageRecommendation: z.string().max(20).optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────────────────────────────────────

  /** Publication status */
  status: z.enum(['draft', 'published', 'archived', 'pending_review']).optional(),

  /** Visibility setting */
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),

  /** Featured flag */
  isFeatured: z.boolean().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // BrickLink-specific fields
  // ─────────────────────────────────────────────────────────────────────────

  /** Source platform info (where MOC was imported from) */
  sourcePlatform: MocSourcePlatformSchema.optional(),

  /** Competition/event badges earned by this MOC */
  eventBadges: z.array(MocEventBadgeSchema).optional(),

  /** Moderation status and actions */
  moderation: MocModerationSchema.optional(),

  /** Platform-specific category ID (BrickLink: idModelCategory) */
  platformCategoryId: z.number().int().optional(),
})

export type UpdateMoc = z.infer<typeof UpdateMocSchema>

// ============================================================================
// Query & List Schemas
// ============================================================================

/**
 * MOC List Query Parameters
 * Used for GET /api/mocs
 */
export const MocListQuerySchema = z.object({
  /** Page number for pagination (1-based) */
  page: z.coerce.number().int().min(1).default(1),

  /** Number of results per page (max 100) */
  limit: z.coerce.number().int().min(1).max(100).default(20),

  /** Search term to filter by title/description */
  search: z.string().optional(),

  /** Filter by specific tag */
  tag: z.string().optional(),
})

export type MocListQuery = z.infer<typeof MocListQuerySchema>

// ============================================================================
// File & Upload Schemas
// ============================================================================

/**
 * MOC File Entity
 * Matches moc_files table schema
 */
export const MocFileSchema = z.object({
  /** Unique file record ID */
  id: z.string().uuid(),

  /** ID of the MOC this file belongs to */
  mocId: z.string().uuid(),

  /** Type of file: instruction PDF, parts list, thumbnail, or gallery image */
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),

  /** S3/CDN URL to the file */
  fileUrl: z.string(),

  /** Original filename from upload (e.g., "castle-instructions.pdf") */
  originalFilename: z.string().nullable(),

  /** MIME type (e.g., "application/pdf", "image/jpeg") */
  mimeType: z.string().nullable(),

  /** When file was uploaded */
  createdAt: z.date(),
})

export type MocFile = z.infer<typeof MocFileSchema>

/**
 * MOC Gallery Image (linked from gallery_images table)
 */
export const MocGalleryImageSchema = z.object({
  /** Link record ID */
  id: z.string().uuid(),

  /** ID of the gallery image record */
  galleryImageId: z.string().uuid(),

  /** Full image URL */
  url: z.string().url(),

  /** Alt text for accessibility */
  alt: z.string().nullable(),

  /** Image caption */
  caption: z.string().nullable(),
})

export type MocGalleryImage = z.infer<typeof MocGalleryImageSchema>

// ============================================================================
// Parts List Schema
// ============================================================================

/**
 * MOC Parts List
 * Tracks inventory and acquisition status of parts for a MOC
 */
export const MocPartsListSchema = z.object({
  /** Parts list record ID */
  id: z.string().uuid(),

  /** ID of the MOC this parts list belongs to */
  mocId: z.string().uuid(),

  /** ID of uploaded parts list file (CSV, XML, etc.) */
  fileId: z.string().uuid().nullable(),

  /** Name for this parts list (e.g., "Main Build", "Optional Display Stand") */
  title: z.string().min(1).max(255),

  /** Notes about this parts list */
  description: z.string().nullable(),

  /** True if user has built this MOC */
  built: z.boolean(),

  /** True if user has purchased all parts */
  purchased: z.boolean(),

  /** Percentage of parts owned (0-100 as decimal string, e.g., "85.5") */
  inventoryPercentage: z.string(),

  /** Total number of parts needed (as string for precision) */
  totalPartsCount: z.string().nullable(),

  /** Number of parts user already owns (as string) */
  acquiredPartsCount: z.string(),

  /** Estimated cost to acquire remaining parts (currency string, e.g., "45.99") */
  costEstimate: z.string().nullable(),

  /** Actual amount spent on parts (currency string) */
  actualCost: z.string().nullable(),

  /** User's notes about sourcing, substitutions, etc. */
  notes: z.string().nullable(),

  /** When parts list was created */
  createdAt: z.date(),

  /** When parts list was last updated */
  updatedAt: z.date(),
})

export type MocPartsList = z.infer<typeof MocPartsListSchema>

// ============================================================================
// Response Types
// ============================================================================

/**
 * MOC Detail Response (includes related entities)
 */
export interface MocDetailResponse extends MocInstruction {
  /** All files attached to this MOC */
  files: MocFile[]

  /** Linked gallery images */
  images: MocGalleryImage[]

  /** Parts lists for this MOC */
  partsLists: MocPartsList[]
}

/**
 * MOC List Response Format
 * Maintains backward compatibility with existing API
 */
export interface MocListResponse {
  /** Always true for successful responses */
  success: true

  /** Array of MOC records */
  data: MocInstruction[]

  /** Total count of matching records (for pagination) */
  total: number

  /** Current page number */
  page: number

  /** Results per page */
  limit: number
}

/**
 * File Upload Validation
 */
export const FileUploadSchema = z.object({
  /** Type of file being uploaded */
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),
})

export type FileUpload = z.infer<typeof FileUploadSchema>

// ============================================================================
// Multi-File Upload Response Types
// ============================================================================

/**
 * Successfully uploaded file record
 */
export const UploadedFileSchema = z.object({
  /** New file record ID */
  id: z.string().uuid(),

  /** Original filename */
  filename: z.string(),

  /** CDN URL to uploaded file */
  fileUrl: z.string(),

  /** File size in bytes */
  fileSize: z.number().int(),

  /** Type of file uploaded */
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),
})

/**
 * Failed file upload record
 */
export const FailedFileSchema = z.object({
  /** Original filename that failed */
  filename: z.string(),

  /** Error message describing failure */
  error: z.string(),
})

/**
 * Multi-file upload response
 */
export const MultiFileUploadResponseSchema = z.object({
  /** Successfully uploaded files */
  uploaded: z.array(UploadedFileSchema),

  /** Files that failed to upload */
  failed: z.array(FailedFileSchema),

  /** Upload summary counts */
  summary: z.object({
    /** Total files attempted */
    total: z.number().int(),

    /** Number successfully uploaded */
    succeeded: z.number().int(),

    /** Number that failed */
    failed: z.number().int(),
  }),
})

export type UploadedFile = z.infer<typeof UploadedFileSchema>
export type FailedFile = z.infer<typeof FailedFileSchema>
export type MultiFileUploadResponse = z.infer<typeof MultiFileUploadResponseSchema>
