import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { chatSlice } from '../../../store/chatSlice'
import { ChatSidebar } from '../index'
import type { ChatState, Conversation } from '../../../store/__types__'

// Mock the API module
vi.mock('../../../api/chatApi', () => ({
  listConversations: vi.fn().mockResolvedValue([]),
  createConversation: vi.fn().mockResolvedValue({
    id: 'new-conv-id',
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
}))

function makeConversation(id: string, title: string, updatedAt: number): Conversation {
  return {
    id,
    title,
    messages: [],
    createdAt: updatedAt,
    updatedAt,
  }
}

function renderWithStore(
  conversations: Record<string, Conversation> = {},
  activeId: string | null = null,
) {
  const store = configureStore({
    reducer: { chat: chatSlice.reducer },
    preloadedState: {
      chat: {
        conversations,
        activeConversationId: activeId,
        isLoading: false,
        isStreaming: false,
        streamingMessageId: null,
        draft: '',
        pendingAttachments: [],
        error: null,
      } satisfies ChatState,
    },
  })
  return {
    store,
    ...render(
      <Provider store={store}>
        <ChatSidebar />
      </Provider>,
    ),
  }
}

describe('ChatSidebar', () => {
  it('renders New Chat button', () => {
    renderWithStore()
    expect(screen.getByRole('button', { name: /New Chat/i })).toBeInTheDocument()
  })

  it('displays conversations sorted by updatedAt desc', () => {
    const conversations = {
      old: makeConversation('old', 'Old Chat', Date.now() - 100000),
      new: makeConversation('new', 'Recent Chat', Date.now()),
    }
    renderWithStore(conversations)

    const buttons = screen.getAllByRole('button').filter(b => {
      const text = b.textContent ?? ''
      return text.includes('Old Chat') || text.includes('Recent Chat')
    })

    expect(buttons[0].textContent).toContain('Recent Chat')
    expect(buttons[1].textContent).toContain('Old Chat')
  })

  it('highlights active conversation', () => {
    const conversations = {
      'conv-1': makeConversation('conv-1', 'Active', Date.now()),
      'conv-2': makeConversation('conv-2', 'Inactive', Date.now() - 1000),
    }
    renderWithStore(conversations, 'conv-1')

    const activeButton = screen.getByText('Active').closest('button')
    expect(activeButton?.className).toContain('border-cyan-500')
  })

  it('switches conversation on click', () => {
    const conversations = {
      'conv-1': makeConversation('conv-1', 'First', Date.now()),
      'conv-2': makeConversation('conv-2', 'Second', Date.now() - 1000),
    }
    const { store } = renderWithStore(conversations, 'conv-1')

    fireEvent.click(screen.getByText('Second'))

    expect(store.getState().chat.activeConversationId).toBe('conv-2')
  })

  it('shows delete button for each conversation', () => {
    const conversations = {
      'conv-1': makeConversation('conv-1', 'My Chat', Date.now()),
    }
    renderWithStore(conversations)

    expect(screen.getByRole('button', { name: /Delete My Chat/i })).toBeInTheDocument()
  })

  it('opens confirmation dialog on delete click', () => {
    const conversations = {
      'conv-1': makeConversation('conv-1', 'Doomed Chat', Date.now()),
    }
    renderWithStore(conversations)

    fireEvent.click(screen.getByRole('button', { name: /Delete Doomed Chat/i }))

    expect(screen.getByText('Delete conversation')).toBeInTheDocument()
    expect(screen.getByText(/permanently deleted/)).toBeInTheDocument()
  })

  it('shows relative time for conversations', () => {
    const conversations = {
      'conv-1': makeConversation('conv-1', 'Recent', Date.now() - 30000),
    }
    renderWithStore(conversations)

    expect(screen.getByText('just now')).toBeInTheDocument()
  })
})
