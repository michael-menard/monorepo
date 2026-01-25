/**
 * @repo/vercel-multipart
 *
 * Multipart form data parser for Vercel serverless functions.
 * Adapts the Busboy parsing logic for Vercel's VercelRequest.
 *
 * @packageDocumentation
 */

export { parseVercelMultipart, getFile, getField } from './parse-multipart.js'

export {
  ParsedFileSchema,
  ParsedFormDataSchema,
  ParserOptionsSchema,
  ParserErrorSchema,
  type ParsedFile,
  type ParsedFormData,
  type ParserOptions,
  type ParserError,
} from './__types__/index.js'
