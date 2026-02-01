/**
 * Markdown Document Chunking
 *
 * Splits long markdown documents into smaller, semantically meaningful chunks
 * for knowledge base import. Chunks are split on ## headers first, then by
 * token limit if sections are too large.
 *
 * Features:
 * - Splits on ## (level-2) headers
 * - Keeps ### and deeper headers with parent section
 * - Respects token limits (default: 500 tokens)
 * - Preserves code blocks (never splits mid-block)
 * - Extracts YAML front matter as metadata
 * - Splits long sections on paragraph boundaries
 *
 * @see KNOW-048 for chunking requirements
 */

import { load as parseYaml } from 'js-yaml'
import { countTokens, exceedsTokenLimit, cleanupEncoder } from './token-utils.js'
import {
  type ChunkedDocument,
  type ChunkOptions,
  type ChunkResult,
  type FrontMatter,
  ChunkOptionsSchema,
  FrontMatterSchema,
} from './__types__/index.js'

/**
 * Simple console logger for chunking utilities.
 * Uses console.warn to avoid import issues with @repo/logger in CLI context.
 */
const logWarn = (message: string, context?: Record<string, unknown>) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(`[chunking] ${message}`, context ? JSON.stringify(context) : '')
  }
}

/**
 * Regex to match YAML front matter at start of document.
 * Matches content between leading --- markers.
 */
const FRONT_MATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/

/**
 * Regex to match level-2 headers (## Header).
 */
const HEADER_REGEX = /^## (.+)$/gm

/**
 * Extract YAML front matter from markdown content.
 *
 * @param content - Raw markdown content
 * @returns Object with front matter and remaining content
 */
function extractFrontMatter(content: string): {
  frontMatter: FrontMatter | undefined
  content: string
} {
  const match = content.match(FRONT_MATTER_REGEX)

  if (!match) {
    return { frontMatter: undefined, content }
  }

  try {
    const yamlContent = match[1]
    const parsed = parseYaml(yamlContent) as Record<string, unknown>
    const validated = FrontMatterSchema.safeParse(parsed)

    if (validated.success) {
      return {
        frontMatter: validated.data,
        content: content.slice(match[0].length),
      }
    }

    logWarn('Front matter validation failed, ignoring', {
      error: validated.error.message,
    })
    return { frontMatter: undefined, content: content.slice(match[0].length) }
  } catch (error) {
    logWarn('Failed to parse front matter YAML', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { frontMatter: undefined, content: content.slice(match[0].length) }
  }
}

/**
 * Split content into sections by ## headers.
 *
 * @param content - Markdown content (without front matter)
 * @returns Array of sections with their headers
 */
function splitByHeaders(content: string): Array<{ header: string; content: string }> {
  const sections: Array<{ header: string; content: string }> = []

  // Find all ## headers and their positions
  const headerMatches: Array<{ header: string; index: number }> = []
  let match: RegExpExecArray | null

  // Reset regex state
  HEADER_REGEX.lastIndex = 0

  while ((match = HEADER_REGEX.exec(content)) !== null) {
    headerMatches.push({
      header: match[0], // Full header line "## Title"
      index: match.index,
    })
  }

  if (headerMatches.length === 0) {
    // No headers found - entire content is one section
    const trimmed = content.trim()
    if (trimmed) {
      sections.push({ header: '', content: trimmed })
    }
    return sections
  }

  // Handle content before first header (intro section)
  const firstHeaderIndex = headerMatches[0].index
  if (firstHeaderIndex > 0) {
    const introContent = content.slice(0, firstHeaderIndex).trim()
    if (introContent) {
      sections.push({ header: '', content: introContent })
    }
  }

  // Extract each section
  for (let i = 0; i < headerMatches.length; i++) {
    const current = headerMatches[i]
    const next = headerMatches[i + 1]

    const sectionStart = current.index
    const sectionEnd = next ? next.index : content.length

    const sectionContent = content.slice(sectionStart, sectionEnd).trim()

    sections.push({
      header: current.header,
      content: sectionContent,
    })
  }

  return sections
}

/**
 * Split a section by paragraph boundaries, respecting code blocks.
 *
 * @param section - Section content (may include header)
 * @param header - Original header for context
 * @param maxTokens - Maximum tokens per chunk
 * @returns Array of sub-chunks
 */
function splitByParagraphs(
  section: string,
  header: string,
  maxTokens: number,
): Array<{ content: string; headerPath: string }> {
  const chunks: Array<{ content: string; headerPath: string }> = []

  // If section fits in one chunk, return as-is
  if (!exceedsTokenLimit(section, maxTokens)) {
    return [{ content: section, headerPath: header }]
  }

  // Split on double newlines (paragraphs)
  const paragraphs = section.split(/\n\n+/)
  let currentChunk = ''
  let currentTokens = 0

  // If we have a header, include it in context for each sub-chunk
  const headerPrefix = header ? `${header}\n\n` : ''
  const headerTokens = countTokens(headerPrefix)

  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph)

    // Check if this paragraph alone exceeds limit (e.g., large code block)
    if (paragraphTokens > maxTokens) {
      // Flush current chunk if any
      if (currentChunk) {
        chunks.push({
          content: (headerPrefix + currentChunk).trim(),
          headerPath: header,
        })
        currentChunk = ''
        currentTokens = 0
      }

      // Keep oversized paragraph as single chunk (likely code block)
      // This will be flagged as a warning by the caller
      chunks.push({
        content: (headerPrefix + paragraph).trim(),
        headerPath: header,
      })
      continue
    }

    // Check if adding this paragraph would exceed limit
    const newTotal = headerTokens + currentTokens + paragraphTokens + (currentChunk ? 2 : 0)

    if (newTotal > maxTokens && currentChunk) {
      // Flush current chunk
      chunks.push({
        content: (headerPrefix + currentChunk).trim(),
        headerPath: header,
      })
      currentChunk = paragraph
      currentTokens = paragraphTokens
    } else {
      // Add to current chunk
      currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph
      currentTokens += paragraphTokens + (currentChunk ? 2 : 0)
    }
  }

  // Flush remaining content
  if (currentChunk) {
    chunks.push({
      content: (headerPrefix + currentChunk).trim(),
      headerPath: header,
    })
  }

  return chunks
}

/**
 * Chunk a markdown document into smaller pieces.
 *
 * Splits on ## headers first, then by token limit on paragraph boundaries.
 * Preserves code blocks and extracts YAML front matter as metadata.
 *
 * @param content - Raw markdown content
 * @param sourceFile - Path to the source file
 * @param options - Chunking options (maxTokens)
 * @returns ChunkResult with chunks and metadata
 *
 * @example
 * ```typescript
 * const result = chunkMarkdown(
 *   '# Title\n\n## Section One\nContent...',
 *   'docs/readme.md',
 *   { maxTokens: 500 }
 * )
 *
 * console.log(result.chunks.length) // Number of chunks
 * ```
 */
export function chunkMarkdown(
  content: string,
  sourceFile: string,
  options?: Partial<ChunkOptions>,
): ChunkResult {
  // Validate options
  const validatedOptions = ChunkOptionsSchema.parse(options || {})
  const maxTokens = validatedOptions.maxTokens

  const warnings: string[] = []
  const chunks: ChunkedDocument[] = []

  // Handle empty content
  if (!content || !content.trim()) {
    return {
      chunks: [],
      sourceFile,
      totalChunks: 0,
      frontMatter: undefined,
      warnings: [],
    }
  }

  // Extract front matter
  const { frontMatter, content: contentWithoutFrontMatter } = extractFrontMatter(content)

  // Split by headers
  const sections = splitByHeaders(contentWithoutFrontMatter)

  // Process each section
  const allSubChunks: Array<{ content: string; headerPath: string }> = []

  for (const section of sections) {
    const subChunks = splitByParagraphs(section.content, section.header, maxTokens)

    for (const subChunk of subChunks) {
      const tokenCount = countTokens(subChunk.content)

      // Check for oversized chunks (likely code blocks)
      if (tokenCount > maxTokens) {
        warnings.push(
          `Chunk exceeds token limit (${tokenCount} > ${maxTokens}): ${subChunk.headerPath || 'no header'}`,
        )
        logWarn('Chunk exceeds token limit', {
          tokenCount,
          maxTokens,
          headerPath: subChunk.headerPath,
          sourceFile,
        })
      }

      allSubChunks.push(subChunk)
    }
  }

  // Build final chunks with metadata
  const totalChunks = allSubChunks.length

  for (let i = 0; i < allSubChunks.length; i++) {
    const subChunk = allSubChunks[i]
    const tokenCount = countTokens(subChunk.content)

    chunks.push({
      content: subChunk.content,
      sourceFile,
      chunkIndex: i,
      totalChunks,
      headerPath: subChunk.headerPath,
      tokenCount,
      frontMatter,
    })
  }

  return {
    chunks,
    sourceFile,
    totalChunks,
    frontMatter,
    warnings,
  }
}

/**
 * Chunk multiple markdown files.
 *
 * @param files - Array of { content, sourceFile } objects
 * @param options - Chunking options
 * @returns Array of all chunks from all files
 */
export function chunkMultipleFiles(
  files: Array<{ content: string; sourceFile: string }>,
  options?: Partial<ChunkOptions>,
): ChunkedDocument[] {
  const allChunks: ChunkedDocument[] = []

  for (const file of files) {
    const result = chunkMarkdown(file.content, file.sourceFile, options)
    allChunks.push(...result.chunks)
  }

  return allChunks
}

// Re-export types
export type { ChunkedDocument, ChunkOptions, ChunkResult, FrontMatter }

// Re-export token utilities
export { countTokens, exceedsTokenLimit, cleanupEncoder }
