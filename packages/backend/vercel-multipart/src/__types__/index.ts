/**
 * Zod schemas and types for Vercel Multipart Parser
 *
 * @packageDocumentation
 */

import { z } from 'zod'

/**
 * Schema for a parsed file from multipart form data
 */
export const ParsedFileSchema = z.object({
  /** Form field name */
  fieldname: z.string(),
  /** Original filename */
  filename: z.string(),
  /** Content encoding (e.g., '7bit', 'base64') */
  encoding: z.string(),
  /** MIME type (e.g., 'image/jpeg', 'image/png') */
  mimetype: z.string(),
  /** File data as Buffer */
  buffer: z.instanceof(Buffer),
})

export type ParsedFile = z.infer<typeof ParsedFileSchema>

/**
 * Schema for parsed form data
 */
export const ParsedFormDataSchema = z.object({
  /** Form fields as key-value pairs */
  fields: z.record(z.string()),
  /** Parsed files */
  files: z.array(ParsedFileSchema),
})

export type ParsedFormData = z.infer<typeof ParsedFormDataSchema>

/**
 * Schema for parser configuration options
 */
export const ParserOptionsSchema = z.object({
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize: z
    .number()
    .positive()
    .optional()
    .default(10 * 1024 * 1024),
  /** Maximum number of files (default: 1) */
  maxFiles: z.number().positive().optional().default(1),
  /** Maximum number of fields (default: 20) */
  maxFields: z.number().positive().optional().default(20),
  /** Allowed MIME types (if not specified, all types allowed) */
  allowedMimeTypes: z.array(z.string()).optional(),
})

export type ParserOptions = z.infer<typeof ParserOptionsSchema>

/**
 * Schema for parser errors
 */
export const ParserErrorSchema = z.object({
  /** Error code for programmatic handling */
  code: z.enum([
    'INVALID_CONTENT_TYPE',
    'FILE_TOO_LARGE',
    'FILES_LIMIT_EXCEEDED',
    'FIELDS_LIMIT_EXCEEDED',
    'INVALID_MIME_TYPE',
    'EMPTY_FILE',
    'PARSE_ERROR',
  ]),
  /** Human-readable error message */
  message: z.string(),
})

export type ParserError = z.infer<typeof ParserErrorSchema>
