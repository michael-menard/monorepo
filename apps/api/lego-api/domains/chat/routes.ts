import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { stream } from 'hono/streaming'
import OpenAI from 'openai'
import { logger } from '@repo/logger'
import { getDb } from './db.js'
import { createChatService } from './application/index.js'
import {
  SendMessageInputSchema,
  CreateConversationInputSchema,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_TEXT_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  type Attachment,
} from './types.js'
import { uploadAttachment, getAttachmentStream } from './storage.js'

const chat = new Hono()

// Lazy-init service singleton
let _service: ReturnType<typeof createChatService> | null = null

function getService() {
  if (!_service) {
    _service = createChatService({
      db: getDb(),
      openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    })
  }
  return _service
}

function isAllowedFileType(filename: string, contentType: string): boolean {
  if (ALLOWED_IMAGE_TYPES.includes(contentType)) return true
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return ALLOWED_TEXT_EXTENSIONS.includes(ext)
}

// GET / — List all conversations (summary)
chat.get('/', async c => {
  const service = getService()
  const conversations = await service.listConversations()
  return c.json(conversations)
})

// POST / — Create new conversation
chat.post('/', async c => {
  const service = getService()
  const body = await c.req.json().catch(() => ({}))
  const input = CreateConversationInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const conversation = await service.createConversation(input.data.title)
  return c.json(conversation, 201)
})

// POST /search — Search conversations by similarity
chat.post('/search', async c => {
  const service = getService()
  const body = await c.req.json().catch(() => ({}))
  const query = body?.query

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return c.json({ error: 'Query string is required' }, 400)
  }

  try {
    const results = await service.searchConversations(query.trim())
    return c.json(results)
  } catch (error) {
    logger.error('Search error:', error)
    return c.json({ error: 'Search failed' }, 500)
  }
})

// GET /files/* — Proxy file from MinIO (must be before /:id to avoid conflict)
chat.get('/files/*', async c => {
  // Extract the key after /files/ from the URL path
  const url = new URL(c.req.url)
  const filesIdx = url.pathname.indexOf('/files/')
  const key = filesIdx >= 0 ? url.pathname.slice(filesIdx + '/files/'.length) : ''

  if (!key || !key.startsWith('chat-attachments/')) {
    return c.json({ error: 'Invalid file path' }, 400)
  }

  try {
    const { body, contentType, contentLength } = await getAttachmentStream(key)

    if (!body) {
      return c.json({ error: 'File not found' }, 404)
    }

    c.header('Content-Type', contentType)
    if (contentLength) {
      c.header('Content-Length', String(contentLength))
    }
    c.header('Cache-Control', 'public, max-age=31536000, immutable')

    return stream(c, async s => {
      const readable = body as NodeJS.ReadableStream
      for await (const chunk of readable) {
        await s.write(chunk as Uint8Array)
      }
    })
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return c.json({ error: 'File not found' }, 404)
    }
    logger.error('File proxy error:', error)
    return c.json({ error: 'Failed to retrieve file' }, 500)
  }
})

// GET /:id — Get conversation with messages
chat.get('/:id', async c => {
  const service = getService()
  const id = c.req.param('id')
  const conversation = await service.getConversation(id)

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  return c.json(conversation)
})

// DELETE /:id — Delete conversation
chat.delete('/:id', async c => {
  const service = getService()
  const id = c.req.param('id')
  const deleted = await service.deleteConversation(id)

  if (!deleted) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  return c.body(null, 204)
})

// POST /:id/upload — Upload file(s) to a conversation
chat.post('/:id/upload', async c => {
  const conversationId = c.req.param('id')

  const formData = await c.req.formData()
  const files = formData.getAll('file') as File[]

  if (files.length === 0) {
    return c.json({ error: 'No files provided' }, 400)
  }

  if (files.length > MAX_FILES_PER_MESSAGE) {
    return c.json({ error: `Maximum ${MAX_FILES_PER_MESSAGE} files per upload` }, 400)
  }

  const messageId = crypto.randomUUID()
  const attachments: Attachment[] = []

  for (const file of files) {
    if (!isAllowedFileType(file.name, file.type)) {
      return c.json({ error: `File type not allowed: ${file.name}` }, 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `File too large: ${file.name} (max 10MB)` }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const attachment = await uploadAttachment(conversationId, messageId, {
      buffer,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    })
    attachments.push(attachment)
  }

  return c.json(attachments, 201)
})

// POST /:id/archive — Archive conversation with AI-generated summary
chat.post('/:id/archive', async c => {
  const service = getService()
  const id = c.req.param('id')

  try {
    const result = await service.archiveConversation(id)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message === 'Conversation not found' ? 404 : 500
    return c.json({ error: message }, status)
  }
})

// POST /:id/convert-to-plan — Convert conversation into a structured plan
chat.post('/:id/convert-to-plan', async c => {
  const service = getService()
  const id = c.req.param('id')

  try {
    const result = await service.convertToPlan(id)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message === 'Conversation not found' ? 404 : 500
    return c.json({ error: message }, status)
  }
})

// POST /:id/messages — Send message + stream OpenAI response via SSE
chat.post('/:id/messages', async c => {
  const service = getService()
  const conversationId = c.req.param('id')

  const body = await c.req.json().catch(() => ({}))
  const input = SendMessageInputSchema.safeParse({ ...body, conversationId })

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  try {
    const { userMessage, assistantMessageId, chunks } = await service.sendMessage(
      conversationId,
      input.data.content || '',
      input.data.attachments,
    )

    return streamSSE(c, async stream => {
      // Send user message confirmation
      await stream.writeSSE({
        event: 'user_message',
        data: JSON.stringify(userMessage),
      })

      // Stream assistant chunks
      for await (const chunk of chunks) {
        await stream.writeSSE({
          event: 'assistant_chunk',
          data: JSON.stringify({ id: assistantMessageId, content: chunk }),
        })
      }

      // Signal completion
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ id: assistantMessageId }),
      })
    })
  } catch (error) {
    logger.error('Chat message error:', error)
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message === 'Conversation not found' ? 404 : 500
    return c.json({ error: message }, status)
  }
})

export default chat
