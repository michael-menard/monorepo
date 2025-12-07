/**
 * Story 3.1.16: MOC Form Validation Schemas
 *
 * Zod schemas for form validation with discriminated union for MOC vs Set types.
 * These schemas are used for client-side validation with react-hook-form.
 */

import { z } from 'zod'

// ============================================================================
// Sub-Schemas for Nested Objects
// ============================================================================

/**
 * Designer Statistics Schema (BrickLink-specific)
 */
export const DesignerStatsSchema = z.object({
  publicCreationsCount: z.number().int().nonnegative().optional(),
  totalPublicViews: z.number().int().nonnegative().optional(),
  totalPublicLikes: z.number().int().nonnegative().optional(),
  staffPickedCount: z.number().int().nonnegative().optional(),
})

/**
 * Social Links Schema
 */
export const SocialLinksSchema = z.object({
  instagram: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
})

/**
 * Designer Information Schema
 */
export const DesignerSchema = z.object({
  username: z.string().min(1).max(100),
  displayName: z.string().max(255).optional(),
  profileUrl: z.string().url().optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  socialLinks: SocialLinksSchema.optional(),
  stats: DesignerStatsSchema.optional(),
})

/**
 * Dimension Measurement Schema (cm/inches pair)
 */
export const DimensionMeasurementSchema = z.object({
  cm: z.number().positive().optional(),
  inches: z.number().positive().optional(),
})

/**
 * Width Dimension Schema (includes open measurements for foldable MOCs)
 */
export const WidthDimensionSchema = DimensionMeasurementSchema.extend({
  openCm: z.number().positive().optional(),
  openInches: z.number().positive().optional(),
})

/**
 * Weight Schema
 */
export const WeightSchema = z.object({
  kg: z.number().positive().optional(),
  lbs: z.number().positive().optional(),
})

/**
 * Physical Dimensions Schema
 */
export const DimensionsSchema = z.object({
  height: DimensionMeasurementSchema.optional(),
  width: WidthDimensionSchema.optional(),
  depth: WidthDimensionSchema.optional(),
  weight: WeightSchema.optional(),
  studsWidth: z.number().int().positive().optional(),
  studsDepth: z.number().int().positive().optional(),
})

/**
 * Instructions Metadata Schema
 */
export const InstructionsMetadataSchema = z.object({
  instructionType: z.enum(['pdf', 'xml', 'studio', 'ldraw', 'lxf', 'other']).optional(),
  hasInstructions: z.boolean().default(false),
  pageCount: z.number().int().positive().optional(),
  fileSize: z.number().int().positive().optional(),
  previewImages: z.array(z.string().url()).default([]),
})

/**
 * Alternate Build Schema
 */
export const AlternateBuildSchema = z.object({
  isAlternateBuild: z.boolean().default(false),
  sourceSetNumbers: z.array(z.string()).default([]),
  sourceSetNames: z.array(z.string()).default([]),
  setsRequired: z.number().int().positive().optional(),
  additionalPartsNeeded: z.number().int().nonnegative().default(0),
})

/**
 * Feature Schema
 */
export const FeatureSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
})

/**
 * Source Platform Schema
 */
export const SourcePlatformSchema = z.object({
  platform: z.enum(['rebrickable', 'bricklink', 'brickowl', 'mecabricks', 'studio', 'other']),
  externalId: z.string().max(100).optional(),
  sourceUrl: z.string().url().optional(),
  uploadSource: z.enum(['web', 'desktop_app', 'mobile_app', 'api', 'unknown']).optional(),
  forkedFromId: z.string().max(100).optional(),
  importedAt: z.string().datetime().optional(),
})

/**
 * Event Badge Schema
 */
export const EventBadgeSchema = z.object({
  eventId: z.string().max(100),
  eventName: z.string().max(255),
  badgeType: z.string().max(50).optional(),
  badgeImageUrl: z.string().url().optional(),
  awardedAt: z.string().datetime().optional(),
})

/**
 * Moderation Schema
 */
export const ModerationSchema = z.object({
  action: z.enum(['none', 'approved', 'flagged', 'removed', 'pending']).default('none'),
  moderatedAt: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
  forcedPrivate: z.boolean().default(false),
})

// ============================================================================
// Base Form Schema (shared fields)
// ============================================================================

const BaseFormSchema = z.object({
  // Required fields
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must be at most 120 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),

  // Optional core fields
  mocId: z.string().max(50).optional(),
  slug: z.string().max(255).optional(),
  themeId: z.number().int().optional(),
  subtheme: z.string().optional(),
  tags: z.array(z.string()).default([]),
  minifigCount: z.number().int().nonnegative().optional(),

  // Rich description
  descriptionHtml: z.string().optional(),
  shortDescription: z.string().max(500).optional(),

  // Build information
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  buildTimeHours: z.number().positive().optional(),
  ageRecommendation: z.string().max(20).optional(),

  // Status & visibility
  status: z.enum(['draft', 'published', 'archived', 'pending_review']).default('draft'),
  visibility: z.enum(['public', 'private', 'unlisted']).default('private'),

  // JSONB nested objects
  designer: DesignerSchema.optional(),
  dimensions: DimensionsSchema.optional(),
  instructionsMetadata: InstructionsMetadataSchema.optional(),
  alternateBuild: AlternateBuildSchema.optional(),
  features: z.array(FeatureSchema).default([]),
  sourcePlatform: SourcePlatformSchema.optional(),
  eventBadges: z.array(EventBadgeSchema).default([]),
  moderation: ModerationSchema.optional(),
  platformCategoryId: z.number().int().optional(),
})

// ============================================================================
// MOC-Specific Schema
// ============================================================================

const MocFormSchema = BaseFormSchema.extend({
  type: z.literal('moc'),
  author: z.string().min(1, 'Author is required for MOCs').max(255),
  setNumber: z.string().min(1, 'MOC ID is required'),
  partsCount: z.number().int().min(1, 'Parts count must be at least 1'),
  theme: z.string().min(1, 'Theme is required'),
  uploadedDate: z.string().datetime().optional(),
})

// ============================================================================
// Set-Specific Schema
// ============================================================================

const SetFormSchema = BaseFormSchema.extend({
  type: z.literal('set'),
  brand: z.string().min(1, 'Brand is required for Sets').max(255),
  setNumber: z.string().min(1, 'Set number is required'),
  theme: z.string().min(1, 'Theme is required'),
  releaseYear: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 2)
    .optional(),
  retired: z.boolean().default(false),
  partsCount: z.number().int().min(1).optional(),
})

// ============================================================================
// Discriminated Union
// ============================================================================

/**
 * Main form schema - discriminated union based on 'type' field
 */
export const MocInstructionFormSchema = z.discriminatedUnion('type', [MocFormSchema, SetFormSchema])

// Output types (after Zod parsing with defaults applied)
export type MocInstructionForm = z.infer<typeof MocInstructionFormSchema>
export type MocForm = z.infer<typeof MocFormSchema>
export type SetForm = z.infer<typeof SetFormSchema>

// Input types (for react-hook-form - before defaults are applied)
export type MocInstructionFormInput = z.input<typeof MocInstructionFormSchema>
export type MocFormInput = z.input<typeof MocFormSchema>
export type SetFormInput = z.input<typeof SetFormSchema>

export type Designer = z.infer<typeof DesignerSchema>
export type Dimensions = z.infer<typeof DimensionsSchema>
export type Feature = z.infer<typeof FeatureSchema>
export type AlternateBuild = z.infer<typeof AlternateBuildSchema>
export type SourcePlatform = z.infer<typeof SourcePlatformSchema>
export type EventBadge = z.infer<typeof EventBadgeSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize tags: trim, lowercase, dedupe
 */
export function normalizeTags(tags: string[]): string[] {
  return tags
    .map(t => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
}

/**
 * Create empty MOC form with defaults
 */
export function createEmptyMocForm(): MocForm {
  return {
    type: 'moc',
    title: '',
    description: '',
    author: '',
    setNumber: '',
    partsCount: 0,
    theme: '',
    tags: [],
    features: [],
    eventBadges: [],
    status: 'draft',
    visibility: 'private',
  }
}

/**
 * Create empty Set form with defaults
 */
export function createEmptySetForm(): SetForm {
  return {
    type: 'set',
    title: '',
    description: '',
    brand: '',
    setNumber: '',
    theme: '',
    tags: [],
    features: [],
    eventBadges: [],
    status: 'draft',
    visibility: 'private',
    retired: false,
  }
}

/**
 * Check if form is valid for finalization
 */
export function isFormValidForFinalize(form: MocInstructionForm): boolean {
  const result = MocInstructionFormSchema.safeParse(form)
  return result.success
}

/**
 * Get validation errors as a flat object for error summary
 */
export function getFormErrors(form: MocInstructionForm): Record<string, string> {
  const result = MocInstructionFormSchema.safeParse(form)
  if (result.success) return {}

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    errors[path] = issue.message
  }
  return errors
}
