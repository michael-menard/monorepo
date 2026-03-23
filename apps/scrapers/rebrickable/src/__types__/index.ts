import { z } from 'zod'

// ── CLI Configuration ─────────────────────────────────────────────────────────

export const CliOptionsSchema = z.object({
  headed: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  resume: z.boolean().default(false),
  force: z.boolean().default(false),
  limit: z.number().int().positive().optional(),
  ignoreRobots: z.boolean().default(false),
})

export type CliOptions = z.infer<typeof CliOptionsSchema>

// ── Environment Config ────────────────────────────────────────────────────────

export const EnvConfigSchema = z.object({
  SCRAPER_DB_HOST: z.string().default('localhost'),
  SCRAPER_DB_PORT: z.coerce.number().default(5432),
  SCRAPER_DB_USER: z.string().default('postgres'),
  SCRAPER_DB_PASSWORD: z.string().min(1),
  SCRAPER_DB_NAME: z.string().default('rebrickable'),
  REBRICKABLE_USERNAME: z.string().min(1),
  REBRICKABLE_PASSWORD: z.string().min(1),
  REBRICKABLE_USER_SLUG: z.string().min(1),
  SCRAPER_BUCKET: z.string().default('rebrickable-instructions'),
  SCRAPER_RATE_LIMIT: z.coerce.number().default(10),
  SCRAPER_MIN_DELAY_MS: z.coerce.number().default(2000),
  SCRAPER_HEADED: z
    .string()
    .transform(v => v === 'true')
    .default('false'),
})

export type EnvConfig = z.infer<typeof EnvConfigSchema>

// ── Scrape Run ────────────────────────────────────────────────────────────────

export const ScrapeRunStatusSchema = z.enum(['running', 'completed', 'failed', 'interrupted'])

export type ScrapeRunStatus = z.infer<typeof ScrapeRunStatusSchema>

export const ScrapeRunSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  status: ScrapeRunStatusSchema,
  instructionsFound: z.number().int().default(0),
  downloaded: z.number().int().default(0),
  skipped: z.number().int().default(0),
  errors: z.array(z.record(z.unknown())).default([]),
  config: z.record(z.unknown()).default({}),
  summary: z.record(z.unknown()).nullable().default(null),
})

export type ScrapeRun = z.infer<typeof ScrapeRunSchema>

// ── Instruction ───────────────────────────────────────────────────────────────

export const InstructionSchema = z.object({
  id: z.string().uuid(),
  mocNumber: z.string().min(1),
  title: z.string().min(1),
  author: z.string().default(''),
  purchaseDate: z.date().nullable(),
  rebrickableUrl: z.string().url(),
  downloadUrl: z.string().optional(),
  partsCount: z.number().int().default(0),
  fileType: z.string().default(''),
  fileSizeBytes: z.number().int().default(0),
  contentHash: z.string().default(''),
  minioKey: z.string().default(''),
  minioUrl: z.string().default(''),
  scrapeRunId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Instruction = z.infer<typeof InstructionSchema>

// ── Part ──────────────────────────────────────────────────────────────────────

export const PartSchema = z.object({
  id: z.string().uuid(),
  instructionId: z.string().uuid(),
  partNumber: z.string().min(1),
  name: z.string().default(''),
  color: z.string().default(''),
  category: z.string().default(''),
  quantity: z.number().int().default(1),
  imageUrl: z.string().default(''),
  createdAt: z.date(),
})

export type Part = z.infer<typeof PartSchema>

// ── Checkpoint ────────────────────────────────────────────────────────────────

export const CheckpointPhaseSchema = z.enum([
  'listed',
  'detail_scraped',
  'downloaded',
  'uploaded',
  'completed',
])

export type CheckpointPhase = z.infer<typeof CheckpointPhaseSchema>

export const CheckpointSchema = z.object({
  id: z.string().uuid(),
  scrapeRunId: z.string().uuid(),
  mocNumber: z.string().min(1),
  phase: CheckpointPhaseSchema,
  scrapedData: z.record(z.unknown()).default({}),
  createdAt: z.date(),
})

export type Checkpoint = z.infer<typeof CheckpointSchema>

// ── Scraped Data (intermediate, from page scraping) ───────────────────────────

export const ScrapedInstructionListItemSchema = z.object({
  mocNumber: z.string(),
  title: z.string(),
  author: z.string().default(''),
  url: z.string(),
  purchaseDate: z.string().optional(),
})

export type ScrapedInstructionListItem = z.infer<typeof ScrapedInstructionListItemSchema>

export const ScrapedPartSchema = z.object({
  partNumber: z.string(),
  name: z.string().default(''),
  color: z.string().default(''),
  category: z.string().default(''),
  quantity: z.coerce.number().int().default(1),
  isSpare: z.coerce.number().int().default(0),
  imageUrl: z.string().default(''),
})

export type ScrapedPart = z.infer<typeof ScrapedPartSchema>

export const ScrapedMocDetailSchema = z.object({
  mocNumber: z.string(),
  title: z.string(),
  author: z.string().default(''),
  partsCount: z.number().int().default(0),
  parts: z.array(ScrapedPartSchema).default([]),
  downloadUrl: z.string().optional(),
  fileType: z.string().default(''),
})

export type ScrapedMocDetail = z.infer<typeof ScrapedMocDetailSchema>

// ── Rate Limiter ──────────────────────────────────────────────────────────────

export const RateLimiterConfigSchema = z.object({
  requestsPerMinute: z.number().default(10),
  minDelayMs: z.number().default(2000),
  burstSize: z.number().default(3),
  jitter: z.number().min(0).max(1).default(0.3),
})

export type RateLimiterConfig = z.infer<typeof RateLimiterConfigSchema>

// ── Browser Config ────────────────────────────────────────────────────────────

export const BrowserConfigSchema = z.object({
  headed: z.boolean().default(false),
  profileDir: z.string().default('data/browser-profile'),
  viewportPool: z
    .array(z.object({ width: z.number(), height: z.number() }))
    .default([
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1920, height: 1080 },
    ]),
})

export type BrowserConfig = z.infer<typeof BrowserConfigSchema>

// ── Enrichment Summary ────────────────────────────────────────────────────────

export const EnrichmentSummarySchema = z.object({
  totalInstructions: z.number().int(),
  totalUniqueParts: z.number().int(),
  totalPartQuantity: z.number().int(),
  mostCommonParts: z.array(
    z.object({
      partNumber: z.string(),
      name: z.string(),
      appearances: z.number().int(),
      totalQuantity: z.number().int(),
    }),
  ),
  colorDistribution: z.record(z.number().int()),
  partsOverlapMatrix: z.record(z.record(z.number().int())).optional(),
})

export type EnrichmentSummary = z.infer<typeof EnrichmentSummarySchema>

// ── Human Behavior ────────────────────────────────────────────────────────────

export const WaitContextSchema = z.enum(['reading', 'scanning', 'thinking'])
export type WaitContext = z.infer<typeof WaitContextSchema>

// ── Retry Config ──────────────────────────────────────────────────────────────

export const RetryConfigSchema = z.object({
  maxRetries: z.number().int().default(3),
  baseDelayMs: z.number().default(1000),
  maxDelayMs: z.number().default(120000),
  backoffFactor: z.number().default(2),
})

export type RetryConfig = z.infer<typeof RetryConfigSchema>
