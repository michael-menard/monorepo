/**
 * Unit tests for parseVercelMultipart
 *
 * Tests multipart parsing logic using mock VercelRequest objects.
 */

import { describe, it, expect } from 'vitest'
import { Readable } from 'stream'
import { parseVercelMultipart, getFile, getField, MultipartParseError } from '../parse-multipart.js'
import type { VercelRequest } from '@vercel/node'

/**
 * Create a mock multipart request
 */
function createMockMultipartRequest(
  boundary: string,
  parts: Array<{ name: string; filename?: string; contentType?: string; content: string | Buffer }>,
): VercelRequest {
  // Build multipart body
  let body = ''
  for (const part of parts) {
    body += `--${boundary}\r\n`
    if (part.filename) {
      body += `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`
      body += `Content-Type: ${part.contentType || 'application/octet-stream'}\r\n`
    } else {
      body += `Content-Disposition: form-data; name="${part.name}"\r\n`
    }
    body += '\r\n'
    body += part.content.toString()
    body += '\r\n'
  }
  body += `--${boundary}--\r\n`

  const buffer = Buffer.from(body)
  const readable = Readable.from([buffer])

  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    pipe: (dest: NodeJS.WritableStream) => {
      readable.pipe(dest)
      return readable
    },
  } as unknown as VercelRequest
}

describe('parseVercelMultipart', () => {
  it('should parse a simple multipart request with one file', async () => {
    const boundary = '----TestBoundary'
    const req = createMockMultipartRequest(boundary, [
      {
        name: 'file',
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        content: 'fake image content',
      },
    ])

    const result = await parseVercelMultipart(req)

    expect(result.files).toHaveLength(1)
    expect(result.files[0]?.filename).toBe('test.jpg')
    expect(result.files[0]?.mimetype).toBe('image/jpeg')
    expect(result.files[0]?.buffer.toString()).toBe('fake image content')
  })

  it('should parse form fields', async () => {
    const boundary = '----TestBoundary'
    const req = createMockMultipartRequest(boundary, [
      { name: 'title', content: 'My Image' },
      { name: 'tags', content: 'lego,moc' },
      {
        name: 'file',
        filename: 'test.png',
        contentType: 'image/png',
        content: 'image data',
      },
    ])

    const result = await parseVercelMultipart(req)

    expect(result.fields).toEqual({
      title: 'My Image',
      tags: 'lego,moc',
    })
    expect(result.files).toHaveLength(1)
  })

  it('should reject non-multipart requests', async () => {
    const req = {
      headers: {
        'content-type': 'application/json',
      },
    } as unknown as VercelRequest

    await expect(parseVercelMultipart(req)).rejects.toThrow(MultipartParseError)
    await expect(parseVercelMultipart(req)).rejects.toMatchObject({
      code: 'INVALID_CONTENT_TYPE',
    })
  })

  it('should reject request without content-type', async () => {
    const req = {
      headers: {},
    } as unknown as VercelRequest

    await expect(parseVercelMultipart(req)).rejects.toThrow(MultipartParseError)
    await expect(parseVercelMultipart(req)).rejects.toMatchObject({
      code: 'INVALID_CONTENT_TYPE',
    })
  })

  it('should reject invalid MIME types when restrictions are set', async () => {
    const boundary = '----TestBoundary'
    const req = createMockMultipartRequest(boundary, [
      {
        name: 'file',
        filename: 'test.pdf',
        contentType: 'application/pdf',
        content: 'pdf content',
      },
    ])

    await expect(
      parseVercelMultipart(req, {
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_MIME_TYPE',
    })
  })

  it('should allow valid MIME types when restrictions are set', async () => {
    const boundary = '----TestBoundary'
    const req = createMockMultipartRequest(boundary, [
      {
        name: 'file',
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        content: 'image content',
      },
    ])

    const result = await parseVercelMultipart(req, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    })

    expect(result.files).toHaveLength(1)
    expect(result.files[0]?.mimetype).toBe('image/jpeg')
  })
})

describe('getFile', () => {
  it('should return the first file', () => {
    const formData = {
      fields: {},
      files: [
        {
          fieldname: 'file',
          filename: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('content'),
        },
      ],
    }

    const file = getFile(formData)
    expect(file?.filename).toBe('test.jpg')
  })

  it('should return undefined when no files', () => {
    const formData = {
      fields: {},
      files: [],
    }

    const file = getFile(formData)
    expect(file).toBeUndefined()
  })
})

describe('getField', () => {
  it('should return field value', () => {
    const formData = {
      fields: { title: 'Test Title', tags: 'a,b,c' },
      files: [],
    }

    expect(getField(formData, 'title')).toBe('Test Title')
    expect(getField(formData, 'tags')).toBe('a,b,c')
  })

  it('should return undefined for missing field', () => {
    const formData = {
      fields: { title: 'Test' },
      files: [],
    }

    expect(getField(formData, 'missing')).toBeUndefined()
  })
})
