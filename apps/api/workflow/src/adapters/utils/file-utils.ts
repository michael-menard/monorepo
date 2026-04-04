/**
 * File utilities for atomic write operations.
 */

import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

/**
 * Atomically write content to a file using a temp-file-then-rename pattern.
 * Prevents partial writes from corrupting the target file.
 */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath)
  const tmp = path.join(dir, `.tmp-${randomUUID()}`)

  try {
    await fs.writeFile(tmp, content, 'utf-8')
    await fs.rename(tmp, filePath)
  } catch (err) {
    // Clean up temp file on failure
    await fs.unlink(tmp).catch(() => undefined)
    throw err
  }
}
