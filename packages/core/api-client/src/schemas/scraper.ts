import { z } from 'zod'

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

export const ScrapeJobSchema = z.object({
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
  children: z.array(z.lazy(() => ScrapeJobSchema)).optional(),
})

export type ScrapeJob = z.infer<typeof ScrapeJobSchema>

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
