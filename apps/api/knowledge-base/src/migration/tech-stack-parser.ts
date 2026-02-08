/**
 * Tech Stack Documentation Parser
 *
 * Parses tech stack markdown files (backend.md, frontend.md, monorepo.md)
 * for KB import as reference documentation.
 *
 * @see Migration plan for tech stack migration requirements
 */

import { logger } from '@repo/logger'
import { type TechStackEntry } from './__types__/index.js'

/**
 * Category mapping based on filename.
 */
const CATEGORY_MAP: Record<string, string> = {
  'backend.md': 'backend',
  'frontend.md': 'frontend',
  'monorepo.md': 'monorepo',
}

/**
 * Parse a tech stack markdown file.
 *
 * @param content - File content to parse
 * @param sourceFile - Source file path for traceability
 * @returns Parsed tech stack entry
 */
export function parseTechStackFile(content: string, sourceFile: string): TechStackEntry | null {
  logger.debug('Parsing tech stack file', { sourceFile, contentLength: content.length })

  // Extract filename from path
  const filename = sourceFile.split('/').pop() || sourceFile

  // Determine category from filename
  const category = CATEGORY_MAP[filename] || 'general'

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : `Tech Stack: ${category}`

  // Normalize content
  const normalizedContent = normalizeContent(content)

  // Skip if too short
  if (normalizedContent.length < 50) {
    logger.warn('Tech stack file too short, skipping', {
      sourceFile,
      length: normalizedContent.length,
    })
    return null
  }

  logger.info('Parsed tech stack file', {
    sourceFile,
    title,
    category,
    contentLength: normalizedContent.length,
  })

  return {
    title,
    category,
    content: normalizedContent,
    source_file: sourceFile,
  }
}

/**
 * Parse multiple tech stack files.
 *
 * @param files - Array of { content, sourceFile } objects
 * @returns Array of parsed tech stack entries
 */
export function parseTechStackFiles(
  files: Array<{ content: string; sourceFile: string }>,
): TechStackEntry[] {
  const entries: TechStackEntry[] = []

  for (const file of files) {
    const entry = parseTechStackFile(file.content, file.sourceFile)
    if (entry) {
      entries.push(entry)
    }
  }

  return entries
}

/**
 * Normalize content by trimming and collapsing excessive whitespace.
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
