/**
 * Multipart Form Data Parser for Lambda
 *
 * Parses multipart/form-data requests using Busboy.
 * Handles file uploads and form fields from API Gateway events.
 */

import { APIGatewayProxyEventV2 } from 'aws-lambda'
import Busboy from 'busboy'
import { Readable } from 'stream'

export interface ParsedFile {
  fieldname: string
  filename: string
  encoding: string
  mimetype: string
  buffer: Buffer
}

export interface ParsedFormData {
  fields: Record<string, string>
  files: ParsedFile[]
}

/**
 * Parse multipart form data from API Gateway event
 *
 * @param event - API Gateway HTTP API event
 * @returns Parsed form data with fields and files
 */
export async function parseMultipartForm(event: APIGatewayProxyEventV2): Promise<ParsedFormData> {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type']

    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'))
      return
    }

    // Decode base64 body if needed
    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '', 'utf-8')

    const busboy = Busboy({
      headers: {
        'content-type': contentType,
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size (per file)
        files: 10, // Allow up to 10 files per request
        fields: 20, // Max 20 form fields
      },
    })

    const fields: Record<string, string> = {}
    const files: ParsedFile[] = []

    // Handle form fields
    busboy.on('field', (fieldname: string, value: string) => {
      fields[fieldname] = value
    })

    // Handle file uploads
    busboy.on('file', (fieldname: string, file: Readable, info: { filename: string; encoding: string; mimeType: string }) => {
      const chunks: Buffer[] = []

      file.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      file.on('end', () => {
        const buffer = Buffer.concat(chunks)
        files.push({
          fieldname,
          filename: info.filename,
          encoding: info.encoding,
          mimetype: info.mimeType,
          buffer,
        })
      })

      file.on('error', (err: Error) => {
        reject(new Error(`File upload error: ${err.message}`))
      })
    })

    // Handle limits exceeded
    busboy.on('filesLimit', () => {
      reject(new Error('Files limit exceeded: maximum 10 files allowed'))
    })

    busboy.on('fieldsLimit', () => {
      reject(new Error('Fields limit exceeded: maximum 20 fields allowed'))
    })

    // Parsing complete
    busboy.on('finish', () => {
      // Validate total payload size (max 50MB across all files)
      const totalSize = files.reduce((sum, file) => sum + file.buffer.length, 0)
      const maxTotalSize = 50 * 1024 * 1024 // 50MB

      if (totalSize > maxTotalSize) {
        reject(new Error(`Total payload exceeds 50MB limit (received: ${(totalSize / 1024 / 1024).toFixed(2)}MB)`))
        return
      }

      resolve({ fields, files })
    })

    busboy.on('error', (err: Error) => {
      reject(new Error(`Busboy parsing error: ${err.message}`))
    })

    // Write body to busboy
    busboy.write(body)
    busboy.end()
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
