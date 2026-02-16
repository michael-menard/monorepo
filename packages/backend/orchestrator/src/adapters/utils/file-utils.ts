/**
 * File Utilities for Story File Adapter
 *
 * Provides atomic file operations to prevent partial corruption during writes.
 * Uses the temp-file + rename pattern for atomicity on POSIX systems.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { logger } from '@repo/logger'
import { ReadError, WriteError } from '../__types__/index.js'

/**
 * Atomically write content to a file using temp file + rename pattern
 *
 * This prevents partial file corruption if the write operation fails mid-way.
 * The temp file is created with a .tmp extension, then atomically renamed.
 *
 * @param filePath - Absolute path to the target file
 * @param content - Content to write
 * @throws {WriteError} If write operation fails
 *
 * @example
 * ```typescript
 * await writeFileAtomic('/path/to/story.yaml', yamlContent)
 * ```
 */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`

  try {
    // Ensure parent directory exists
    await ensureDirectory(path.dirname(filePath))

    // Write to temp file first
    await fs.writeFile(tempPath, content, 'utf-8')

    // Atomic rename (overwrites target if it exists)
    await fs.rename(tempPath, filePath)

    logger.debug('File written atomically', { filePath })
  } catch (error) {
    // Cleanup temp file if it exists
    try {
      await fs.unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }

    throw new WriteError(filePath, error as Error)
  }
}

/**
 * Safely read a file with error handling
 *
 * @param filePath - Absolute path to the file
 * @returns File content as string
 * @throws {ReadError} If read operation fails (excluding ENOENT)
 * @throws {Error} If file not found (ENOENT - caller should handle)
 *
 * @example
 * ```typescript
 * const content = await readFileSafe('/path/to/story.yaml')
 * ```
 */
export async function readFileSafe(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    logger.debug('File read successfully', { filePath, size: content.length })
    return content
  } catch (error) {
    const err = error as NodeJS.ErrnoException

    // Rethrow ENOENT as-is (caller should handle with StoryNotFoundError)
    if (err.code === 'ENOENT') {
      throw error
    }

    // Wrap other errors in ReadError
    throw new ReadError(filePath, err)
  }
}

/**
 * Ensure a directory exists, creating it recursively if needed
 *
 * @param dirPath - Absolute path to the directory
 * @throws {WriteError} If directory creation fails
 *
 * @example
 * ```typescript
 * await ensureDirectory('/path/to/parent/dir')
 * ```
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    throw new WriteError(dirPath, error as Error)
  }
}

/**
 * Check if a file exists
 *
 * @param filePath - Absolute path to the file
 * @returns True if file exists and is accessible
 *
 * @example
 * ```typescript
 * if (await fileExists('/path/to/story.yaml')) {
 *   // File exists
 * }
 * ```
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
