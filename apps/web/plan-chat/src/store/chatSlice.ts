import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { Attachment, ChatMessage, ChatState, Conversation } from './__types__'
import * as chatApi from '../api/chatApi'

const initialState: ChatState = {
  conversations: {},
  activeConversationId: null,
  isLoading: false,
  isStreaming: false,
  streamingMessageId: null,
  draft: '',
  pendingAttachments: [],
  error: null,
}

// --- Async Thunks ---

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async () => {
    const summaries = await chatApi.listConversations()
    return summaries.map(s => ({
      id: s.id,
      title: s.title,
      messageCount: s.messageCount,
      updatedAt: new Date(s.updatedAt).getTime(),
    }))
  },
)

export const createConversationAsync = createAsyncThunk(
  'chat/createConversation',
  async (title?: string) => {
    const convo = await chatApi.createConversation(title)
    return {
      id: convo.id,
      title: convo.title,
      messages: [] as ChatMessage[],
      messagesLoaded: true,
      createdAt: new Date(convo.createdAt).getTime(),
      updatedAt: new Date(convo.updatedAt).getTime(),
    } satisfies Conversation
  },
)

export const deleteConversationAsync = createAsyncThunk(
  'chat/deleteConversation',
  async (id: string) => {
    await chatApi.deleteConversation(id)
    return id
  },
)

export const loadConversation = createAsyncThunk(
  'chat/loadConversation',
  async (id: string) => {
    const convo = await chatApi.getConversation(id)
    return {
      id: convo.id,
      title: convo.title,
      messages: convo.messages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp).getTime(),
        attachments: m.attachments,
      })),
      messagesLoaded: true,
      createdAt: new Date(convo.createdAt).getTime(),
      updatedAt: new Date(convo.updatedAt).getTime(),
    } satisfies Conversation
  },
)

export const sendMessageAsync = createAsyncThunk(
  'chat/sendMessage',
  async (
    {
      conversationId,
      content,
      attachments,
      files,
    }: {
      conversationId: string
      content: string
      attachments?: Attachment[]
      files?: File[]
    },
    { dispatch },
  ) => {
    // Upload files first if provided
    let uploadedAttachments = attachments
    if (files && files.length > 0) {
      const uploaded = await chatApi.uploadFiles(conversationId, files)
      uploadedAttachments = uploaded.map(a => ({
        id: a.id,
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        url: a.url,
      }))
    }

    dispatch(chatSlice.actions.setStreaming(true))

    await chatApi.sendMessage(
      conversationId,
      content,
      uploadedAttachments,
      {
        onUserMessage: msg => {
          dispatch(
            chatSlice.actions.addMessage({
              conversationId,
              message: {
                id: msg.id,
                role: 'user',
                content: msg.content,
                timestamp: new Date(msg.timestamp).getTime(),
                attachments: msg.attachments,
              },
            }),
          )
        },
        onAssistantChunk: (id, chunkContent) => {
          dispatch(
            chatSlice.actions.appendAssistantContent({
              conversationId,
              messageId: id,
              content: chunkContent,
            }),
          )
        },
        onDone: id => {
          dispatch(chatSlice.actions.finalizeAssistantMessage({ conversationId, messageId: id }))
        },
        onError: error => {
          dispatch(chatSlice.actions.setError(error.message))
          dispatch(chatSlice.actions.setStreaming(false))
        },
      },
    )
  },
)

// --- Slice ---

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload
      state.draft = ''
      state.pendingAttachments = []
      state.error = null
    },
    updateConversationTitle(state, action: PayloadAction<{ id: string; title: string }>) {
      const convo = state.conversations[action.payload.id]
      if (convo) {
        convo.title = action.payload.title
      }
    },
    addMessage(
      state,
      action: PayloadAction<{ conversationId: string; message: ChatMessage }>,
    ) {
      const convo = state.conversations[action.payload.conversationId]
      if (convo) {
        convo.messages.push(action.payload.message)
        convo.updatedAt = Date.now()
        // Auto-title on first user message
        if (
          action.payload.message.role === 'user' &&
          convo.messages.filter(m => m.role === 'user').length === 1
        ) {
          convo.title = action.payload.message.content.slice(0, 40) || 'File attachment'
        }
      }
    },
    appendAssistantContent(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string; content: string }>,
    ) {
      const convo = state.conversations[action.payload.conversationId]
      if (!convo) return

      const existing = convo.messages.find(m => m.id === action.payload.messageId)
      if (existing) {
        existing.content += action.payload.content
      } else {
        // First chunk — create the assistant message
        convo.messages.push({
          id: action.payload.messageId,
          role: 'assistant',
          content: action.payload.content,
          timestamp: Date.now(),
        })
        state.streamingMessageId = action.payload.messageId
      }
    },
    finalizeAssistantMessage(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>,
    ) {
      state.isStreaming = false
      state.streamingMessageId = null
      const convo = state.conversations[action.payload.conversationId]
      if (convo) {
        convo.updatedAt = Date.now()
      }
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    setDraft(state, action: PayloadAction<string>) {
      state.draft = action.payload
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
    addPendingAttachment(state, action: PayloadAction<Attachment>) {
      state.pendingAttachments.push(action.payload)
    },
    removePendingAttachment(state, action: PayloadAction<string>) {
      state.pendingAttachments = state.pendingAttachments.filter(a => a.id !== action.payload)
    },
    clearPendingAttachments(state) {
      state.pendingAttachments = []
    },
  },
  extraReducers: builder => {
    // fetchConversations
    builder.addCase(fetchConversations.pending, state => {
      state.isLoading = true
    })
    builder.addCase(fetchConversations.fulfilled, (state, action) => {
      state.isLoading = false
      for (const s of action.payload) {
        // Preserve existing conversation data if already loaded
        if (!state.conversations[s.id]) {
          state.conversations[s.id] = {
            id: s.id,
            title: s.title,
            messages: [],
            messagesLoaded: false,
            createdAt: s.updatedAt,
            updatedAt: s.updatedAt,
          }
        } else {
          state.conversations[s.id].title = s.title
          state.conversations[s.id].updatedAt = s.updatedAt
        }
      }
      // Remove conversations that no longer exist on server
      const serverIds = new Set(action.payload.map(s => s.id))
      for (const id of Object.keys(state.conversations)) {
        if (!serverIds.has(id)) {
          delete state.conversations[id]
        }
      }
    })
    builder.addCase(fetchConversations.rejected, (state, action) => {
      state.isLoading = false
      state.error = action.error.message ?? 'Failed to load conversations'
    })

    // createConversationAsync
    builder.addCase(createConversationAsync.fulfilled, (state, action) => {
      state.conversations[action.payload.id] = action.payload
      state.activeConversationId = action.payload.id
    })

    // deleteConversationAsync
    builder.addCase(deleteConversationAsync.fulfilled, (state, action) => {
      delete state.conversations[action.payload]
      if (state.activeConversationId === action.payload) {
        const remaining = Object.values(state.conversations).sort(
          (a, b) => b.updatedAt - a.updatedAt,
        )
        state.activeConversationId = remaining[0]?.id ?? null
      }
    })

    // loadConversation
    builder.addCase(loadConversation.fulfilled, (state, action) => {
      state.conversations[action.payload.id] = action.payload
    })

    // sendMessageAsync
    builder.addCase(sendMessageAsync.pending, state => {
      state.isStreaming = true
      state.error = null
    })
    builder.addCase(sendMessageAsync.fulfilled, state => {
      state.isStreaming = false
      state.streamingMessageId = null
    })
    builder.addCase(sendMessageAsync.rejected, (state, action) => {
      state.isStreaming = false
      state.streamingMessageId = null
      state.error = action.error.message ?? 'Failed to send message'
    })
  },
})

export const chatActions = chatSlice.actions

type RootState = { chat: ChatState }

export const selectConversations = (state: RootState) => state.chat.conversations
export const selectActiveConversationId = (state: RootState) => state.chat.activeConversationId
export const selectActiveConversation = (state: RootState) =>
  state.chat.activeConversationId
    ? state.chat.conversations[state.chat.activeConversationId]
    : null
export const selectMessages = (state: RootState) => {
  const convo = selectActiveConversation(state)
  return convo?.messages ?? []
}
export const selectIsLoading = (state: RootState) => state.chat.isLoading
export const selectIsStreaming = (state: RootState) => state.chat.isStreaming
export const selectStreamingMessageId = (state: RootState) => state.chat.streamingMessageId
export const selectDraft = (state: RootState) => state.chat.draft
export const selectPendingAttachments = (state: RootState) => state.chat.pendingAttachments
export const selectError = (state: RootState) => state.chat.error
