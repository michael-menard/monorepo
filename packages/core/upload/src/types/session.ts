/**
 * Uploader Session Types
 *
 * Zod schemas for uploader state persistence.
 * Only minimal file metadata is stored (no blobs).
 */

import { z } from 'zod'

/**
 * Schema version for migration support.
 * Increment when schema changes.
 */
export const UPLOADER_SESSION_VERSION = 1

/**
 * File metadata schema - only minimal info, no blobs.
 */
export const FileMetadataSchema = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
  lastModified: z.number(),
  /** File type category: instruction, parts-list, thumbnail, gallery-image */
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']).optional(),
  /** Upload status for resume */
  uploadStatus: z.enum(['pending', 'uploading', 'uploaded', 'failed']).optional(),
})

export type FileMetadata = z.infer<typeof FileMetadataSchema>

/**
 * Uploader step enum for tracking progress.
 */
export const UploaderStepSchema = z.enum([
  'metadata', // Title, description, tags
  'files', // File selection and upload
  'review', // Review before finalize
])

export type UploaderStep = z.infer<typeof UploaderStepSchema>

/**
 * Main uploader session schema.
 */
export const UploaderSessionSchema = z.object({
  /** Schema version for migration */
  version: z.number().default(UPLOADER_SESSION_VERSION),
  /** MOC title */
  title: z.string().default(''),
  /** MOC description */
  description: z.string().default(''),
  /** Tags array */
  tags: z.array(z.string()).default([]),
  /** Theme/category */
  theme: z.string().default(''),
  /** Current step */
  step: UploaderStepSchema.default('metadata'),
  /** File metadata (no blobs) */
  files: z.array(FileMetadataSchema).default([]),
  /** Upload token from initialize API */
  uploadToken: z.string().optional(),
  /** MOC ID if initialized */
  mocId: z.string().optional(),
  /** Session ID for anonymous users */
  anonSessionId: z.string().optional(),
  /** Timestamp of last update */
  updatedAt: z.number().default(() => Date.now()),
})

export type UploaderSession = z.infer<typeof UploaderSessionSchema>

/**
 * Storage key format: uploader:{route}:{userId|anon}
 */
export const getStorageKey = (route: string, userId?: string, anonSessionId?: string): string => {
  const userKey = userId || anonSessionId || 'anon'
  return `uploader:${route}:${userKey}`
}

/**
 * Generate a temporary anonymous session ID.
 */
export const generateAnonSessionId = (): string =>
  `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

/**
 * Parse session from JSON string with validation.
 * Returns null if parsing fails or data is invalid.
 */
export const parseSession = (json: string | null): UploaderSession | null => {
  if (!json) return null

  try {
    const parsed = JSON.parse(json)

    // Handle legacy numeric step values by mapping them to the current
    // string-based enum before validation.
    let candidate: any = parsed
    if (typeof candidate.step === 'number') {
      const stepMap: Record<number, UploaderStep> = {
        1: 'metadata',
        2: 'files',
        3: 'review',
      }
      candidate = {
        ...candidate,
        step: stepMap[candidate.step] ?? 'metadata',
      }
    }

    const result = UploaderSessionSchema.safeParse(candidate)

    if (result.success) {
      return result.data
    }

    return null
  } catch {
    return null
  }
}

/**
 * Serialize session to JSON string.
 * Updates the updatedAt timestamp.
 */
export const serializeSession = (session: UploaderSession): string => {
  const withTimestamp = {
    ...session,
    updatedAt: Date.now(),
  }
  return JSON.stringify(withTimestamp)
}

/**
 * Create empty session with defaults.
 */
export const createEmptySession = (): UploaderSession => UploaderSessionSchema.parse({})

/**
 * Extract file metadata from File object (no blob).
 */
export const fileToMetadata = (file: File, fileType?: FileMetadata['fileType']): FileMetadata => ({
  name: file.name,
  size: file.size,
  type: file.type,
  lastModified: file.lastModified,
  fileType,
  uploadStatus: 'pending',
})

/**
 * Migrate old session versions to current.
 * Add migration logic here when schema changes.
 */
export const migrateSession = (session: UploaderSession): UploaderSession => {
  // Currently no migrations needed (version 1)
  if (session.version === UPLOADER_SESSION_VERSION) {
    return session
  }

  // Future migrations would go here:
  // if (session.version === 1) { ... migrate to 2 ... }

  return {
    ...session,
    version: UPLOADER_SESSION_VERSION,
  }
}
