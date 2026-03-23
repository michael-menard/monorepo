import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { chatSlice } from '../../../store/chatSlice'
import { ChatPage } from '../index'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock the API module to prevent actual API calls
vi.mock('../../../api/chatApi', () => ({
  listConversations: vi.fn().mockResolvedValue([]),
  createConversation: vi.fn().mockResolvedValue({
    id: 'new-id',
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
  getConversation: vi.fn().mockResolvedValue({
    id: 'conv-1',
    title: 'Test',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  convertToPlan: vi.fn().mockResolvedValue({ planId: 'plan-1', title: 'Test Plan' }),
  archiveConversation: vi.fn().mockResolvedValue({ summary: 'test summary' }),
}))

function renderWithStore(activeConversationId: string | null = null) {
  const conversations = activeConversationId
    ? {
        [activeConversationId]: {
          id: activeConversationId,
          title: 'Test Chat',
          messages: [
            { id: '1', role: 'user' as const, content: 'Hello', timestamp: Date.now() },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }
    : {}

  const store = configureStore({
    reducer: { chat: chatSlice.reducer },
    preloadedState: {
      chat: {
        conversations,
        activeConversationId,
        isLoading: false,
        isStreaming: false,
        streamingMessageId: null,
        draft: '',
        pendingAttachments: [],
        error: null,
      },
    },
  })

  return render(
    <Provider store={store}>
      <ChatPage />
    </Provider>,
  )
}

describe('ChatPage', () => {
  it('renders sidebar', () => {
    renderWithStore()
    expect(screen.getByRole('button', { name: /New Chat/i })).toBeInTheDocument()
  })

  it('renders empty state when no active conversation', () => {
    renderWithStore()
    expect(screen.getByText('No conversation selected')).toBeInTheDocument()
  })

  it('renders messages when conversation is active', () => {
    renderWithStore('conv-1')
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.queryByText('No conversation selected')).not.toBeInTheDocument()
  })

  it('always renders chat input', () => {
    renderWithStore()
    expect(
      screen.getByPlaceholderText('Describe the plan you want to create...'),
    ).toBeInTheDocument()
  })
})
