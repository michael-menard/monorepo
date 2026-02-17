import { readFile } from 'fs/promises'
import matter from 'gray-matter'
import { z } from 'zod'
import { logger } from '@repo/logger'

/**
 * Parses YAML frontmatter from a markdown file
 * @param filePath - Absolute path to the markdown file
 * @returns Parsed frontmatter data and content, or null on error
 */
export async function parseFrontmatter(
  filePath: string,
): Promise<{ data: unknown; content: string } | null> {
  try {
    const fileContent = await readFile(filePath, 'utf-8')
    const { data, content } = matter(fileContent)
    return { data, content }
  } catch (err) {
    const error = err as Error
    logger.warn('Frontmatter parse failed', {
      file: filePath,
      error: error.message,
    })
    return null
  }
}

/**
 * Validates frontmatter data against a Zod schema
 * @param data - Raw frontmatter data
 * @param schema - Zod schema to validate against
 * @returns Validated data or null on validation error
 */
export function validateFrontmatter<T extends z.ZodSchema>(
  data: unknown,
  schema: T,
): z.infer<T> | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    logger.warn('Frontmatter validation failed', {
      issues: result.error.issues,
    })
    return null
  }
  return result.data
}
