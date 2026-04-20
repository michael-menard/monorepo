/**
 * BullMQ Queue Definitions
 *
 * One queue per scraper type. Each queue has concurrency 1 (single Chrome profile per site).
 * bricklink-prices has a rate limiter of 15 jobs per hour.
 */

import { Queue } from 'bullmq'
import { z } from 'zod'
import type { ConnectionOptions } from 'bullmq'

// ─────────────────────────────────────────────────────────────────────────
// Job Schemas
// ─────────────────────────────────────────────────────────────────────────

export const BricklinkMinifigJobSchema = z.object({
  itemNumber: z.string(),
  itemType: z.enum(['M', 'S']).default('M'),
  wishlist: z.boolean().default(false),
  parentJobId: z.string().optional(),
})

export const BricklinkCatalogJobSchema = z.object({
  catalogUrl: z.string().url(),
  wishlist: z.boolean().default(false),
})

export const BricklinkPricesJobSchema = z.object({
  itemNumber: z.string(),
  itemType: z.enum(['M', 'S']).default('M'),
  variantId: z.string().uuid().optional(),
})

export const LegoSetJobSchema = z.object({
  url: z.string().url(),
  wishlist: z.boolean().default(false),
})

export const RebrickableSetJobSchema = z.object({
  url: z.string().url(),
  wishlist: z.boolean().default(false),
})

export const RebrickableMocsJobSchema = z.object({
  resume: z.boolean().default(false),
  force: z.boolean().default(false),
  retryFailed: z.boolean().default(false),
  retryMissing: z.boolean().default(false),
  likedMocs: z.boolean().default(false),
})

export type BricklinkMinifigJob = z.infer<typeof BricklinkMinifigJobSchema>
export type BricklinkCatalogJob = z.infer<typeof BricklinkCatalogJobSchema>
export type BricklinkPricesJob = z.infer<typeof BricklinkPricesJobSchema>
export type LegoSetJob = z.infer<typeof LegoSetJobSchema>
export type RebrickableSetJob = z.infer<typeof RebrickableSetJobSchema>
export type RebrickableMocsJob = z.infer<typeof RebrickableMocsJobSchema>

// ─────────────────────────────────────────────────────────────────────────
// Queue Names
// ─────────────────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  BRICKLINK_MINIFIG: 'scrape:bricklink-minifig',
  BRICKLINK_CATALOG: 'scrape:bricklink-catalog',
  BRICKLINK_PRICES: 'scrape:bricklink-prices',
  LEGO_SET: 'scrape:lego-set',
  REBRICKABLE_SET: 'scrape:rebrickable-set',
  REBRICKABLE_MOCS: 'scrape:rebrickable-mocs',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// ─────────────────────────────────────────────────────────────────────────
// Default Job Options
// ─────────────────────────────────────────────────────────────────────────

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: 200,
  removeOnFail: 100,
}

// ─────────────────────────────────────────────────────────────────────────
// Queue Factory
// ─────────────────────────────────────────────────────────────────────────

export function createQueues(connection: ConnectionOptions) {
  const bricklinkMinifig = new Queue<BricklinkMinifigJob>(QUEUE_NAMES.BRICKLINK_MINIFIG, {
    connection,
    defaultJobOptions,
  })

  const bricklinkCatalog = new Queue<BricklinkCatalogJob>(QUEUE_NAMES.BRICKLINK_CATALOG, {
    connection,
    defaultJobOptions,
  })

  // Note: rate limiter (15/hr) is applied on the Worker, not the Queue
  const bricklinkPrices = new Queue<BricklinkPricesJob>(QUEUE_NAMES.BRICKLINK_PRICES, {
    connection,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2, // fewer retries for rate-limited endpoint
    },
  })

  const legoSet = new Queue<LegoSetJob>(QUEUE_NAMES.LEGO_SET, {
    connection,
    defaultJobOptions,
  })

  const rebrickableSet = new Queue<RebrickableSetJob>(QUEUE_NAMES.REBRICKABLE_SET, {
    connection,
    defaultJobOptions,
  })

  const rebrickableMocs = new Queue<RebrickableMocsJob>(QUEUE_NAMES.REBRICKABLE_MOCS, {
    connection,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 1, // pipeline manages its own retries
    },
  })

  return {
    bricklinkMinifig,
    bricklinkCatalog,
    bricklinkPrices,
    legoSet,
    rebrickableSet,
    rebrickableMocs,
  }
}

/**
 * Get all queue instances as an array (useful for health checks)
 */
export function getAllQueues(queues: ReturnType<typeof createQueues>) {
  return Object.values(queues)
}
