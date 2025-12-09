/**
 * Filename Sanitizer Utility
 *
 * Story 3.1.22: Filename & Content Hardening
 *
 * Provides secure filename sanitization for S3 keys.
 * - Strips control characters
 * - Blocks Windows reserved names
 * - Limits length to prevent path issues
 * - Normalizes unicode (NFC)
 * - Preserves extension
 * - Server generates S3 keys; never trust client paths
 */

import { z } from 'zod'

/**
 * Configuration for filename sanitization
 */
export const FilenameConfigSchema = z.object({
  /** Maximum length for the filename (excluding path) */
  maxLength: z.number().int().positive().default(255),
  /** Whether to convert to lowercase */
  lowercase: z.boolean().default(true),
  /** Replacement character for invalid characters */
  replacement: z.string().max(1).default('_'),
})

export type FilenameConfig = z.infer<typeof FilenameConfigSchema>

/** Default configuration */
const DEFAULT_CONFIG: FilenameConfig = {
  maxLength: 255,
  lowercase: true,
  replacement: '_',
}

/**
 * Windows reserved filenames (case-insensitive)
 * These names cannot be used as file names in Windows and should be blocked
 */
const WINDOWS_RESERVED_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
])

/**
 * Result of filename sanitization
 */
export const SanitizedFilenameResultSchema = z.object({
  /** The sanitized filename safe for S3 keys */
  sanitized: z.string(),
  /** The original filename (for metadata storage) */
  original: z.string(),
  /** Whether the filename was modified */
  wasModified: z.boolean(),
  /** Extension extracted from the filename */
  extension: z.string().nullable(),
  /** Warnings about changes made */
  warnings: z.array(z.string()),
})

export type SanitizedFilenameResult = z.infer<typeof SanitizedFilenameResultSchema>

/**
 * Check if a name is a Windows reserved filename
 *
 * @param name - Filename without extension to check
 * @returns True if the name is reserved
 */
export const isWindowsReservedName = (name: string): boolean => {
  const lowerName = name.toLowerCase()
  return WINDOWS_RESERVED_NAMES.has(lowerName)
}

/**
 * Extract extension from a filename
 *
 * @param filename - The filename to extract extension from
 * @returns Object with name and extension (null if no extension)
 */
export const extractExtension = (filename: string): { name: string; extension: string | null } => {
  const lastDot = filename.lastIndexOf('.')

  // No extension if:
  // - No dot found
  // - Dot is at the start (hidden file like .gitignore)
  // - Dot is at the end
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return { name: filename, extension: null }
  }

  return {
    name: filename.substring(0, lastDot),
    extension: filename.substring(lastDot + 1),
  }
}

/**
 * Strip control characters from a string
 * Removes ASCII control chars (0x00-0x1F) and DEL (0x7F)
 * Also removes C1 control chars (0x80-0x9F)
 *
 * @param input - The string to sanitize
 * @returns String with control characters removed
 */
export const stripControlCharacters = (input: string): string => {
  return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
}

/**
 * Normalize unicode using NFC (Canonical Decomposition followed by Canonical Composition)
 * This prevents homoglyph attacks and ensures consistent representation
 *
 * @param input - The string to normalize
 * @returns NFC-normalized string
 */
export const normalizeUnicode = (input: string): string => {
  return input.normalize('NFC')
}

/**
 * Replace characters that are unsafe for S3 keys and file systems
 * Keeps: a-z, A-Z, 0-9, -, _, .
 *
 * @param input - The string to sanitize
 * @param replacement - Character to replace unsafe chars with
 * @returns Sanitized string
 */
export const replaceUnsafeCharacters = (input: string, replacement: string): string => {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, replacement)
    .replace(new RegExp(`${escapeRegex(replacement)}{2,}`, 'g'), replacement) // Collapse multiples
    .replace(new RegExp(`^${escapeRegex(replacement)}+`), '') // Remove leading
    .replace(new RegExp(`${escapeRegex(replacement)}+$`), '') // Remove trailing
}

/**
 * Escape special regex characters
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Sanitize a filename for safe use as an S3 key component
 *
 * This function:
 * 1. Strips control characters
 * 2. Normalizes unicode (NFC)
 * 3. Strips path components
 * 4. Extracts extension
 * 5. Replaces unsafe characters
 * 6. Lowercases if configured
 * 7. Checks for Windows reserved names (after processing)
 * 8. Limits length
 * 9. Ensures the result is not empty
 *
 * @param filename - The original filename from the client
 * @param config - Optional configuration
 * @returns Sanitization result with sanitized filename and metadata
 */
export const sanitizeFilename = (
  filename: string,
  config: Partial<FilenameConfig> = {},
): SanitizedFilenameResult => {
  const opts = { ...DEFAULT_CONFIG, ...config }
  const warnings: string[] = []
  const original = filename

  // Handle empty or whitespace-only input
  if (!filename || !filename.trim()) {
    return {
      sanitized: 'unnamed',
      original: filename || '',
      wasModified: true,
      extension: null,
      warnings: ['Empty filename replaced with "unnamed"'],
    }
  }

  // Step 1: Strip control characters
  let sanitized = stripControlCharacters(filename)
  if (sanitized !== filename) {
    warnings.push('Control characters removed')
  }

  // Step 2: Normalize unicode
  const normalized = normalizeUnicode(sanitized)
  if (normalized !== sanitized) {
    warnings.push('Unicode normalized')
  }
  sanitized = normalized

  // Step 3: Extract path components - only keep the filename, not path
  // Handle both forward and backslash path separators
  const pathParts = sanitized.split(/[/\\]/)
  const filenamePart = pathParts[pathParts.length - 1] || sanitized
  if (filenamePart !== sanitized) {
    warnings.push('Path stripped, keeping filename only')
  }
  sanitized = filenamePart

  // Step 4: Extract extension
  const { name, extension } = extractExtension(sanitized)

  // Step 5: Replace unsafe characters in name and extension
  // Use replaceUnsafeCharactersKeepLeading to preserve underscores we might add later
  let processedName = replaceUnsafeCharactersInternal(name, opts.replacement)
  let processedExtension = extension
    ? replaceUnsafeCharactersInternal(extension, opts.replacement)
    : null

  // Step 6: Lowercase if configured
  if (opts.lowercase) {
    processedName = processedName.toLowerCase()
    processedExtension = processedExtension?.toLowerCase() ?? null
  }

  // Step 7: Handle empty name after sanitization (before reserved name check)
  if (!processedName) {
    processedName = 'unnamed'
    warnings.push('Filename reduced to empty, using "unnamed"')
  }

  // Step 8: Check for Windows reserved names AFTER processing
  // This ensures "CON.txt" -> "con" (after lowercase) triggers the check
  if (isWindowsReservedName(processedName)) {
    warnings.push(`Reserved filename "${processedName}" prefixed with underscore`)
    processedName = `_${processedName}`
  }

  // Step 9: Reconstruct filename
  sanitized = processedExtension ? `${processedName}.${processedExtension}` : processedName

  // Step 10: Handle empty result after sanitization (edge case)
  if (!sanitized || sanitized === '.' || sanitized === opts.replacement) {
    sanitized = processedExtension ? `unnamed.${processedExtension}` : 'unnamed'
    if (!warnings.includes('Filename reduced to empty, using "unnamed"')) {
      warnings.push('Filename reduced to empty, using "unnamed"')
    }
  }

  // Step 11: Limit length
  if (sanitized.length > opts.maxLength) {
    // Preserve extension when truncating
    if (processedExtension) {
      const extensionWithDot = `.${processedExtension}`
      const maxNameLength = opts.maxLength - extensionWithDot.length
      if (maxNameLength > 0) {
        const truncatedName = processedName.substring(0, maxNameLength)
        sanitized = `${truncatedName}${extensionWithDot}`
      } else {
        // Extension itself is too long, just truncate everything
        sanitized = sanitized.substring(0, opts.maxLength)
      }
    } else {
      sanitized = sanitized.substring(0, opts.maxLength)
    }
    warnings.push(`Filename truncated to ${opts.maxLength} characters`)
  }

  return {
    sanitized,
    original,
    wasModified: sanitized !== original,
    extension: processedExtension,
    warnings,
  }
}

/**
 * Internal: Replace unsafe characters but don't strip leading/trailing
 * This is used during processing before we add reserved name prefix
 */
const replaceUnsafeCharactersInternal = (input: string, replacement: string): string => {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, replacement)
    .replace(new RegExp(`${escapeRegex(replacement)}{2,}`, 'g'), replacement) // Collapse multiples
    .replace(new RegExp(`^${escapeRegex(replacement)}+`), '') // Remove leading
    .replace(new RegExp(`${escapeRegex(replacement)}+$`), '') // Remove trailing
}

/**
 * Quick sanitization for S3 key usage
 * Returns just the sanitized string, suitable for direct use in S3 keys
 *
 * @param filename - The original filename
 * @returns Sanitized filename string
 */
export const sanitizeFilenameForS3 = (filename: string): string => {
  return sanitizeFilename(filename).sanitized
}

/**
 * Validate that a filename is safe (without modifying it)
 *
 * @param filename - The filename to validate
 * @returns Object with isValid flag and any issues found
 */
export const validateFilename = (filename: string): { isValid: boolean; issues: string[] } => {
  const issues: string[] = []

  if (!filename || !filename.trim()) {
    issues.push('Filename is empty')
    return { isValid: false, issues }
  }

  // Check for control characters

  if (/[\x00-\x1F\x7F-\x9F]/.test(filename)) {
    issues.push('Contains control characters')
  }

  // Check for path separators
  if (/[/\\]/.test(filename)) {
    issues.push('Contains path separators')
  }

  // Check for Windows reserved names
  const { name } = extractExtension(filename)
  if (isWindowsReservedName(name)) {
    issues.push(`Uses reserved Windows name: ${name}`)
  }

  // Check length
  if (filename.length > 255) {
    issues.push('Exceeds maximum length of 255 characters')
  }

  // Check for dangerous characters (null bytes, etc.)
  if (filename.includes('\0')) {
    issues.push('Contains null bytes')
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}
