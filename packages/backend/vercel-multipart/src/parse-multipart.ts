/**
 * Multipart Form Data Parser for Vercel Serverless Functions
 *
 * Parses multipart/form-data requests using Busboy.
 * Handles file uploads and form fields from VercelRequest.
 */

import type { Readable } from 'stream'
import type { VercelRequest } from '@vercel/node'
import Busboy from 'busboy'
import type { ParsedFile, ParsedFormData, ParserOptions } from './__types__/index.js'

/**
 * Custom error class for multipart parsing errors
 */
export class MultipartParseError extends Error {
  constructor(
    public code:
      | 'INVALID_CONTENT_TYPE'
      | 'FILE_TOO_LARGE'
      | 'FILES_LIMIT_EXCEEDED'
      | 'FIELDS_LIMIT_EXCEEDED'
      | 'INVALID_MIME_TYPE'
      | 'EMPTY_FILE'
      | 'PARSE_ERROR',
    message: string,
  ) {
    super(message)
    this.name = 'MultipartParseError'
  }
}

/**
 * Parse multipart form data from Vercel request
 *
 * @param req - Vercel request object
 * @param options - Parser configuration options
 * @returns Parsed form data with fields and files
 * @throws MultipartParseError if parsing fails
 */
export async function parseVercelMultipart(
  req: VercelRequest,
  options: Partial<ParserOptions> = {},
): Promise<ParsedFormData> {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    maxFiles = 1,
    maxFields = 20,
    allowedMimeTypes,
  } = options

  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type']

    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(
        new MultipartParseError('INVALID_CONTENT_TYPE', 'Content-Type must be multipart/form-data'),
      )
      return
    }

    const busboy = Busboy({
      headers: {
        'content-type': contentType,
      },
      limits: {
        fileSize: maxFileSize,
        files: maxFiles,
        fields: maxFields,
      },
    })

    const fields: Record<string, string> = {}
    const files: ParsedFile[] = []
    let fileTruncated = false

    // Handle form fields
    busboy.on('field', (fieldname: string, value: string) => {
      fields[fieldname] = value
    })

    // Handle file uploads
    busboy.on(
      'file',
      (
        fieldname: string,
        file: Readable,
        info: { filename: string; encoding: string; mimeType: string },
      ) => {
        // Validate MIME type if restrictions are set
        if (allowedMimeTypes && !allowedMimeTypes.includes(info.mimeType)) {
          // Drain the file stream to prevent hanging
          file.resume()
          reject(
            new MultipartParseError(
              'INVALID_MIME_TYPE',
              `File type ${info.mimeType} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
            ),
          )
          return
        }

        const chunks: Buffer[] = []

        file.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })

        file.on('limit', () => {
          fileTruncated = true
        })

        file.on('end', () => {
          // Check if file was truncated due to size limit
          if (fileTruncated) {
            reject(
              new MultipartParseError(
                'FILE_TOO_LARGE',
                `File size exceeds maximum allowed size of ${maxFileSize} bytes`,
              ),
            )
            return
          }

          const buffer = Buffer.concat(chunks)

          // Check for empty file
          if (buffer.length === 0) {
            reject(new MultipartParseError('EMPTY_FILE', 'File is empty'))
            return
          }

          files.push({
            fieldname,
            filename: info.filename,
            encoding: info.encoding,
            mimetype: info.mimeType,
            buffer,
          })
        })

        file.on('error', (err: Error) => {
          reject(new MultipartParseError('PARSE_ERROR', `File upload error: ${err.message}`))
        })
      },
    )

    // Handle limits exceeded
    busboy.on('filesLimit', () => {
      reject(
        new MultipartParseError(
          'FILES_LIMIT_EXCEEDED',
          `Files limit exceeded: maximum ${maxFiles} file(s) allowed`,
        ),
      )
    })

    busboy.on('fieldsLimit', () => {
      reject(
        new MultipartParseError(
          'FIELDS_LIMIT_EXCEEDED',
          `Fields limit exceeded: maximum ${maxFields} fields allowed`,
        ),
      )
    })

    // Parsing complete
    busboy.on('finish', () => {
      resolve({ fields, files })
    })

    busboy.on('error', (err: Error) => {
      reject(new MultipartParseError('PARSE_ERROR', `Busboy parsing error: ${err.message}`))
    })

    // Pipe the request to busboy
    // VercelRequest extends IncomingMessage, which is a Readable
    req.pipe(busboy)
  })
}

/**
 * Get single file from parsed form data
 *
 * @param formData - Parsed form data
 * @returns First file or undefined
 */
export function getFile(formData: ParsedFormData): ParsedFile | undefined {
  return formData.files[0]
}

/**
 * Get field value from parsed form data
 *
 * @param formData - Parsed form data
 * @param fieldName - Field name
 * @returns Field value or undefined
 */
export function getField(formData: ParsedFormData, fieldName: string): string | undefined {
  return formData.fields[fieldName]
}
