import { z } from 'zod'

export const AttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  url: z.string(),
})

export type Attachment = z.infer<typeof AttachmentSchema>

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.number(),
  attachments: z.array(AttachmentSchema).optional(),
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(ChatMessageSchema),
  messagesLoaded: z.boolean().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type Conversation = z.infer<typeof ConversationSchema>

export const ChatStateSchema = z.object({
  conversations: z.record(z.string(), ConversationSchema),
  activeConversationId: z.string().nullable(),
  isLoading: z.boolean(),
  isStreaming: z.boolean(),
  streamingMessageId: z.string().nullable(),
  draft: z.string(),
  pendingAttachments: z.array(AttachmentSchema),
  error: z.string().nullable(),
})

export type ChatState = z.infer<typeof ChatStateSchema>
