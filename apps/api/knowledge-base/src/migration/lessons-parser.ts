/**
 * LESSONS-LEARNED.md Parser
 *
 * Parses LESSONS-LEARNED.md files to extract individual lessons for KB import.
 *
 * Handles multiple formats:
 * - Story-based sections (## STORY-XXX: Title)
 * - Category-based subsections (### Reuse Discoveries)
 * - Token usage summary tables
 * - Free-form lessons
 *
 * @see KNOW-043 AC1, AC2 for parser requirements
 */

import { logger } from '@repo/logger'
import { type LessonEntry, type ParsedLessonsFile, LESSON_CATEGORIES } from './__types__/index.js'

/**
 * Regex patterns for parsing LESSONS-LEARNED.md structure.
 */
const PATTERNS = {
  // Story section heading: ## STORY-XXX: Title or ## WRKF-XXXX: Title or ## KNOW-XXX - Title
  storyHeading: /^##\s+((?:STORY|WRKF|KNOW)-[\w-]+)(?:(?::\s*|\s+-\s+)(.+))?$/m,

  // Date line: Date: YYYY-MM-DD
  dateLine: /^Date:\s*(\d{4}-\d{2}-\d{2})/m,

  // Category subsection: ### Category Name
  categoryHeading: /^###\s+(.+)$/m,

  // Bullet point: - Content
  bulletPoint: /^-\s+(.+)$/,

  // Numbered item: 1. Content
  numberedItem: /^\d+\.\s+(.+)$/,

  // Code block
  codeBlock: /^```[\s\S]*?^```$/m,

  // Table row
  tableRow: /^\|.+\|$/m,
}

/**
 * Parse a single LESSONS-LEARNED.md file.
 *
 * @param content - File content to parse
 * @param sourceFile - Source file path for traceability
 * @returns Parsed lessons and warnings
 */
export function parseLessonsFile(content: string, sourceFile: string): ParsedLessonsFile {
  const lessons: LessonEntry[] = []
  const warnings: string[] = []
  let storyCount = 0

  logger.debug('Parsing lessons file', { sourceFile, contentLength: content.length })

  // Split into sections by story headings
  const lines = content.split('\n')
  let currentStory: { id: string; title?: string; date?: string } | null = null
  let currentCategory: string | null = null
  let currentContent: string[] = []
  let lineNumber = 0

  // Skip initial header section (before first story)
  let foundFirstStory = false

  for (const line of lines) {
    lineNumber++

    // Check for story heading
    const storyMatch = line.match(PATTERNS.storyHeading)
    if (storyMatch) {
      // Save previous category content
      if (currentStory && currentCategory && currentContent.length > 0) {
        const lessonContent = normalizeContent(currentContent.join('\n'))
        if (lessonContent.length > 10) {
          // Skip very short content
          lessons.push({
            story_id: currentStory.id,
            story_title: currentStory.title,
            captured_date: currentStory.date,
            category: currentCategory,
            content: lessonContent,
            source_file: sourceFile,
            source_line: lineNumber,
          })
        }
      }

      // Start new story
      currentStory = {
        id: storyMatch[1],
        title: storyMatch[2]?.trim(),
      }
      currentCategory = null
      currentContent = []
      storyCount++
      foundFirstStory = true
      continue
    }

    // Check for date line
    if (currentStory && !currentStory.date) {
      const dateMatch = line.match(PATTERNS.dateLine)
      if (dateMatch) {
        currentStory.date = dateMatch[1]
        continue
      }
    }

    // Check for category heading
    const categoryMatch = line.match(PATTERNS.categoryHeading)
    if (categoryMatch && foundFirstStory) {
      // Save previous category content
      if (currentStory && currentCategory && currentContent.length > 0) {
        const lessonContent = normalizeContent(currentContent.join('\n'))
        if (lessonContent.length > 10) {
          lessons.push({
            story_id: currentStory.id,
            story_title: currentStory.title,
            captured_date: currentStory.date,
            category: currentCategory,
            content: lessonContent,
            source_file: sourceFile,
            source_line: lineNumber,
          })
        }
      }

      currentCategory = categoryMatch[1].trim()
      currentContent = []
      continue
    }

    // Accumulate content if we have a category
    if (currentCategory && foundFirstStory) {
      // Skip horizontal rules
      if (line.match(/^---+$/)) continue

      currentContent.push(line)
    }
  }

  // Save final category content
  if (currentStory && currentCategory && currentContent.length > 0) {
    const lessonContent = normalizeContent(currentContent.join('\n'))
    if (lessonContent.length > 10) {
      lessons.push({
        story_id: currentStory.id,
        story_title: currentStory.title,
        captured_date: currentStory.date,
        category: currentCategory,
        content: lessonContent,
        source_file: sourceFile,
        source_line: lineNumber,
      })
    }
  }

  // Check for known categories that weren't found
  if (lessons.length === 0 && content.length > 100) {
    warnings.push(
      `No lessons extracted from ${sourceFile} - format may not match expected structure`,
    )
  }

  // Check for unrecognized categories
  const recognizedCategories = new Set(LESSON_CATEGORIES)
  const foundCategories = new Set(lessons.map(l => l.category))
  for (const category of foundCategories) {
    if (!recognizedCategories.has(category as (typeof LESSON_CATEGORIES)[number])) {
      logger.debug('Found non-standard category', { category, sourceFile })
    }
  }

  logger.info('Parsed lessons file', {
    sourceFile,
    storyCount,
    lessonsExtracted: lessons.length,
    warningCount: warnings.length,
  })

  return {
    source_file: sourceFile,
    lessons,
    warnings,
    story_count: storyCount,
  }
}

/**
 * Normalize lesson content.
 *
 * - Trim whitespace
 * - Remove empty lines at start/end
 * - Normalize excessive newlines
 * - Preserve code blocks and bullet structure
 *
 * @param content - Raw content to normalize
 * @returns Normalized content
 */
function normalizeContent(content: string): string {
  // Trim and remove empty lines at edges
  let normalized = content.trim()

  // Collapse more than 2 consecutive newlines
  normalized = normalized.replace(/\n{3,}/g, '\n\n')

  // Remove trailing whitespace from each line
  normalized = normalized
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')

  return normalized
}

/**
 * Parse alternative format: single-section lessons without story headers.
 *
 * Some LESSONS-LEARNED.md files (like KNOW-001) use a single large section
 * with main headers instead of story-based sections.
 *
 * @param content - File content to parse
 * @param sourceFile - Source file path
 * @returns Parsed lessons
 */
export function parseAlternativeFormat(content: string, sourceFile: string): ParsedLessonsFile {
  const lessons: LessonEntry[] = []
  const warnings: string[] = []

  logger.debug('Attempting alternative format parsing', { sourceFile })

  // Split by ## headings
  const sections = content.split(/(?=^## )/m).filter(s => s.trim())

  for (const section of sections) {
    const lines = section.split('\n')
    const headingLine = lines[0]

    // Extract heading
    const headingMatch = headingLine?.match(/^##\s+(.+)$/)
    if (!headingMatch) continue

    const heading = headingMatch[1].trim()

    // Skip metadata sections
    if (heading === 'Meta Information') continue

    // Get content after heading
    const sectionContent = lines.slice(1).join('\n').trim()
    if (sectionContent.length < 20) continue

    // Try to extract story ID from the file
    const storyIdMatch = sourceFile.match(/(KNOW-\d+|STORY-\d+|WRKF-\d+)/i)
    const storyId = storyIdMatch ? storyIdMatch[1].toUpperCase() : 'UNKNOWN'

    lessons.push({
      story_id: storyId,
      category: heading,
      content: normalizeContent(sectionContent),
      source_file: sourceFile,
    })
  }

  if (lessons.length === 0) {
    warnings.push(`No lessons extracted using alternative format from ${sourceFile}`)
  }

  return {
    source_file: sourceFile,
    lessons,
    warnings,
    story_count: lessons.length > 0 ? 1 : 0,
  }
}

/**
 * Smart parse that tries both formats.
 *
 * @param content - File content to parse
 * @param sourceFile - Source file path
 * @returns Parsed lessons using best format
 */
export function smartParseLessonsFile(content: string, sourceFile: string): ParsedLessonsFile {
  // First try standard story-based format
  const standardResult = parseLessonsFile(content, sourceFile)

  // If successful (found lessons), return
  if (standardResult.lessons.length > 0) {
    return standardResult
  }

  // Try alternative format
  const alternativeResult = parseAlternativeFormat(content, sourceFile)

  if (alternativeResult.lessons.length > 0) {
    logger.info('Used alternative format for parsing', {
      sourceFile,
      lessonsFound: alternativeResult.lessons.length,
    })
    return alternativeResult
  }

  // Return standard result with warnings
  return {
    ...standardResult,
    warnings: [
      ...standardResult.warnings,
      'Neither standard nor alternative format yielded lessons',
    ],
  }
}

export { PATTERNS }
