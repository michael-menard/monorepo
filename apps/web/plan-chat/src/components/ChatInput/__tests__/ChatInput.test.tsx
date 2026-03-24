import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { chatSlice } from '../../../store/chatSlice'
import { ChatInput } from '../index'
import type { ChatState } from '../../../store/__types__'

// Mock the API module
vi.mock('../../../api/chatApi', () => ({
  createConversation: vi.fn().mockResolvedValue({
    id: 'new-conv-id',
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  sendMessage: vi.fn().mockImplementation((_id, _content, _attachments, callbacks) => {
    callbacks.onUserMessage({
      id: 'msg-1',
      role: 'user',
      content: _content,
      timestamp: new Date().toISOString(),
    })
    callbacks.onDone('ast-1')
    return Promise.resolve()
  }),
  uploadFiles: vi.fn().mockResolvedValue([]),
}))

// Mock crypto.randomUUID
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' })

// Mock URL.createObjectURL
vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:test-url' })

function createTestStore(overrides?: Partial<ChatState>) {
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

function renderWithStore(overrides?: Partial<ChatState>) {
  const store = createTestStore(overrides)
  const utils = render(
    <Provider store={store}>
      <ChatInput />
    </Provider>,
  )
  return { store, ...utils }
}

describe('ChatInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea with placeholder', () => {
    renderWithStore()
    expect(
      screen.getByPlaceholderText('Describe the plan you want to create...'),
    ).toBeInTheDocument()
  })

  it('renders send button', () => {
    renderWithStore()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
  })

  it('renders attach button', () => {
    renderWithStore()
    expect(screen.getByRole('button', { name: 'Attach file' })).toBeInTheDocument()
  })

  it('disables send button when draft is empty and no attachments', () => {
    renderWithStore()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })

  it('disables send button when streaming', () => {
    renderWithStore({ draft: 'hello', isStreaming: true })
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })

  it('enables send button when draft has text and not streaming', () => {
    renderWithStore({ draft: 'hello' })
    expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled()
  })

  it('enables send button when pending attachments exist (no text)', () => {
    renderWithStore({
      pendingAttachments: [
        { id: 'att-1', filename: 'test.png', contentType: 'image/png', size: 100, url: 'blob:test' },
      ],
    })
    expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled()
  })

  it('updates draft on input change', async () => {
    const { store } = renderWithStore()
    const textarea = screen.getByRole('textbox', { name: 'Chat message input' })

    await userEvent.type(textarea, 'test message')

    expect(store.getState().chat.draft).toBe('test message')
  })

  it('clears draft after sending', async () => {
    const { store } = renderWithStore({
      draft: 'test',
      activeConversationId: 'conv-1',
      conversations: {
        'conv-1': {
          id: 'conv-1',
          title: 'Test',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    expect(store.getState().chat.draft).toBe('')
  })

  it('does not send whitespace-only messages with no attachments', () => {
    renderWithStore({
      draft: '   ',
      activeConversationId: 'conv-1',
      conversations: {
        'conv-1': {
          id: 'conv-1',
          title: 'Test',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    })

    // Button should be disabled because trimmed draft is empty
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })

  it('shows pending attachment previews', () => {
    renderWithStore({
      pendingAttachments: [
        { id: 'att-1', filename: 'photo.png', contentType: 'image/png', size: 2048, url: 'blob:test' },
        { id: 'att-2', filename: 'notes.txt', contentType: 'text/plain', size: 512, url: 'blob:test2' },
      ],
    })

    expect(screen.getByText('photo.png')).toBeInTheDocument()
    expect(screen.getByText('notes.txt')).toBeInTheDocument()
  })

  it('removes pending attachment when X clicked', () => {
    const { store } = renderWithStore({
      pendingAttachments: [
        { id: 'att-1', filename: 'photo.png', contentType: 'image/png', size: 2048, url: 'blob:test' },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo.png' }))

    expect(store.getState().chat.pendingAttachments).toEqual([])
  })

  it('has accessible label on textarea', () => {
    renderWithStore()
    expect(screen.getByRole('textbox', { name: 'Chat message input' })).toBeInTheDocument()
  })

  it('has hidden file input', () => {
    renderWithStore()
    const fileInput = screen.getByLabelText('Attach files')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveAttribute('multiple')
  })

  it('disables attach button when at max attachments', () => {
    renderWithStore({
      pendingAttachments: Array.from({ length: 5 }, (_, i) => ({
        id: `att-${i}`,
        filename: `file${i}.png`,
        contentType: 'image/png',
        size: 100,
        url: `blob:test${i}`,
      })),
    })

    expect(screen.getByRole('button', { name: 'Attach file' })).toBeDisabled()
  })
})
