import { z } from 'zod'

// ─── Scraped Part ─────────────────────────────────────────────────────────

export const ScrapedPartSchema = z.object({
  partNumber: z.string(),
  name: z.string(),
  color: z.string(),
  colorId: z.number().nullable(),
  quantity: z.number().int().min(1),
  imageUrl: z.string().nullable(),
})

export type ScrapedPart = z.infer<typeof ScrapedPartSchema>

// ─── Scraped MOC Detail ───────────────────────────────────────────────────

export const ScrapedMocDetailSchema = z.object({
  idModel: z.number(),
  title: z.string(),
  author: z.string(),
  authorUrl: z.string().nullable(),
  authorLocation: z.string().nullable(),
  description: z.string().nullable(),
  publishedDate: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),

  // Stats
  views: z.number().int(),
  downloads: z.number().int(),
  likes: z.number().int(),
  comments: z.number().int(),

  // Parts summary
  lotCount: z.number().int(),
  itemCount: z.number().int(),
  colorCount: z.number().int(),

  // Images
  mainImageUrl: z.string().nullable(),
  galleryImageUrls: z.array(z.string()),

  // Parts list
  parts: z.array(ScrapedPartSchema),

  // Source
  sourceUrl: z.string(),
})

export type ScrapedMocDetail = z.infer<typeof ScrapedMocDetailSchema>

// ─── CLI Options ──────────────────────────────────────────────────────────

export const CliOptionsSchema = z.object({
  url: z.string(),
  headed: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  jobId: z.string().optional(),
})

export type CliOptions = z.infer<typeof CliOptionsSchema>
