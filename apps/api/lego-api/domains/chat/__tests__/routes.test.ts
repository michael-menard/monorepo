import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock dependencies before importing routes
vi.mock('../db.js', () => ({
  getDb: vi.fn(() => ({})),
}))

vi.mock('openai', () => ({
  default: vi.fn(() => ({ chat: { completions: { create: vi.fn() } } })),
}))

vi.mock('@repo/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('../storage.js', () => ({
  uploadAttachment: vi.fn(),
  getAttachmentStream: vi.fn(),
}))

const mockService = {
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  sendMessage: vi.fn(),
}

vi.mock('../application/index.js', () => ({
  createChatService: vi.fn(() => mockService),
}))

// Import after mocks
import chat from '../routes.js'
import { uploadAttachment, getAttachmentStream } from '../storage.js'

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const CONV_ID = '11111111-1111-1111-1111-111111111111'
const MISSING_ID = '99999999-9999-9999-9999-999999999999'
const ATT_ID_1 = '22222222-2222-2222-2222-222222222222'
const ATT_ID_2 = '33333333-3333-3333-3333-333333333333'

// ─────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────

describe('Chat Routes', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
    app.route('/chat', chat)
  })

  describe('GET /chat', () => {
    it('returns list of conversations', async () => {
      const conversations = [
        { id: CONV_ID, title: 'Chat 1', messageCount: 3, updatedAt: '2026-01-01T00:00:00Z' },
      ]
      mockService.listConversations.mockResolvedValue(conversations)

      const res = await app.request('/chat')

      expect(res.status).toBe(200)
      const body: any = await res.json()
      expect(body).toHaveLength(1)
      expect(body[0].title).toBe('Chat 1')
    })

    it('returns empty array when no conversations', async () => {
      mockService.listConversations.mockResolvedValue([])

      const res = await app.request('/chat')

      expect(res.status).toBe(200)
      const body: any = await res.json()
      expect(body).toEqual([])
    })
  })

  describe('POST /chat', () => {
    it('creates conversation with default title', async () => {
      const conversation = {
        id: CONV_ID,
        title: 'New Chat',
        messages: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }
      mockService.createConversation.mockResolvedValue(conversation)

      const res = await app.request('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(201)
      const body: any = await res.json()
      expect(body.title).toBe('New Chat')
    })

    it('creates conversation with custom title', async () => {
      const conversation = {
        id: CONV_ID,
        title: 'My Plan',
        messages: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }
      mockService.createConversation.mockResolvedValue(conversation)

      const res = await app.request('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Plan' }),
      })

      expect(res.status).toBe(201)
      expect(mockService.createConversation).toHaveBeenCalledWith('My Plan')
    })

    it('handles empty body gracefully', async () => {
      const conversation = {
        id: CONV_ID,
        title: 'New Chat',
        messages: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }
      mockService.createConversation.mockResolvedValue(conversation)

      const res = await app.request('/chat', { method: 'POST' })

      expect(res.status).toBe(201)
    })
  })

  describe('GET /chat/:id', () => {
    it('returns conversation when found', async () => {
      const conversation = {
        id: CONV_ID,
        title: 'Test',
        messages: [
          { id: 'm1', role: 'user', content: 'hi', timestamp: '2026-01-01T00:00:00Z' },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }
      mockService.getConversation.mockResolvedValue(conversation)

      const res = await app.request(`/chat/${CONV_ID}`)

      expect(res.status).toBe(200)
      const body: any = await res.json()
      expect(body.messages).toHaveLength(1)
    })

    it('returns 404 when not found', async () => {
      mockService.getConversation.mockResolvedValue(null)

      const res = await app.request(`/chat/${MISSING_ID}`)

      expect(res.status).toBe(404)
      const body: any = await res.json()
      expect(body.error).toBe('Conversation not found')
    })
  })

  describe('DELETE /chat/:id', () => {
    it('returns 204 on successful delete', async () => {
      mockService.deleteConversation.mockResolvedValue(true)

      const res = await app.request(`/chat/${CONV_ID}`, { method: 'DELETE' })

      expect(res.status).toBe(204)
    })

    it('returns 404 when conversation not found', async () => {
      mockService.deleteConversation.mockResolvedValue(false)

      const res = await app.request(`/chat/${MISSING_ID}`, { method: 'DELETE' })

      expect(res.status).toBe(404)
      const body: any = await res.json()
      expect(body.error).toBe('Conversation not found')
    })
  })

  describe('POST /chat/:id/messages', () => {
    it('returns 400 when neither content nor attachments provided', async () => {
      const res = await app.request(`/chat/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const body: any = await res.json()
      expect(body.error).toBe('Validation failed')
    })

    it('returns 400 when content is empty and no attachments', async () => {
      const res = await app.request(`/chat/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      })

      expect(res.status).toBe(400)
    })

    it('returns 404 when conversation not found', async () => {
      mockService.sendMessage.mockRejectedValue(new Error('Conversation not found'))

      const res = await app.request(`/chat/${MISSING_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hello' }),
      })

      expect(res.status).toBe(404)
      const body: any = await res.json()
      expect(body.error).toBe('Conversation not found')
    })

    it('returns 500 on unexpected errors', async () => {
      mockService.sendMessage.mockRejectedValue(new Error('OpenAI API error'))

      const res = await app.request(`/chat/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hello' }),
      })

      expect(res.status).toBe(500)
      const body: any = await res.json()
      expect(body.error).toBe('OpenAI API error')
    })

    it('streams SSE response on success', async () => {
      const userMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'hello',
        timestamp: '2026-01-01T00:00:00Z',
      }

      async function* mockChunks() {
        yield 'Hello'
        yield ' there'
      }

      mockService.sendMessage.mockResolvedValue({
        userMessage,
        assistantMessageId: 'assist-1',
        chunks: mockChunks(),
      })

      const res = await app.request(`/chat/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hello' }),
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/event-stream')

      const text = await res.text()
      expect(text).toContain('event: user_message')
      expect(text).toContain('event: assistant_chunk')
      expect(text).toContain('event: done')
      expect(text).toContain('"Hello"')
      expect(text).toContain('" there"')
    })

    it('passes attachments to sendMessage when provided', async () => {
      const attachments = [
        {
          id: ATT_ID_1,
          filename: 'test.png',
          contentType: 'image/png',
          size: 1024,
          url: 'chat-attachments/conv/msg/att-1-test.png',
        },
      ]

      const userMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'look at this',
        timestamp: '2026-01-01T00:00:00Z',
        attachments,
      }

      async function* mockChunks() {
        yield 'Nice image!'
      }

      mockService.sendMessage.mockResolvedValue({
        userMessage,
        assistantMessageId: 'assist-1',
        chunks: mockChunks(),
      })

      const res = await app.request(`/chat/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'look at this', attachments }),
      })

      expect(res.status).toBe(200)
      expect(mockService.sendMessage).toHaveBeenCalledWith(CONV_ID, 'look at this', attachments)
    })

    it('accepts message with only attachments (no content)', async () => {
      const attachments = [
        {
          id: ATT_ID_1,
          filename: 'doc.md',
          contentType: 'text/markdown',
          size: 512,
          url: 'chat-attachments/conv/msg/att-1-doc.md',
        },
      ]

      const userMessage = {
        id: 'msg-1',
        role: 'user',
        content: '',
        timestamp: '2026-01-01T00:00:00Z',
        attachments,
      }

      async function* mockChunks() {
        yield 'Got it'
      }

      mockService.sendMessage.mockResolvedValue({
        userMessage,
        assistantMessageId: 'assist-1',
        chunks: mockChunks(),
      })

      const res = await app.request(`/chat/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments }),
      })

      expect(res.status).toBe(200)
      expect(mockService.sendMessage).toHaveBeenCalledWith(CONV_ID, '', attachments)
    })
  })

  describe('POST /chat/:id/upload', () => {
    it('returns 400 when no files provided', async () => {
      const formData = new FormData()

      const res = await app.request(`/chat/${CONV_ID}/upload`, {
        method: 'POST',
        body: formData,
      })

      expect(res.status).toBe(400)
      const body: any = await res.json()
      expect(body.error).toBe('No files provided')
    })

    it('returns 400 for disallowed file type', async () => {
      const file = new File(['binary'], 'malware.exe', { type: 'application/x-msdownload' })
      const formData = new FormData()
      formData.append('file', file)

      const res = await app.request(`/chat/${CONV_ID}/upload`, {
        method: 'POST',
        body: formData,
      })

      expect(res.status).toBe(400)
      const body: any = await res.json()
      expect(body.error).toContain('File type not allowed')
    })

    it('returns 400 when too many files', async () => {
      const formData = new FormData()
      for (let i = 0; i < 6; i++) {
        formData.append('file', new File(['x'], `file${i}.txt`, { type: 'text/plain' }))
      }

      const res = await app.request(`/chat/${CONV_ID}/upload`, {
        method: 'POST',
        body: formData,
      })

      expect(res.status).toBe(400)
      const body: any = await res.json()
      expect(body.error).toContain('Maximum 5 files')
    })

    it('uploads valid file and returns attachment metadata', async () => {
      const mockAttachment = {
        id: 'att-uuid',
        filename: 'test.png',
        contentType: 'image/png',
        size: 100,
        url: 'chat-attachments/conv/msg/att-uuid-test.png',
      }
      vi.mocked(uploadAttachment).mockResolvedValue(mockAttachment)

      const file = new File(['image data'], 'test.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)

      const res = await app.request(`/chat/${CONV_ID}/upload`, {
        method: 'POST',
        body: formData,
      })

      expect(res.status).toBe(201)
      const body: any = await res.json()
      expect(body).toHaveLength(1)
      expect(body[0].filename).toBe('test.png')
    })

    it('uploads multiple valid files', async () => {
      vi.mocked(uploadAttachment)
        .mockResolvedValueOnce({
          id: 'att-1',
          filename: 'a.png',
          contentType: 'image/png',
          size: 50,
          url: 'chat-attachments/conv/msg/att-1-a.png',
        })
        .mockResolvedValueOnce({
          id: 'att-2',
          filename: 'b.txt',
          contentType: 'text/plain',
          size: 30,
          url: 'chat-attachments/conv/msg/att-2-b.txt',
        })

      const formData = new FormData()
      formData.append('file', new File(['img'], 'a.png', { type: 'image/png' }))
      formData.append('file', new File(['text'], 'b.txt', { type: 'text/plain' }))

      const res = await app.request(`/chat/${CONV_ID}/upload`, {
        method: 'POST',
        body: formData,
      })

      expect(res.status).toBe(201)
      const body: any = await res.json()
      expect(body).toHaveLength(2)
    })
  })

  describe('GET /chat/files/*', () => {
    it('returns 400 for non-chat-attachments paths', async () => {
      const res = await app.request('/chat/files/other-prefix/file.png')

      expect(res.status).toBe(400)
      const body: any = await res.json()
      expect(body.error).toBe('Invalid file path')
    })

    it('returns 404 when file not found', async () => {
      vi.mocked(getAttachmentStream).mockRejectedValue(
        Object.assign(new Error('Not found'), { name: 'NoSuchKey' }),
      )

      const res = await app.request('/chat/files/chat-attachments/conv/msg/file.png')

      expect(res.status).toBe(404)
    })

    it('proxies file from storage', async () => {
      const chunks = [Buffer.from('file content')]
      const mockBody = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk
          }
        },
      }

      vi.mocked(getAttachmentStream).mockResolvedValue({
        body: mockBody as any,
        contentType: 'image/png',
        contentLength: 12,
      })

      const res = await app.request('/chat/files/chat-attachments/conv/msg/file.png')

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('image/png')
    })
  })
})
