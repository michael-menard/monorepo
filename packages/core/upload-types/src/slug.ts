/**
 * Slug Generation Utility
 *
 * Generates URL-friendly slugs from titles with suffix handling for conflicts.
 */

import { z } from 'zod'

/**
 * Slug schema with validation
 */
export const SlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(80, 'Slug too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')

export type Slug = z.infer<typeof SlugSchema>

/** Maximum slug length */
const MAX_SLUG_LENGTH = 80

/**
 * Convert a title to a URL-friendly slug
 *
 * Rules:
 * - Lowercase
 * - Trim whitespace
 * - Replace spaces with dashes
 * - Collapse multiple dashes
 * - Remove disallowed characters
 * - Max length 80
 * - Preserve unicode letters/numbers
 *
 * @param title - The title to slugify
 * @returns URL-friendly slug
 */
export const slugify = (title: string): string => {
  if (!title || typeof title !== 'string') {
    return ''
  }

  return (
    title
      // Normalize unicode (NFD decomposition + remove combining marks)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Convert to lowercase
      .toLowerCase()
      // Trim whitespace
      .trim()
      // Replace spaces and underscores with dashes
      .replace(/[\s_]+/g, '-')
      // Remove disallowed characters (keep letters, numbers, dashes)
      .replace(/[^a-z0-9-]/g, '')
      // Collapse multiple dashes
      .replace(/-+/g, '-')
      // Remove leading/trailing dashes
      .replace(/^-+|-+$/g, '')
      // Truncate to max length
      .substring(0, MAX_SLUG_LENGTH)
      // Remove trailing dash if truncation created one
      .replace(/-+$/, '')
  )
}

/**
 * Generate a suggested slug with suffix for conflicts
 *
 * @param baseSlug - The base slug that has a conflict
 * @param suffix - The suffix number (starting at 2)
 * @returns Slug with suffix appended, or null if suffix doesn't fit
 */
export const slugWithSuffix = (baseSlug: string, suffix: number): string => {
  const suffixStr = `-${suffix}`

  // Check if suffix fits within max length
  if (baseSlug.length + suffixStr.length > MAX_SLUG_LENGTH) {
    // Trim base to make room for suffix
    const maxBaseLength = MAX_SLUG_LENGTH - suffixStr.length
    const trimmedBase = baseSlug.substring(0, maxBaseLength).replace(/-+$/, '')
    return `${trimmedBase}${suffixStr}`
  }

  return `${baseSlug}${suffixStr}`
}

/**
 * Find the next available slug by checking existing slugs
 *
 * @param baseSlug - The base slug to check
 * @param existingSlugs - Array of existing slugs for this user
 * @returns The first available slug (baseSlug or baseSlug-N)
 */
export const findAvailableSlug = (baseSlug: string, existingSlugs: string[]): string => {
  // If base slug is available, use it
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  // Find next available suffix
  let suffix = 2
  let candidate = slugWithSuffix(baseSlug, suffix)

  while (existingSlugs.includes(candidate) && suffix < 1000) {
    suffix++
    candidate = slugWithSuffix(baseSlug, suffix)
  }

  return candidate
}
