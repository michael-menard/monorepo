/**
 * Parser Type Schemas
 *
 * Zod schemas for parsed knowledge entries from YAML and markdown sources.
 *
 * @see KNOW-006 AC1, AC2 for parser requirements
 */

import { z } from 'zod'

/**
 * Maximum file size for parsing (1MB).
 * Prevents Node.js OOM on large files.
 *
 * @see KNOW-006 AC12
 */
export const MAX_FILE_SIZE_BYTES = 1_048_576

/**
 * Maximum number of tags per entry.
 *
 * @see KNOW-006 AC18
 */
export const MAX_TAGS_PER_ENTRY = 50

/**
 * Maximum tag length in characters.
 *
 * @see KNOW-006 QA Discovery - tag format validation
 */
export const MAX_TAG_LENGTH = 50

/**
 * Tag format validation regex.
 * Allows alphanumeric characters, hyphens, underscores, and colons (for type:value tags).
 *
 * @see KNOW-006 AC13 - tag format validation
 */
export const TAG_FORMAT_REGEX = /^[a-zA-Z0-9_:-]+$/

/**
 * Schema for validating individual tags.
 */
export const TagSchema = z
  .string()
  .min(1, 'Tag cannot be empty')
  .max(MAX_TAG_LENGTH, `Tag cannot exceed ${MAX_TAG_LENGTH} characters`)
  .regex(
    TAG_FORMAT_REGEX,
    'Tag must contain only alphanumeric characters, hyphens, underscores, or colons',
  )

/**
 * Valid roles for knowledge entries.
 */
export const ParsedRoleSchema = z.enum(['pm', 'dev', 'qa', 'all'])
export type ParsedRole = z.infer<typeof ParsedRoleSchema>

/**
 * Schema for parsed knowledge entries.
 * This is the common output format from all parsers.
 *
 * @see KNOW-006 AC1, AC2
 */
export const ParsedEntrySchema = z.object({
  /** Knowledge content text (1-30000 characters) */
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(30000, 'Content cannot exceed 30000 characters'),

  /** Role this knowledge is relevant for */
  role: ParsedRoleSchema,

  /** Optional tags for categorization (max 50 tags, validated format) */
  tags: z
    .array(TagSchema)
    .max(MAX_TAGS_PER_ENTRY, `Cannot have more than ${MAX_TAGS_PER_ENTRY} tags`)
    .optional(),

  /** Source file path for traceability */
  source_file: z.string().optional(),
})

export type ParsedEntry = z.infer<typeof ParsedEntrySchema>

/**
 * Schema for raw YAML seed entry (before transformation).
 * Matches the structure in seed-data.yaml.
 *
 * @see KNOW-006 AC1
 */
export const YamlSeedEntrySchema = z.object({
  /** Optional ID (ignored during import, UUID auto-generated) */
  id: z.string().optional(),

  /** Knowledge content text */
  content: z.string().min(1, 'Content cannot be empty'),

  /** Entry type (becomes a tag like 'type:fact') */
  entry_type: z.string().optional(),

  /** Roles this entry applies to (creates separate entry per role) */
  roles: z.array(ParsedRoleSchema).min(1, 'At least one role is required'),

  /** Tags for categorization */
  tags: z.array(z.string()).optional().nullable(),

  /** Source file reference */
  source_file: z.string().optional(),

  /** Source story reference */
  source_story: z.string().optional(),

  /** Confidence score (ignored for MVP) */
  confidence: z.number().min(0).max(1).optional(),
})

export type YamlSeedEntry = z.infer<typeof YamlSeedEntrySchema>

/**
 * Schema for YAML parse result.
 */
export const YamlParseResultSchema = z.object({
  /** Parsed and transformed entries */
  entries: z.array(ParsedEntrySchema),

  /** Non-fatal warnings encountered during parsing */
  warnings: z.array(z.string()),

  /** Count of entries before role expansion */
  raw_entry_count: z.number().int().min(0),
})

export type YamlParseResult = z.infer<typeof YamlParseResultSchema>

/**
 * Schema for markdown parse result.
 */
export const MarkdownParseResultSchema = z.object({
  /** Parsed entries */
  entries: z.array(ParsedEntrySchema),

  /** Non-fatal warnings encountered during parsing */
  warnings: z.array(z.string()),

  /** Detected format version (if present) */
  format_version: z.string().optional(),
})

export type MarkdownParseResult = z.infer<typeof MarkdownParseResultSchema>

/**
 * Custom error for YAML parsing failures.
 */
export class YamlParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(line ? `${message} (line ${line}${column ? `, column ${column}` : ''})` : message)
    this.name = 'YamlParseError'
  }
}

/**
 * Custom error for validation failures.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly entryId?: string,
  ) {
    super(entryId ? `[Entry ${entryId}] ${message}` : message)
    this.name = 'ValidationError'
  }
}

/**
 * Custom error for duplicate ID detection.
 */
export class DuplicateIdError extends Error {
  constructor(public readonly duplicateIds: string[]) {
    super(`Duplicate entry IDs found: ${duplicateIds.join(', ')}`)
    this.name = 'DuplicateIdError'
  }
}

/**
 * Custom error for file size limit exceeded.
 */
export class FileSizeLimitError extends Error {
  constructor(
    public readonly actualSize: number,
    public readonly maxSize: number = MAX_FILE_SIZE_BYTES,
  ) {
    super(`File size ${actualSize} bytes exceeds limit of ${maxSize} bytes (1MB)`)
    this.name = 'FileSizeLimitError'
  }
}

/**
 * Sanitize content by removing control characters.
 * Preserves newlines (0x0A), tabs (0x09), and carriage returns (0x0D).
 *
 * @param content - Raw content string
 * @returns Sanitized content with control characters removed
 *
 * @see KNOW-006 AC14
 */
export function sanitizeContent(content: string): string {
  // Remove control characters (0x00-0x1F) except:
  // - 0x09 (tab)
  // - 0x0A (newline)
  // - 0x0D (carriage return)
  // eslint-disable-next-line no-control-regex
  return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

/**
 * Validate file size.
 *
 * @param content - File content to validate
 * @throws FileSizeLimitError if content exceeds MAX_FILE_SIZE_BYTES
 */
export function validateFileSize(content: string): void {
  const size = Buffer.byteLength(content, 'utf8')
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new FileSizeLimitError(size)
  }
}

/**
 * Validate and sanitize a tag.
 *
 * @param tag - Raw tag string
 * @returns Sanitized and validated tag
 * @throws ValidationError if tag is invalid
 */
export function validateTag(tag: string): string {
  const sanitized = tag.trim().toLowerCase()
  const result = TagSchema.safeParse(sanitized)
  if (!result.success) {
    throw new ValidationError(`Invalid tag "${tag}": ${result.error.issues[0]?.message}`, 'tags')
  }
  return result.data
}
