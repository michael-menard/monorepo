/**
 * Test utility for creating mock File objects
 *
 * Story: WISH-2120
 */

import { z } from 'zod'

/**
 * Options schema for createMockFile
 */
export const CreateMockFileOptionsSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  size: z.number().int().min(0).optional(),
  content: z.string().optional(),
})

export type CreateMockFileOptions = z.infer<typeof CreateMockFileOptionsSchema>

/**
 * Creates a mock File object for testing.
 *
 * @param options - Configuration options
 * @param options.name - File name including extension (default: 'test-image.jpg')
 * @param options.type - MIME type (default: 'image/jpeg')
 * @param options.size - File size in bytes (default: 1024)
 * @param options.content - Explicit content string (optional, overrides size-based generation)
 * @returns File object suitable for upload testing
 *
 * @example
 * ```ts
 * // Create with defaults
 * const file = createMockFile()
 *
 * // Create with custom properties
 * const file = createMockFile({
 *   name: 'photo.png',
 *   type: 'image/png',
 *   size: 5 * 1024 * 1024 // 5MB
 * })
 *
 * // Create with explicit content
 * const file = createMockFile({
 *   content: 'custom file content',
 *   type: 'text/plain'
 * })
 * ```
 */
export function createMockFile(options?: CreateMockFileOptions): File {
  const validated = CreateMockFileOptionsSchema.parse(options ?? {})

  const name = validated.name ?? 'test-image.jpg'
  const type = validated.type ?? 'image/jpeg'
  const size = validated.size ?? 1024

  let blob: Blob

  if (validated.content !== undefined) {
    // Use explicit content if provided
    blob = new Blob([validated.content], { type })
  } else if (size === 0) {
    // Zero-byte file
    blob = new Blob([], { type })
  } else if (size <= 10000) {
    // Small files: create string content
    const content = 'a'.repeat(size)
    blob = new Blob([content], { type })
  } else {
    // Large files: use ArrayBuffer to avoid memory issues
    const buffer = new ArrayBuffer(size)
    blob = new Blob([buffer], { type })
  }

  return new File([blob], name, { type, lastModified: Date.now() })
}
