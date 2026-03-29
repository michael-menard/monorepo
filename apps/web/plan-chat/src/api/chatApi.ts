import { z } from 'zod'

const ConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  messageCount: z.number(),
  updatedAt: z.string(),
})

const AttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  url: z.string(),
})

const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string(),
  attachments: z.array(AttachmentSchema).optional(),
})

const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(ChatMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ApiConversationSummary = z.infer<typeof ConversationSummarySchema>
export type ApiConversation = z.infer<typeof ConversationSchema>
export type ApiChatMessage = z.infer<typeof ChatMessageSchema>
export type ApiAttachment = z.infer<typeof AttachmentSchema>

export async function listConversations(): Promise<ApiConversationSummary[]> {
  const res = await fetch('/api/chat')
  if (!res.ok) throw new Error(`Failed to list conversations: ${res.status}`)
  const data = await res.json()
  return z.array(ConversationSummarySchema).parse(data)
}

export async function createConversation(title?: string): Promise<ApiConversation> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`)
  const data = await res.json()
  return ConversationSchema.parse(data)
}

export async function getConversation(id: string): Promise<ApiConversation> {
  const res = await fetch(`/api/chat/${id}`)
  if (!res.ok) throw new Error(`Failed to get conversation: ${res.status}`)
  const data = await res.json()
  return ConversationSchema.parse(data)
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/chat/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`)
}

export async function uploadFiles(conversationId: string, files: File[]): Promise<ApiAttachment[]> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('file', file)
  }
  const res = await fetch(`/api/chat/${conversationId}/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Failed to upload files: ${res.status}`)
  const data = await res.json()
  return z.array(AttachmentSchema).parse(data)
}

export type SSECallbacks = {
  onUserMessage: (message: ApiChatMessage) => void
  onAssistantChunk: (id: string, content: string) => void
  onDone: (id: string) => void
  onError: (error: Error) => void
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachments: ApiAttachment[] | undefined,
  callbacks: SSECallbacks,
): Promise<void> {
  const res = await fetch(`/api/chat/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, attachments }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    callbacks.onError(new Error(err.error || `HTTP ${res.status}`))
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    callbacks.onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      let currentEvent = ''
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data)
            if (currentEvent === 'user_message') {
              callbacks.onUserMessage(parsed)
            } else if (currentEvent === 'assistant_chunk') {
              callbacks.onAssistantChunk(parsed.id, parsed.content)
            } else if (currentEvent === 'done') {
              callbacks.onDone(parsed.id)
            }
          } catch {
            // Skip malformed JSON
          }
          currentEvent = ''
        }
      }
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)))
  }
}

export async function archiveConversation(id: string): Promise<{ summary: string }> {
  const res = await fetch(`/api/chat/${id}/archive`, { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to archive conversation: ${res.status}`)
  return res.json()
}

export async function searchConversations(
  query: string,
): Promise<{ conversationId: string; title: string; summary: string; similarityScore: number }[]> {
  const res = await fetch('/api/chat/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Failed to search conversations: ${res.status}`)
  return res.json()
}

export async function convertToPlan(id: string): Promise<{ planId: string; title: string }> {
  const res = await fetch(`/api/chat/${id}/convert-to-plan`, { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to convert to plan: ${res.status}`)
  return res.json()
}
