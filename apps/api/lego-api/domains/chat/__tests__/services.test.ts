import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChatService } from '../application/services.js'

// ─────────────────────────────────────────────────────────────────────────
// Mock Helpers
// ─────────────────────────────────────────────────────────────────────────

const mockConversationRow = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'New Chat',
  messages: [],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const mockConversationWithMessages = {
  ...mockConversationRow,
  messages: [
    { id: 'msg-1', role: 'user', content: 'Hello', timestamp: '2026-01-01T00:00:00Z' },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there!',
      timestamp: '2026-01-01T00:00:01Z',
    },
  ],
}

function createMockDb() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([mockConversationRow]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }

  // Make select/insert/update/delete return the chain
  const db = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  }

  return { db, chain }
}

function createMockOpenAI(chunks: string[] = ['Hello', ' world']) {
  const mockStream = {
    async *[Symbol.asyncIterator]() {
      for (const content of chunks) {
        yield {
          choices: [{ delta: { content } }],
        }
      }
    },
  }

  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(mockStream),
      },
    },
  } as any
}

// ─────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────

describe('ChatService', () => {
  let db: ReturnType<typeof createMockDb>['db']
  let chain: ReturnType<typeof createMockDb>['chain']
  let openai: ReturnType<typeof createMockOpenAI>
  let service: ReturnType<typeof createChatService>

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ db, chain } = createMockDb())
    openai = createMockOpenAI()
    service = createChatService({ db: db as any, openai })
  })

  describe('listConversations', () => {
    it('returns conversations sorted by updatedAt with message counts', async () => {
      chain.orderBy.mockResolvedValue([
        { ...mockConversationRow, messages: [{ id: '1' }, { id: '2' }] },
        { ...mockConversationRow, id: '222', title: 'Second', messages: [] },
      ])

      const result = await service.listConversations()

      expect(result).toHaveLength(2)
      expect(result[0].messageCount).toBe(2)
      expect(result[1].messageCount).toBe(0)
      expect(result[0].updatedAt).toBe('2026-01-01T00:00:00.000Z')
    })

    it('returns empty array when no conversations exist', async () => {
      chain.orderBy.mockResolvedValue([])

      const result = await service.listConversations()

      expect(result).toEqual([])
    })
  })

  describe('getConversation', () => {
    it('returns conversation when found', async () => {
      chain.limit.mockResolvedValue([mockConversationWithMessages])

      const result = await service.getConversation(mockConversationRow.id)

      expect(result).not.toBeNull()
      expect(result!.id).toBe(mockConversationRow.id)
      expect(result!.messages).toHaveLength(2)
      expect(result!.createdAt).toBe('2026-01-01T00:00:00.000Z')
    })

    it('returns null when not found', async () => {
      chain.limit.mockResolvedValue([])

      const result = await service.getConversation('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createConversation', () => {
    it('creates conversation with default title', async () => {
      const result = await service.createConversation()

      expect(result.title).toBe('New Chat')
      expect(result.messages).toEqual([])
    })

    it('creates conversation with custom title', async () => {
      chain.returning.mockResolvedValue([{ ...mockConversationRow, title: 'My Plan' }])

      const result = await service.createConversation('My Plan')

      expect(result.title).toBe('My Plan')
    })
  })

  describe('deleteConversation', () => {
    it('returns true when conversation is deleted', async () => {
      chain.returning.mockResolvedValue([{ id: mockConversationRow.id }])

      const result = await service.deleteConversation(mockConversationRow.id)

      expect(result).toBe(true)
    })

    it('returns false when conversation not found', async () => {
      chain.returning.mockResolvedValue([])

      const result = await service.deleteConversation('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('sendMessage', () => {
    it('throws when conversation not found', async () => {
      chain.limit.mockResolvedValue([])

      await expect(service.sendMessage('nonexistent', 'hello')).rejects.toThrow(
        'Conversation not found',
      )
    })

    it('saves user message and returns streaming chunks', async () => {
      chain.limit.mockResolvedValue([mockConversationRow])
      // Mock update chain to return the chain itself
      chain.where.mockReturnValue(chain)

      const { userMessage, chunks } = await service.sendMessage(mockConversationRow.id, 'Hello AI')

      expect(userMessage.role).toBe('user')
      expect(userMessage.content).toBe('Hello AI')

      // Consume the async iterator
      const collected: string[] = []
      for await (const chunk of chunks) {
        collected.push(chunk)
      }

      expect(collected).toEqual(['Hello', ' world'])
    })

    it('auto-titles on first message', async () => {
      chain.limit.mockResolvedValue([{ ...mockConversationRow, messages: [] }])
      chain.where.mockReturnValue(chain)

      await service.sendMessage(mockConversationRow.id, 'Create a plan for my LEGO city layout')

      // First update should set title from first 40 chars
      expect(chain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Create a plan for my LEGO city layout',
        }),
      )
    })

    it('does not change title when messages already exist', async () => {
      chain.limit.mockResolvedValue([mockConversationWithMessages])
      chain.where.mockReturnValue(chain)

      await service.sendMessage(mockConversationRow.id, 'Follow up question')

      expect(chain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Chat',
        }),
      )
    })

    it('calls OpenAI with conversation history', async () => {
      chain.limit.mockResolvedValue([mockConversationWithMessages])
      chain.where.mockReturnValue(chain)

      const { chunks } = await service.sendMessage(mockConversationRow.id, 'Another message')

      // Drain the iterator to trigger the OpenAI call
      for await (const _chunk of chunks) {
        // consume
      }

      expect(openai.chat.completions.create).toHaveBeenCalledWith({
        model: expect.any(String),
        messages: expect.arrayContaining([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'Another message' },
        ]),
        stream: true,
      })
    })

    it('uses OPENAI_CHAT_MODEL env var when set', async () => {
      process.env.OPENAI_CHAT_MODEL = 'gpt-3.5-turbo'
      chain.limit.mockResolvedValue([mockConversationRow])
      chain.where.mockReturnValue(chain)

      const { chunks } = await service.sendMessage(mockConversationRow.id, 'test')
      for await (const _chunk of chunks) {
        // consume
      }

      expect(openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-3.5-turbo' }),
      )

      delete process.env.OPENAI_CHAT_MODEL
    })

    it('stores attachments in user message', async () => {
      chain.limit.mockResolvedValue([mockConversationRow])
      chain.where.mockReturnValue(chain)

      const attachments = [
        {
          id: 'att-1',
          filename: 'test.png',
          contentType: 'image/png',
          size: 1024,
          url: 'chat-attachments/conv/msg/att-1-test.png',
        },
      ]

      const { userMessage } = await service.sendMessage(
        mockConversationRow.id,
        'look at this',
        attachments,
      )

      expect(userMessage.attachments).toEqual(attachments)
      expect(userMessage.content).toBe('look at this')
    })

    it('does not include attachments in OpenAI messages but adds summary', async () => {
      chain.limit.mockResolvedValue([mockConversationRow])
      chain.where.mockReturnValue(chain)

      const attachments = [
        {
          id: 'att-1',
          filename: 'schema.ts',
          contentType: 'text/typescript',
          size: 512,
          url: 'chat-attachments/conv/msg/att-1-schema.ts',
        },
        {
          id: 'att-2',
          filename: 'photo.png',
          contentType: 'image/png',
          size: 2048,
          url: 'chat-attachments/conv/msg/att-2-photo.png',
        },
      ]

      const { chunks } = await service.sendMessage(
        mockConversationRow.id,
        'check these',
        attachments,
      )

      for await (const _chunk of chunks) {
        // consume
      }

      const createCall = openai.chat.completions.create.mock.calls[0][0]
      const lastMessage = createCall.messages[createCall.messages.length - 1]

      // Should have text content + attachment summary, NOT attachment objects
      expect(lastMessage.content).toContain('check these')
      expect(lastMessage.content).toContain('[Attached: schema.ts, photo.png]')
      expect(lastMessage).not.toHaveProperty('attachments')
    })

    it('handles message with only attachments (empty content)', async () => {
      chain.limit.mockResolvedValue([mockConversationRow])
      chain.where.mockReturnValue(chain)

      const attachments = [
        {
          id: 'att-1',
          filename: 'file.md',
          contentType: 'text/markdown',
          size: 100,
          url: 'chat-attachments/conv/msg/att-1-file.md',
        },
      ]

      const { userMessage } = await service.sendMessage(
        mockConversationRow.id,
        '',
        attachments,
      )

      expect(userMessage.content).toBe('')
      expect(userMessage.attachments).toEqual(attachments)
    })
  })
})
