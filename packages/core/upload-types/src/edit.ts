/**
 * Edit MOC Types
 *
 * Zod schemas and types for MOC edit functionality.
 * Shared between frontend forms and backend API validation.
 */

import { z } from 'zod'

/**
 * Predefined LEGO themes for theme selector
 */
export const LEGO_THEMES = [
  'Technic',
  'Creator',
  'Creator Expert',
  'City',
  'Star Wars',
  'Architecture',
  'Ideas',
  'Speed Champions',
  'Marvel',
  'DC',
  'Minecraft',
  'NINJAGO',
  'Friends',
  'Harry Potter',
  'Icons',
  'Art',
  'Botanical Collection',
  'BrickHeadz',
  'Classic',
  'DUPLO',
  'Other',
] as const

export type LegoTheme = (typeof LEGO_THEMES)[number]

/**
 * MOC status enum
 */
export const MocStatusSchema = z.enum(['draft', 'published', 'archived', 'pending_review'])
export type MocStatus = z.infer<typeof MocStatusSchema>

/**
 * File category for MOC files
 */
export const MocFileCategorySchema = z.enum(['instruction', 'parts-list', 'image', 'thumbnail'])
export type MocFileCategory = z.infer<typeof MocFileCategorySchema>

/**
 * Individual file item in MOC edit response
 */
export const MocFileItemSchema = z.object({
  id: z.string(),
  category: MocFileCategorySchema,
  filename: z.string(),
  size: z.number().nonnegative(),
  mimeType: z.string(),
  url: z.string().url(),
  uploadedAt: z.string().datetime(),
})

export type MocFileItem = z.infer<typeof MocFileItemSchema>

/**
 * MOC data for edit page (GET /api/mocs/:id/edit response)
 */
export const MocForEditResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  theme: z.string().nullable(),
  status: MocStatusSchema,
  isOwner: z.boolean(),
  files: z.array(MocFileItemSchema),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type MocForEditResponse = z.infer<typeof MocForEditResponseSchema>

/**
 * Tag validation - max 30 chars each
 */
export const TagSchema = z
  .string()
  .min(1, 'Tag cannot be empty')
  .max(30, 'Tag must be 30 characters or less')
  .regex(/^[a-zA-Z0-9\s-]+$/, 'Tags can only contain letters, numbers, spaces, and hyphens')

/**
 * Slug validation for edit form
 */
export const EditSlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .max(100, 'Slug must be 100 characters or less')
  .optional()
  .nullable()

/**
 * Edit MOC form schema - validates edit form input
 * Used with react-hook-form zodResolver
 */
export const EditMocFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').nullable(),
  tags: z.array(TagSchema).max(10, 'Maximum 10 tags allowed').nullable(),
  theme: z.string().max(50, 'Theme must be 50 characters or less').nullable(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .max(100, 'Slug must be 100 characters or less')
    .nullable(),
})

export type EditMocFormInput = z.infer<typeof EditMocFormSchema>

/**
 * Edit MOC API request schema (PUT /api/mocs/:id)
 * Matches the form schema for API validation
 */
export const EditMocRequestSchema = EditMocFormSchema.extend({
  // Additional fields that might be sent to API
})

export type EditMocRequest = z.infer<typeof EditMocRequestSchema>

/**
 * Slug availability check response
 */
export const SlugAvailabilityResponseSchema = z.object({
  slug: z.string(),
  available: z.boolean(),
  suggestion: z.string().optional(),
})

export type SlugAvailabilityResponse = z.infer<typeof SlugAvailabilityResponseSchema>

/**
 * Helper to check if form values have changed from initial
 */
export const hasFormChanges = (current: EditMocFormInput, initial: EditMocFormInput): boolean => {
  // Compare title
  if (current.title !== initial.title) return true

  // Compare description (handle null/undefined/empty)
  const currentDesc = current.description || null
  const initialDesc = initial.description || null
  if (currentDesc !== initialDesc) return true

  // Compare theme
  const currentTheme = current.theme || null
  const initialTheme = initial.theme || null
  if (currentTheme !== initialTheme) return true

  // Compare slug
  const currentSlug = current.slug || null
  const initialSlug = initial.slug || null
  if (currentSlug !== initialSlug) return true

  // Compare tags (array comparison)
  const currentTags = current.tags ?? []
  const initialTags = initial.tags ?? []
  if (currentTags.length !== initialTags.length) return true
  for (let i = 0; i < currentTags.length; i++) {
    if (currentTags[i] !== initialTags[i]) return true
  }

  return false
}

/**
 * Convert MocForEditResponse to EditMocFormInput for form initialization
 */
export const toFormValues = (moc: MocForEditResponse): EditMocFormInput => ({
  title: moc.title,
  description: moc.description,
  tags: moc.tags ?? [],
  theme: moc.theme,
  slug: moc.slug,
})
