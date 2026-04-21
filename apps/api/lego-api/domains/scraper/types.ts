import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────
// URL Auto-Detection
// ─────────────────────────────────────────────────────────────────────────

export const ScraperTypeSchema = z.enum([
  'bricklink-minifig',
  'bricklink-catalog',
  'bricklink-prices',
  'lego-set',
  'rebrickable-set',
  'rebrickable-mocs',
  'rebrickable-moc-single',
])

export type ScraperType = z.infer<typeof ScraperTypeSchema>

/**
 * Auto-detect scraper type from a URL or item identifier.
 */
export function detectScraperType(input: string): ScraperType | null {
  const lower = input.toLowerCase()

  // BrickLink catalog list
  if (lower.includes('bricklink.com') && lower.includes('cataloglist')) {
    return 'bricklink-catalog'
  }

  // BrickLink single item (URL)
  if (lower.includes('bricklink.com') && (lower.includes('m=') || lower.includes('s='))) {
    return 'bricklink-minifig'
  }

  // LEGO.com product page
  if (lower.includes('lego.com') && lower.includes('product')) {
    return 'lego-set'
  }

  // Rebrickable set page
  if (lower.includes('rebrickable.com') && lower.includes('/sets/')) {
    return 'rebrickable-set'
  }

  // Bare item number — CMF sets start with "col", regular minifigs are anything else
  if (/^[a-z]{2,}[\d-]+$/i.test(input)) {
    return 'bricklink-minifig'
  }

  return null
}

/**
 * Detect BrickLink item type from a number/ID string.
 */
export function detectBricklinkItemType(itemId: string): 'M' | 'S' {
  return /^col/i.test(itemId) ? 'S' : 'M'
}

// ─────────────────────────────────────────────────────────────────────────
// Job Input Schemas
// ─────────────────────────────────────────────────────────────────────────

export const AddJobInputSchema = z.object({
  url: z.string().min(1),
  type: ScraperTypeSchema.optional(), // auto-detected if not provided
  wishlist: z.boolean().optional().default(false),
  // Rebrickable MOC pipeline options
  resume: z.boolean().optional(),
  force: z.boolean().optional(),
  retryFailed: z.boolean().optional(),
  retryMissing: z.boolean().optional(),
  likedMocs: z.boolean().optional(),
})

export type AddJobInput = z.infer<typeof AddJobInputSchema>

export const JobListQuerySchema = z.object({
  status: z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']).optional(),
  type: ScraperTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

// ─────────────────────────────────────────────────────────────────────────
// Response Schemas
// ─────────────────────────────────────────────────────────────────────────

export const JobResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  data: z.record(z.unknown()),
  progress: z.unknown().optional(),
  attemptsMade: z.number(),
  failedReason: z.string().nullable().optional(),
  createdAt: z.string(),
  processedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  parentJobId: z.string().nullable().optional(),
})

export type JobResponse = z.infer<typeof JobResponseSchema>

export const QueueHealthSchema = z.object({
  name: z.string(),
  waiting: z.number(),
  active: z.number(),
  completed: z.number(),
  failed: z.number(),
  delayed: z.number(),
  isPaused: z.boolean(),
  circuitBreaker: z.object({
    isOpen: z.boolean(),
    trippedAt: z.string().nullable(),
    resumesAt: z.string().nullable(),
    reason: z.string().nullable(),
  }),
})

export type QueueHealth = z.infer<typeof QueueHealthSchema>
