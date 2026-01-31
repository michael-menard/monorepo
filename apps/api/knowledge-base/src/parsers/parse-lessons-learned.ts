/**
 * LESSONS-LEARNED.md Parser
 *
 * Parses LESSONS-LEARNED.md markdown files and transforms them into ParsedEntry arrays.
 *
 * Features:
 * - Section-based parsing (## headings)
 * - Role inference from section context
 * - Tag extraction from section headers
 * - Format version detection
 * - Content sanitization
 *
 * Expected Structure:
 * ```markdown
 * ## KNOW-XXX - Story Title (date)
 *
 * ### What Went Well
 * - Learning point 1
 * - Learning point 2
 *
 * ### Patterns Established
 * - Pattern 1
 * ```
 *
 * @see KNOW-006 AC2
 */

import { logger } from '@repo/logger'
import {
  type ParsedEntry,
  type MarkdownParseResult,
  type ParsedRole,
  ParsedEntrySchema,
  sanitizeContent,
  validateFileSize,
  validateTag,
} from './__types__/index.js'

/**
 * Format version marker pattern.
 * Expected: <!-- format: v1.0 -->
 */
const FORMAT_VERSION_PATTERN = /<!--\s*format:\s*v?([\d.]+)\s*-->/i

/**
 * Current expected format version.
 */
const CURRENT_FORMAT_VERSION = '1.0'

// Note: Section/subsection parsing uses inline regex in split functions
// These patterns are documented here for reference:
// - Section header: /^##\s+(.+)$/
// - Subsection header: /^###\s+(.+)$/
// - Bullet point: /^[-*]\s+(.+)$/

/**
 * Code block pattern for preservation.
 */
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g

/**
 * Role inference rules based on section/subsection keywords.
 */
const ROLE_INFERENCE_RULES: Array<{ pattern: RegExp; role: ParsedRole }> = [
  { pattern: /backend|api|server|database|lambda|serverless/i, role: 'dev' },
  { pattern: /frontend|ui|component|react|tailwind/i, role: 'dev' },
  { pattern: /test|testing|qa|quality|coverage|vitest|playwright/i, role: 'qa' },
  { pattern: /pm|product|story|requirement|acceptance/i, role: 'pm' },
  { pattern: /pattern|architecture|design|decision/i, role: 'dev' },
  { pattern: /risk|mitigation|security/i, role: 'all' },
  { pattern: /documentation|docs|readme/i, role: 'all' },
  { pattern: /performance|optimization|token/i, role: 'dev' },
]

/**
 * Tag inference rules based on content keywords.
 */
const TAG_INFERENCE_RULES: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /token|cost|optimization/i, tag: 'tokens' },
  { pattern: /test|testing|vitest|playwright/i, tag: 'testing' },
  { pattern: /pattern|architecture/i, tag: 'pattern' },
  { pattern: /backend|api|lambda/i, tag: 'backend' },
  { pattern: /frontend|react|ui/i, tag: 'frontend' },
  { pattern: /database|drizzle|postgres/i, tag: 'database' },
  { pattern: /security|auth|validation/i, tag: 'security' },
  { pattern: /performance|latency|speed/i, tag: 'performance' },
  { pattern: /documentation|readme|docs/i, tag: 'documentation' },
  { pattern: /risk|mitigation/i, tag: 'risk' },
]

/**
 * Parse LESSONS-LEARNED.md and transform to ParsedEntry array.
 *
 * @param content - Markdown file content as string
 * @param filePath - Optional file path for source_file tracking
 * @returns MarkdownParseResult with entries, warnings, and format_version
 * @throws FileSizeLimitError if content exceeds 1MB
 *
 * @example
 * ```typescript
 * const result = parseLessonsLearned(markdownContent, 'LESSONS-LEARNED.md')
 * console.log(`Parsed ${result.entries.length} entries`)
 * ```
 */
export function parseLessonsLearned(content: string, filePath?: string): MarkdownParseResult {
  const startTime = Date.now()
  const warnings: string[] = []

  // Step 1: Validate file size (AC12)
  validateFileSize(content)

  // Step 2: Handle empty file
  if (!content || content.trim().length === 0) {
    logger.info('parseLessonsLearned: Empty markdown file', { filePath })
    return { entries: [], warnings: [], format_version: undefined }
  }

  // Step 3: Detect format version (AC15)
  const formatVersionMatch = content.match(FORMAT_VERSION_PATTERN)
  const formatVersion = formatVersionMatch?.[1]
  if (formatVersion && formatVersion !== CURRENT_FORMAT_VERSION) {
    warnings.push(
      `Format version mismatch: expected ${CURRENT_FORMAT_VERSION}, found ${formatVersion}`,
    )
  }
  if (!formatVersion) {
    warnings.push(
      `No format version marker found. Expected: <!-- format: v${CURRENT_FORMAT_VERSION} -->`,
    )
  }

  // Step 4: Preserve code blocks by replacing with placeholders
  const codeBlocks: string[] = []
  const contentWithPlaceholders = content.replace(CODE_BLOCK_PATTERN, match => {
    const index = codeBlocks.length
    codeBlocks.push(match)
    return `__CODE_BLOCK_${index}__`
  })

  // Step 5: Split into sections by ## headers
  const sections = splitIntoSections(contentWithPlaceholders)

  // Step 6: Parse each section
  const entries: ParsedEntry[] = []

  for (const section of sections) {
    try {
      const sectionEntries = parseSection(section, codeBlocks, filePath, warnings)
      entries.push(...sectionEntries)
    } catch (error) {
      warnings.push(
        `Failed to parse section "${section.header}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  const duration = Date.now() - startTime
  logger.info('parseLessonsLearned: Completed', {
    filePath,
    section_count: sections.length,
    entry_count: entries.length,
    warning_count: warnings.length,
    format_version: formatVersion,
    duration_ms: duration,
  })

  return {
    entries,
    warnings,
    format_version: formatVersion,
  }
}

/**
 * Represents a parsed section of the markdown file.
 */
interface Section {
  /** Section header (## heading text) */
  header: string
  /** Full section content including subsections */
  content: string
}

/**
 * Split markdown content into sections by ## headers.
 */
function splitIntoSections(content: string): Section[] {
  const sections: Section[] = []
  const lines = content.split('\n')
  let currentHeader = ''
  let currentContent: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)$/)
    if (headerMatch) {
      // Save previous section
      if (currentHeader) {
        sections.push({
          header: currentHeader,
          content: currentContent.join('\n'),
        })
      }
      currentHeader = headerMatch[1].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // Save last section
  if (currentHeader) {
    sections.push({
      header: currentHeader,
      content: currentContent.join('\n'),
    })
  }

  return sections
}

/**
 * Parse a single section into ParsedEntry array.
 */
function parseSection(
  section: Section,
  codeBlocks: string[],
  filePath: string | undefined,
  warnings: string[],
): ParsedEntry[] {
  const entries: ParsedEntry[] = []

  // Infer role from section header
  const role = inferRole(section.header, section.content)

  // Extract story reference from header (e.g., "KNOW-001 - Story Title")
  const storyMatch = section.header.match(/^(KNOW-\d+|STORY-\d+|WISH-\d+)/i)
  const storyRef = storyMatch?.[1]

  // Split section into subsections (### headers)
  const subsections = splitIntoSubsections(section.content)

  for (const subsection of subsections) {
    // Extract bullet points from subsection
    const bullets = extractBullets(subsection.content, codeBlocks)

    for (const bullet of bullets) {
      // Skip empty or very short bullets
      if (bullet.trim().length < 10) continue

      // Sanitize content
      const sanitizedContent = sanitizeContent(bullet)

      // Build tags
      const tags = buildTags(
        section.header,
        subsection.header,
        sanitizedContent,
        storyRef,
        warnings,
      )

      try {
        const entry: ParsedEntry = {
          content: sanitizedContent,
          role,
          tags: tags.length > 0 ? tags : undefined,
          source_file: filePath ?? 'LESSONS-LEARNED.md',
        }

        // Validate entry
        const validated = ParsedEntrySchema.parse(entry)
        entries.push(validated)
      } catch (error) {
        warnings.push(
          `Skipping invalid entry in "${subsection.header}": ${error instanceof Error ? error.message : 'Unknown'}`,
        )
      }
    }
  }

  return entries
}

/**
 * Represents a parsed subsection (### heading).
 */
interface Subsection {
  header: string
  content: string
}

/**
 * Split section content into subsections by ### headers.
 */
function splitIntoSubsections(content: string): Subsection[] {
  const subsections: Subsection[] = []
  const lines = content.split('\n')
  let currentHeader = 'General'
  let currentContent: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^###\s+(.+)$/)
    if (headerMatch) {
      // Save previous subsection
      if (currentContent.length > 0) {
        subsections.push({
          header: currentHeader,
          content: currentContent.join('\n'),
        })
      }
      currentHeader = headerMatch[1].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // Save last subsection
  if (currentContent.length > 0) {
    subsections.push({
      header: currentHeader,
      content: currentContent.join('\n'),
    })
  }

  return subsections
}

/**
 * Extract bullet points from subsection content.
 * Restores code blocks from placeholders.
 */
function extractBullets(content: string, codeBlocks: string[]): string[] {
  const bullets: string[] = []
  const lines = content.split('\n')
  let currentBullet: string[] = []
  let inBullet = false

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    const continuationMatch = line.match(/^\s{2,}(.+)$/)

    if (bulletMatch) {
      // Save previous bullet
      if (currentBullet.length > 0) {
        bullets.push(currentBullet.join('\n'))
      }
      currentBullet = [bulletMatch[1]]
      inBullet = true
    } else if (inBullet && continuationMatch) {
      // Continuation of bullet (indented line)
      currentBullet.push(continuationMatch[1])
    } else if (inBullet && line.trim() === '') {
      // Empty line ends bullet
      if (currentBullet.length > 0) {
        bullets.push(currentBullet.join('\n'))
      }
      currentBullet = []
      inBullet = false
    }
  }

  // Save last bullet
  if (currentBullet.length > 0) {
    bullets.push(currentBullet.join('\n'))
  }

  // Restore code blocks
  return bullets.map(bullet => {
    return bullet.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
      return codeBlocks[parseInt(index, 10)] ?? ''
    })
  })
}

/**
 * Infer role from section header and content.
 */
function inferRole(header: string, content: string): ParsedRole {
  const combined = `${header} ${content}`
  for (const rule of ROLE_INFERENCE_RULES) {
    if (rule.pattern.test(combined)) {
      return rule.role
    }
  }
  return 'all'
}

/**
 * Build tags array from section context and content.
 */
function buildTags(
  sectionHeader: string,
  subsectionHeader: string,
  content: string,
  storyRef: string | undefined,
  warnings: string[],
): string[] {
  const tags: string[] = []

  // Add source tag
  try {
    tags.push(validateTag('source:lessons-learned'))
  } catch {
    // Skip if invalid
  }

  // Add story reference tag
  if (storyRef) {
    try {
      tags.push(validateTag(`story:${storyRef.toLowerCase()}`))
    } catch {
      warnings.push(`Skipping invalid story tag: ${storyRef}`)
    }
  }

  // Add subsection category tag
  const subsectionTag = subsectionHeader
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  if (subsectionTag && subsectionTag.length > 0) {
    try {
      tags.push(validateTag(subsectionTag))
    } catch {
      // Skip if invalid
    }
  }

  // Infer tags from content
  const combined = `${sectionHeader} ${subsectionHeader} ${content}`
  for (const rule of TAG_INFERENCE_RULES) {
    if (rule.pattern.test(combined)) {
      try {
        const tag = validateTag(rule.tag)
        if (!tags.includes(tag)) {
          tags.push(tag)
        }
      } catch {
        // Skip if invalid
      }
    }
  }

  return tags
}

/**
 * Parse LESSONS-LEARNED.md and return flat array of entries.
 * Convenience wrapper that discards warnings and metadata.
 *
 * @param content - Markdown file content as string
 * @param filePath - Optional file path for source_file tracking
 * @returns Array of ParsedEntry
 */
export function parseLessonsLearnedSimple(content: string, filePath?: string): ParsedEntry[] {
  const result = parseLessonsLearned(content, filePath)
  return result.entries
}
