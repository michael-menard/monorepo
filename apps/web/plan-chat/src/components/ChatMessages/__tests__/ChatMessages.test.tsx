import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { chatSlice } from '../../../store/chatSlice'
import type { ChatMessage } from '../../../store/__types__'
import { ChatMessages } from '../index'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

function renderWithStore(preloadedChat?: Parameters<typeof chatSlice.reducer>[0]) {
  const store = configureStore({
    reducer: { chat: chatSlice.reducer },
    preloadedState: preloadedChat ? { chat: preloadedChat } : undefined,
  })
  return { store, ...render(<Provider store={store}><ChatMessages /></Provider>) }
}

function stateWithMessages(messages: ChatMessage[]) {
  return {
    conversations: {
      'conv-1': {
        id: 'conv-1',
        title: 'Test',
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
    activeConversationId: 'conv-1' as string | null,
    isLoading: false,
    isStreaming: false,
    streamingMessageId: null as string | null,
    draft: '',
    pendingAttachments: [] as any[],
    error: null as string | null,
  }
}

describe('ChatMessages', () => {
  it('renders empty state when no messages', () => {
    renderWithStore(stateWithMessages([]))
    expect(screen.getByText('Start a conversation to create a plan.')).toBeInTheDocument()
  })

  it('renders user messages', () => {
    renderWithStore(
      stateWithMessages([{ id: '1', role: 'user', content: 'Hello there', timestamp: Date.now() }]),
    )
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('renders assistant messages', () => {
    renderWithStore(
      stateWithMessages([{ id: '1', role: 'assistant', content: 'I can help!', timestamp: Date.now() }]),
    )
    expect(screen.getByText('I can help!')).toBeInTheDocument()
  })

  it('renders multiple messages in order', () => {
    renderWithStore(
      stateWithMessages([
        { id: '1', role: 'user', content: 'First', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Second', timestamp: Date.now() },
        { id: '3', role: 'user', content: 'Third', timestamp: Date.now() },
      ]),
    )
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })

  it('shows loading indicator when streaming with no assistant message yet', () => {
    const state = stateWithMessages([{ id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }])
    state.isStreaming = true
    renderWithStore(state)
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('does not show loading indicator when not streaming', () => {
    renderWithStore(stateWithMessages([{ id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }]))
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument()
  })

  it('has accessible role="log"', () => {
    renderWithStore(stateWithMessages([]))
    expect(screen.getByRole('log')).toBeInTheDocument()
  })

  it('does not show empty state text when streaming', () => {
    const state = stateWithMessages([])
    state.isStreaming = true
    renderWithStore(state)
    expect(screen.queryByText('Start a conversation to create a plan.')).not.toBeInTheDocument()
  })

  it('renders image attachments as thumbnails', () => {
    renderWithStore(
      stateWithMessages([
        {
          id: '1',
          role: 'user',
          content: 'check this out',
          timestamp: Date.now(),
          attachments: [
            {
              id: 'att-1',
              filename: 'photo.png',
              contentType: 'image/png',
              size: 2048,
              url: 'blob:test-url',
            },
          ],
        },
      ]),
    )

    expect(screen.getByText('check this out')).toBeInTheDocument()
    const img = screen.getByAltText('photo.png')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'blob:test-url')
  })

  it('renders text file attachments with filename', () => {
    renderWithStore(
      stateWithMessages([
        {
          id: '1',
          role: 'user',
          content: 'here is the code',
          timestamp: Date.now(),
          attachments: [
            {
              id: 'att-1',
              filename: 'schema.ts',
              contentType: 'text/typescript',
              size: 512,
              url: '/files/chat-attachments/conv/msg/att-1-schema.ts',
            },
          ],
        },
      ]),
    )

    expect(screen.getByText('here is the code')).toBeInTheDocument()
    expect(screen.getByText('schema.ts')).toBeInTheDocument()
  })

  it('renders message with only attachments (no text content)', () => {
    renderWithStore(
      stateWithMessages([
        {
          id: '1',
          role: 'user',
          content: '',
          timestamp: Date.now(),
          attachments: [
            {
              id: 'att-1',
              filename: 'image.jpg',
              contentType: 'image/jpeg',
              size: 4096,
              url: 'blob:test',
            },
          ],
        },
      ]),
    )

    const img = screen.getByAltText('image.jpg')
    expect(img).toBeInTheDocument()
  })

  it('renders multiple attachments on a single message', () => {
    renderWithStore(
      stateWithMessages([
        {
          id: '1',
          role: 'user',
          content: 'files',
          timestamp: Date.now(),
          attachments: [
            {
              id: 'att-1',
              filename: 'a.png',
              contentType: 'image/png',
              size: 100,
              url: 'blob:a',
            },
            {
              id: 'att-2',
              filename: 'b.txt',
              contentType: 'text/plain',
              size: 50,
              url: 'blob:b',
            },
          ],
        },
      ]),
    )

    expect(screen.getByAltText('a.png')).toBeInTheDocument()
    expect(screen.getByText('b.txt')).toBeInTheDocument()
  })
})
