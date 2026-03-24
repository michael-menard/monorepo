import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  chatSlice,
  chatActions,
  selectConversations,
  selectActiveConversationId,
  selectActiveConversation,
  selectMessages,
  selectIsLoading,
  selectIsStreaming,
  selectDraft,
  selectPendingAttachments,
  selectError,
} from '../chatSlice'
import type { ChatState, Conversation } from '../__types__'

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  const now = Date.now()
  return {
    id: 'conv-1',
    title: 'New Chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createStore(overrides: Partial<ChatState> = {}) {
  return configureStore({
    reducer: { chat: chatSlice.reducer },
    preloadedState: {
      chat: {
        conversations: {},
        activeConversationId: null,
        isLoading: false,
        isStreaming: false,
        streamingMessageId: null,
        draft: '',
        pendingAttachments: [],
        error: null,
        ...overrides,
      },
    },
  })
}

describe('chatSlice', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
  })

  describe('initial state', () => {
    it('starts with empty state', () => {
      const state = store.getState()
      expect(selectConversations(state)).toEqual({})
      expect(selectActiveConversationId(state)).toBeNull()
      expect(selectIsLoading(state)).toBe(false)
      expect(selectIsStreaming(state)).toBe(false)
      expect(selectDraft(state)).toBe('')
      expect(selectPendingAttachments(state)).toEqual([])
      expect(selectError(state)).toBeNull()
    })
  })

  describe('setActiveConversation', () => {
    it('sets active conversation id', () => {
      const convo1 = makeConversation({ id: 'conv-1' })
      const convo2 = makeConversation({ id: 'conv-2' })
      store = createStore({
        conversations: { 'conv-1': convo1, 'conv-2': convo2 },
        activeConversationId: 'conv-1',
      })

      store.dispatch(chatActions.setActiveConversation('conv-2'))

      expect(selectActiveConversationId(store.getState())).toBe('conv-2')
    })

    it('clears draft when switching', () => {
      store = createStore({ draft: 'some text' })
      store.dispatch(chatActions.setActiveConversation('conv-1'))

      expect(selectDraft(store.getState())).toBe('')
    })

    it('clears pending attachments when switching', () => {
      store = createStore({
        pendingAttachments: [
          { id: 'att-1', filename: 'test.png', contentType: 'image/png', size: 100, url: 'blob:test' },
        ],
      })
      store.dispatch(chatActions.setActiveConversation('conv-1'))

      expect(selectPendingAttachments(store.getState())).toEqual([])
    })

    it('clears error when switching', () => {
      store = createStore({ error: 'some error' })
      store.dispatch(chatActions.setActiveConversation('conv-1'))

      expect(selectError(store.getState())).toBeNull()
    })

    it('can set to null', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo }, activeConversationId: 'conv-1' })
      store.dispatch(chatActions.setActiveConversation(null))

      expect(selectActiveConversationId(store.getState())).toBeNull()
    })
  })

  describe('updateConversationTitle', () => {
    it('updates title of existing conversation', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo } })

      store.dispatch(chatActions.updateConversationTitle({ id: 'conv-1', title: 'Updated' }))

      expect(selectConversations(store.getState())['conv-1'].title).toBe('Updated')
    })

    it('no-ops for non-existent conversation', () => {
      store.dispatch(chatActions.updateConversationTitle({ id: 'nope', title: 'X' }))
      expect(selectConversations(store.getState())).toEqual({})
    })
  })

  describe('addMessage', () => {
    it('adds message to specified conversation', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo }, activeConversationId: 'conv-1' })

      store.dispatch(
        chatActions.addMessage({
          conversationId: 'conv-1',
          message: { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
        }),
      )

      const messages = selectMessages(store.getState())
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Hello')
    })

    it('adds message with attachments', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo }, activeConversationId: 'conv-1' })

      const attachments = [
        { id: 'att-1', filename: 'photo.png', contentType: 'image/png', size: 1024, url: 'blob:test' },
      ]

      store.dispatch(
        chatActions.addMessage({
          conversationId: 'conv-1',
          message: { id: 'msg-1', role: 'user', content: 'look at this', timestamp: Date.now(), attachments },
        }),
      )

      const messages = selectMessages(store.getState())
      expect(messages[0].attachments).toEqual(attachments)
    })

    it('auto-titles from first user message', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo }, activeConversationId: 'conv-1' })

      store.dispatch(
        chatActions.addMessage({
          conversationId: 'conv-1',
          message: {
            id: 'msg-1',
            role: 'user',
            content: 'Build a LEGO city layout with modular buildings',
            timestamp: Date.now(),
          },
        }),
      )

      const active = selectActiveConversation(store.getState())
      expect(active!.title).toBe('Build a LEGO city layout with modular bu')
    })

    it('does not auto-title on second user message', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo }, activeConversationId: 'conv-1' })

      store.dispatch(
        chatActions.addMessage({
          conversationId: 'conv-1',
          message: { id: 'msg-1', role: 'user', content: 'First message', timestamp: Date.now() },
        }),
      )
      store.dispatch(
        chatActions.addMessage({
          conversationId: 'conv-1',
          message: { id: 'msg-2', role: 'user', content: 'Second should not update', timestamp: Date.now() },
        }),
      )

      expect(selectActiveConversation(store.getState())!.title).toBe('First message')
    })

    it('does not auto-title on assistant message', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo }, activeConversationId: 'conv-1' })

      store.dispatch(
        chatActions.addMessage({
          conversationId: 'conv-1',
          message: { id: 'msg-1', role: 'assistant', content: 'I am an assistant', timestamp: Date.now() },
        }),
      )

      expect(selectActiveConversation(store.getState())!.title).toBe('New Chat')
    })
  })

  describe('appendAssistantContent', () => {
    it('creates new assistant message on first chunk', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo }, activeConversationId: 'conv-1' })

      store.dispatch(
        chatActions.appendAssistantContent({
          conversationId: 'conv-1',
          messageId: 'ast-1',
          content: 'Hello',
        }),
      )

      const messages = selectMessages(store.getState())
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('assistant')
      expect(messages[0].content).toBe('Hello')
    })

    it('appends to existing assistant message on subsequent chunks', () => {
      const convo = makeConversation({ id: 'conv-1' })
      store = createStore({ conversations: { 'conv-1': convo }, activeConversationId: 'conv-1' })

      store.dispatch(chatActions.appendAssistantContent({ conversationId: 'conv-1', messageId: 'ast-1', content: 'Hel' }))
      store.dispatch(chatActions.appendAssistantContent({ conversationId: 'conv-1', messageId: 'ast-1', content: 'lo world' }))

      const messages = selectMessages(store.getState())
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Hello world')
    })
  })

  describe('finalizeAssistantMessage', () => {
    it('clears streaming state', () => {
      store = createStore({ isStreaming: true, streamingMessageId: 'ast-1' })

      store.dispatch(chatActions.finalizeAssistantMessage({ conversationId: 'conv-1', messageId: 'ast-1' }))

      expect(selectIsStreaming(store.getState())).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('sets loading state', () => {
      store.dispatch(chatActions.setLoading(true))
      expect(selectIsLoading(store.getState())).toBe(true)

      store.dispatch(chatActions.setLoading(false))
      expect(selectIsLoading(store.getState())).toBe(false)
    })
  })

  describe('setDraft', () => {
    it('updates draft text', () => {
      store.dispatch(chatActions.setDraft('hello world'))
      expect(selectDraft(store.getState())).toBe('hello world')
    })
  })

  describe('setError', () => {
    it('sets and clears error', () => {
      store.dispatch(chatActions.setError('Something went wrong'))
      expect(selectError(store.getState())).toBe('Something went wrong')

      store.dispatch(chatActions.setError(null))
      expect(selectError(store.getState())).toBeNull()
    })
  })

  describe('pendingAttachments', () => {
    it('adds a pending attachment', () => {
      const attachment = {
        id: 'att-1',
        filename: 'test.png',
        contentType: 'image/png',
        size: 1024,
        url: 'blob:test',
      }

      store.dispatch(chatActions.addPendingAttachment(attachment))

      expect(selectPendingAttachments(store.getState())).toEqual([attachment])
    })

    it('removes a pending attachment by id', () => {
      store = createStore({
        pendingAttachments: [
          { id: 'att-1', filename: 'a.png', contentType: 'image/png', size: 100, url: 'blob:a' },
          { id: 'att-2', filename: 'b.png', contentType: 'image/png', size: 200, url: 'blob:b' },
        ],
      })

      store.dispatch(chatActions.removePendingAttachment('att-1'))

      const pending = selectPendingAttachments(store.getState())
      expect(pending).toHaveLength(1)
      expect(pending[0].id).toBe('att-2')
    })

    it('clears all pending attachments', () => {
      store = createStore({
        pendingAttachments: [
          { id: 'att-1', filename: 'a.png', contentType: 'image/png', size: 100, url: 'blob:a' },
        ],
      })

      store.dispatch(chatActions.clearPendingAttachments())

      expect(selectPendingAttachments(store.getState())).toEqual([])
    })
  })

  describe('selectors', () => {
    it('selectActiveConversation returns null when no active id', () => {
      expect(selectActiveConversation(store.getState())).toBeNull()
    })

    it('selectMessages returns empty array when no active conversation', () => {
      expect(selectMessages(store.getState())).toEqual([])
    })
  })
})
