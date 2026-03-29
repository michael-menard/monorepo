import { z } from 'zod'

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  url: z.string(),
})

export type Attachment = z.infer<typeof AttachmentSchema>

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().datetime(),
  attachments: z.array(AttachmentSchema).optional(),
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  messages: z.array(ChatMessageSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Conversation = z.infer<typeof ConversationSchema>

export const SendMessageInputSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    content: z.string().optional(),
    attachments: z.array(AttachmentSchema).optional(),
  })
  .refine(
    data =>
      (data.content && data.content.trim().length > 0) ||
      (data.attachments && data.attachments.length > 0),
    {
      message: 'Either content or attachments must be provided',
    },
  )

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const ALLOWED_TEXT_EXTENSIONS = [
  '.txt',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.html',
  '.xml',
  '.csv',
  '.log',
]
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_MESSAGE = 5

export const CreateConversationInputSchema = z.object({
  title: z.string().optional(),
})

export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>

export const ConversationSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  messageCount: z.number(),
  updatedAt: z.string().datetime(),
})

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>

export const ListConversationsResponseSchema = z.array(ConversationSummarySchema)

export type ListConversationsResponse = z.infer<typeof ListConversationsResponseSchema>
