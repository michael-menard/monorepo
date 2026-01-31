/**
 * YAML Seed Data Parser
 *
 * Parses seed-data.yaml files and transforms them into ParsedEntry arrays.
 *
 * Features:
 * - Zod validation for all parsed data
 * - Duplicate ID detection
 * - Multi-role expansion (creates entry per role)
 * - Tag normalization and validation
 * - Content sanitization (control character removal)
 * - Security: uses js-yaml safeLoad only
 *
 * @see KNOW-006 AC1, AC7, AC8
 */

import yaml from 'js-yaml'
import { logger } from '@repo/logger'
import {
  type ParsedEntry,
  type YamlSeedEntry,
  type YamlParseResult,
  ParsedEntrySchema,
  YamlSeedEntrySchema,
  YamlParseError,
  ValidationError,
  DuplicateIdError,
  sanitizeContent,
  validateFileSize,
  validateTag,
  MAX_TAGS_PER_ENTRY,
} from './__types__/index.js'

/**
 * Parse YAML seed data and transform to ParsedEntry array.
 *
 * @param content - YAML file content as string
 * @param filePath - Optional file path for source_file tracking
 * @returns YamlParseResult with entries, warnings, and raw_entry_count
 * @throws YamlParseError for malformed YAML
 * @throws ValidationError for missing required fields or invalid values
 * @throws DuplicateIdError for duplicate entry IDs
 * @throws FileSizeLimitError if content exceeds 1MB
 *
 * @example
 * ```typescript
 * const result = parseSeedYaml(yamlContent, 'seed-data.yaml')
 * console.log(`Parsed ${result.entries.length} entries`)
 * ```
 */
export function parseSeedYaml(content: string, filePath?: string): YamlParseResult {
  const startTime = Date.now()
  const warnings: string[] = []

  // Step 1: Validate file size (AC12)
  validateFileSize(content)

  // Step 2: Parse YAML with safeLoad (AC7: security)
  let rawData: unknown
  try {
    // Use yaml.load with JSON schema for safe parsing (no custom tags)
    rawData = yaml.load(content, {
      schema: yaml.JSON_SCHEMA,
      filename: filePath,
    })
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      throw new YamlParseError(
        error.message,
        error.mark?.line !== undefined ? error.mark.line + 1 : undefined,
        error.mark?.column !== undefined ? error.mark.column + 1 : undefined,
      )
    }
    throw new YamlParseError(
      `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  // Step 3: Handle empty file
  if (rawData === null || rawData === undefined) {
    logger.info('parseSeedYaml: Empty YAML file', { filePath })
    return { entries: [], warnings: [], raw_entry_count: 0 }
  }

  // Step 4: Validate root structure is array
  if (!Array.isArray(rawData)) {
    throw new YamlParseError('YAML root must be an array of entries')
  }

  // Step 5: Detect duplicate IDs (AC8)
  const idSet = new Set<string>()
  const duplicateIds: string[] = []
  for (const entry of rawData) {
    if (entry && typeof entry === 'object' && 'id' in entry && typeof entry.id === 'string') {
      if (idSet.has(entry.id)) {
        duplicateIds.push(entry.id)
      } else {
        idSet.add(entry.id)
      }
    }
  }
  if (duplicateIds.length > 0) {
    throw new DuplicateIdError([...new Set(duplicateIds)])
  }

  // Step 6: Validate and transform entries
  const entries: ParsedEntry[] = []
  const rawEntryCount = rawData.length

  for (let i = 0; i < rawData.length; i++) {
    const rawEntry = rawData[i]
    const entryId = rawEntry?.id ?? `index-${i}`

    try {
      // Validate raw entry structure
      const validatedRaw = YamlSeedEntrySchema.parse(rawEntry)

      // Transform to ParsedEntry for each role
      const transformedEntries = transformYamlEntry(validatedRaw, filePath, warnings)
      entries.push(...transformedEntries)
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        // Zod error
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> }
        const issue = zodError.issues[0]
        throw new ValidationError(
          `Invalid entry: ${issue?.message} at path "${issue?.path.join('.')}"`,
          issue?.path.join('.'),
          entryId,
        )
      }
      throw new ValidationError(
        `Failed to parse entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        entryId,
      )
    }
  }

  const duration = Date.now() - startTime
  logger.info('parseSeedYaml: Completed', {
    filePath,
    raw_entry_count: rawEntryCount,
    parsed_entry_count: entries.length,
    warning_count: warnings.length,
    duration_ms: duration,
  })

  return {
    entries,
    warnings,
    raw_entry_count: rawEntryCount,
  }
}

/**
 * Transform a validated YAML entry to ParsedEntry array.
 * Creates one ParsedEntry per role in the entry.
 *
 * @param entry - Validated YamlSeedEntry
 * @param filePath - Optional file path for source_file
 * @param warnings - Array to collect warnings
 * @returns Array of ParsedEntry (one per role)
 */
function transformYamlEntry(
  entry: YamlSeedEntry,
  filePath: string | undefined,
  warnings: string[],
): ParsedEntry[] {
  // Sanitize content (AC14)
  const sanitizedContent = sanitizeContent(entry.content)

  // Build tags array
  const tags: string[] = []

  // Add entry_type as tag
  if (entry.entry_type) {
    try {
      tags.push(validateTag(`type:${entry.entry_type}`))
    } catch {
      warnings.push(`Skipping invalid entry_type tag: ${entry.entry_type}`)
    }
  }

  // Add source_file as tag
  const sourceFile = filePath ?? entry.source_file
  if (sourceFile) {
    try {
      // Extract filename from path for cleaner tag
      const filename = sourceFile.split('/').pop() ?? sourceFile
      tags.push(validateTag(`source:${filename.replace(/\./g, '-')}`))
    } catch {
      warnings.push(`Skipping invalid source_file tag: ${sourceFile}`)
    }
  }

  // Add source_story as tag
  if (entry.source_story) {
    try {
      tags.push(validateTag(`story:${entry.source_story}`))
    } catch {
      warnings.push(`Skipping invalid source_story tag: ${entry.source_story}`)
    }
  }

  // Add entry tags
  if (entry.tags) {
    for (const tag of entry.tags) {
      try {
        const validatedTag = validateTag(tag)
        if (!tags.includes(validatedTag)) {
          tags.push(validatedTag)
        }
      } catch {
        warnings.push(`Skipping invalid tag: ${tag}`)
      }
    }
  }

  // Enforce max tags limit
  const finalTags = tags.slice(0, MAX_TAGS_PER_ENTRY)
  if (tags.length > MAX_TAGS_PER_ENTRY) {
    warnings.push(
      `Entry ${entry.id ?? 'unknown'} has ${tags.length} tags, truncated to ${MAX_TAGS_PER_ENTRY}`,
    )
  }

  // Create one ParsedEntry per role
  const parsedEntries: ParsedEntry[] = []
  for (const role of entry.roles) {
    const parsed: ParsedEntry = {
      content: sanitizedContent,
      role,
      tags: finalTags.length > 0 ? finalTags : undefined,
      source_file: sourceFile,
    }

    // Validate final entry
    const validated = ParsedEntrySchema.parse(parsed)
    parsedEntries.push(validated)
  }

  return parsedEntries
}

/**
 * Parse YAML seed data and return flat array of entries.
 * Convenience wrapper that discards warnings and metadata.
 *
 * @param content - YAML file content as string
 * @param filePath - Optional file path for source_file tracking
 * @returns Array of ParsedEntry
 */
export function parseSeedYamlSimple(content: string, filePath?: string): ParsedEntry[] {
  const result = parseSeedYaml(content, filePath)
  return result.entries
}
