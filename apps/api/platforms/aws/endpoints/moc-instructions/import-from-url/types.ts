/**
 * Story 3.1.16: URL Import Types
 *
 * Zod schemas for URL import request/response.
 */

import { z } from 'zod'

// ============================================================================
// Request Schema
// ============================================================================

export const ImportFromUrlRequestSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
})

export type ImportFromUrlRequest = z.infer<typeof ImportFromUrlRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

export const ImportedImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export type ImportedImage = z.infer<typeof ImportedImageSchema>

export const ImportSourceSchema = z.object({
  platform: z.enum(['rebrickable', 'bricklink', 'brickowl']),
  url: z.string().url(),
  externalId: z.string(),
})

export type ImportSource = z.infer<typeof ImportSourceSchema>

export const ImportFromUrlResponseSchema = z.object({
  success: z.boolean(),
  data: z.record(z.string(), z.unknown()).optional(),
  images: z.array(ImportedImageSchema).default([]),
  warnings: z.array(z.string()).default([]),
  source: ImportSourceSchema.optional(),
})

// Use a more flexible type for the response data to allow specific parser results
export interface ImportFromUrlResponse {
  success: boolean
  data?: Record<string, unknown>
  images: ImportedImage[]
  warnings: string[]
  source?: ImportSource
}

// ============================================================================
// Platform Detection
// ============================================================================

export type SupportedPlatform = 'rebrickable-moc' | 'rebrickable-set' | 'bricklink-studio'

export interface PlatformMatch {
  platform: SupportedPlatform
  externalId: string
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): PlatformMatch | null {
  // Rebrickable MOC: rebrickable.com/mocs/MOC-{id}/*
  const rebrickableMocMatch = url.match(/rebrickable\.com\/mocs\/MOC-(\d+)/i)
  if (rebrickableMocMatch) {
    return { platform: 'rebrickable-moc', externalId: `MOC-${rebrickableMocMatch[1]}` }
  }

  // Rebrickable Set: rebrickable.com/sets/{number}/*
  const rebrickableSetMatch = url.match(/rebrickable\.com\/sets\/([^/]+)/i)
  if (rebrickableSetMatch) {
    return { platform: 'rebrickable-set', externalId: rebrickableSetMatch[1] }
  }

  // BrickLink Studio: bricklink.com/v3/studio/design.page?idModel={id}
  const bricklinkMatch = url.match(/bricklink\.com\/v3\/studio\/design\.page\?idModel=(\d+)/i)
  if (bricklinkMatch) {
    return { platform: 'bricklink-studio', externalId: bricklinkMatch[1] }
  }

  return null
}

/**
 * Get user-friendly platform name
 */
export function getPlatformDisplayName(platform: SupportedPlatform): string {
  switch (platform) {
    case 'rebrickable-moc':
      return 'Rebrickable MOC'
    case 'rebrickable-set':
      return 'Rebrickable Set'
    case 'bricklink-studio':
      return 'BrickLink Studio'
  }
}
