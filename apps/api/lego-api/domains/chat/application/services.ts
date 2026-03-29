import { eq, desc, sql } from 'drizzle-orm'
import OpenAI from 'openai'
import { logger } from '@repo/logger'
import { EmbeddingClient } from '@repo/knowledge-base/embedding-client'
import type { ChatDb } from '../db.js'
import { chatConversations } from '../schema.js'
import type { ChatMessage, ConversationSummary, Conversation, Attachment } from '../types.js'
import { findSimilarConversations } from './similarity.js'

const SYSTEM_PROMPT = `You are a LEGO MOC planning assistant. Help users plan projects by:
- Clarifying goals and scope
- Breaking work into phases and deliverables
- Identifying dependencies and risks
- Suggesting timelines and priorities

Be concise and action-oriented. When the user's plan is clear enough, offer to convert the conversation into a structured plan.`

const TOKEN_BUDGET = 6000

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

type OpenAIMessage = { role: 'user' | 'assistant' | 'system'; content: string }

function trimToTokenBudget(messages: OpenAIMessage[], budget: number): OpenAIMessage[] {
  if (messages.length === 0) return []

  // Always include the latest user message
  const lastMessage = messages[messages.length - 1]
  let used = estimateTokens(lastMessage.content)
  const result: OpenAIMessage[] = [lastMessage]

  // Walk backwards from second-to-last
  for (let i = messages.length - 2; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content)
    if (used + msgTokens > budget) {
      // Prepend an omission note if we're cutting messages
      result.unshift({ role: 'system', content: '[Earlier messages omitted]' })
      break
    }
    used += msgTokens
    result.unshift(messages[i])
  }

  return result
}

type ChatServiceDeps = {
  db: ChatDb
  openai: OpenAI
  embeddingClient?: EmbeddingClient
}

export function createChatService({
  db,
  openai,
  embeddingClient: injectedClient,
}: ChatServiceDeps) {
  let _embeddingClient: EmbeddingClient | undefined = injectedClient

  function getOrCreateEmbeddingClient(): EmbeddingClient {
    if (!_embeddingClient) {
      _embeddingClient = new EmbeddingClient({
        apiKey: process.env.OPENAI_API_KEY!,
      })
    }
    return _embeddingClient
  }
  return {
    async listConversations(): Promise<ConversationSummary[]> {
      const rows = await db
        .select({
          id: chatConversations.id,
          title: chatConversations.title,
          messages: chatConversations.messages,
          updatedAt: chatConversations.updatedAt,
        })
        .from(chatConversations)
        .orderBy(desc(chatConversations.updatedAt))

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        messageCount: (row.messages as ChatMessage[]).length,
        updatedAt: row.updatedAt.toISOString(),
      }))
    },

    async getConversation(id: string): Promise<Conversation | null> {
      const rows = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, id))
        .limit(1)

      if (rows.length === 0) return null

      const row = rows[0]
      return {
        id: row.id,
        title: row.title,
        messages: row.messages as ChatMessage[],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    },

    async createConversation(title?: string): Promise<Conversation> {
      const rows = await db
        .insert(chatConversations)
        .values({ title: title ?? 'New Chat' })
        .returning()

      const row = rows[0]
      return {
        id: row.id,
        title: row.title,
        messages: row.messages as ChatMessage[],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    },

    async deleteConversation(id: string): Promise<boolean> {
      const result = await db
        .delete(chatConversations)
        .where(eq(chatConversations.id, id))
        .returning({ id: chatConversations.id })

      return result.length > 0
    },

    async sendMessage(conversationId: string, content: string, attachments?: Attachment[]) {
      // Get existing conversation
      const rows = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, conversationId))
        .limit(1)

      if (rows.length === 0) {
        throw new Error('Conversation not found')
      }

      const conversation = rows[0]
      const existingMessages = conversation.messages as ChatMessage[]

      // Create user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content || '',
        timestamp: new Date().toISOString(),
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      }

      const updatedMessages = [...existingMessages, userMessage]

      // Auto-title on first user message
      const isFirstMessage = existingMessages.length === 0
      const titleSource =
        content ||
        (attachments ? `Files: ${attachments.map(a => a.filename).join(', ')}` : 'New Chat')
      const newTitle = isFirstMessage ? titleSource.slice(0, 40) : conversation.title

      // Save user message
      await db
        .update(chatConversations)
        .set({
          messages: updatedMessages,
          title: newTitle,
          updatedAt: new Date(),
        })
        .where(eq(chatConversations.id, conversationId))

      // Build OpenAI messages from conversation history (text-only, no attachments)
      const openaiMessages: OpenAIMessage[] = updatedMessages.map(m => {
        let textContent = m.content
        if (m.attachments && m.attachments.length > 0) {
          const filenames = m.attachments.map(a => a.filename).join(', ')
          textContent = `${textContent}\n[Attached: ${filenames}]`.trim()
        }
        return {
          role: m.role as 'user' | 'assistant' | 'system',
          content: textContent,
        }
      })

      // Apply token budget and prepend system prompt
      const trimmedMessages = trimToTokenBudget(openaiMessages, TOKEN_BUDGET)
      const messagesWithSystem = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...trimmedMessages,
      ]

      // Create streaming completion
      const stream = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
        messages: messagesWithSystem,
        stream: true,
      })

      const assistantMessageId = crypto.randomUUID()
      let fullContent = ''

      async function* generateChunks() {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) {
              fullContent += delta
              yield delta
            }
          }

          // Save complete assistant message
          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: fullContent,
            timestamp: new Date().toISOString(),
          }

          await db
            .update(chatConversations)
            .set({
              messages: sql`${chatConversations.messages} || ${JSON.stringify([assistantMessage])}::jsonb`,
              updatedAt: new Date(),
            })
            .where(eq(chatConversations.id, conversationId))
        } catch (error) {
          logger.error('OpenAI streaming error:', error)
          throw error
        }
      }

      return {
        userMessage,
        assistantMessageId,
        chunks: generateChunks(),
      }
    },

    async generateSummary(conversationId: string): Promise<string> {
      const rows = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, conversationId))
        .limit(1)

      if (rows.length === 0) throw new Error('Conversation not found')

      const conversation = rows[0]

      // Return existing summary if present
      if (conversation.summary) return conversation.summary

      const messages = conversation.messages as ChatMessage[]
      if (messages.length === 0) throw new Error('No messages to summarize')

      const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n')

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Summarize this conversation into: 1) Key decisions made, 2) Action items identified, 3) Topics discussed. Be concise.',
          },
          { role: 'user', content: transcript },
        ],
      })

      const summary = response.choices[0]?.message?.content ?? ''

      await db
        .update(chatConversations)
        .set({ summary, updatedAt: new Date() })
        .where(eq(chatConversations.id, conversationId))

      return summary
    },

    async archiveConversation(
      conversationId: string,
    ): Promise<{ summary: string; archived: boolean }> {
      const summary = await this.generateSummary(conversationId)

      // Get conversation title for embedding text
      const rows = await db
        .select({ title: chatConversations.title })
        .from(chatConversations)
        .where(eq(chatConversations.id, conversationId))
        .limit(1)

      const title = rows[0]?.title ?? 'Untitled'

      await db
        .update(chatConversations)
        .set({ archived: true, updatedAt: new Date() })
        .where(eq(chatConversations.id, conversationId))

      // Generate and store embedding via EmbeddingClient (with caching + retry)
      try {
        const embeddingText = `Title: ${title}\nSummary: ${summary}`
        const client = getOrCreateEmbeddingClient()
        const embedding = await client.generateEmbedding(embeddingText)
        const embeddingStr = `[${(embedding as number[]).join(',')}]`

        await db.execute(sql`
          INSERT INTO chat_conversation_embeddings (conversation_id, embedding, summary_text, model)
          VALUES (${conversationId}, ${embeddingStr}::vector, ${embeddingText}, 'text-embedding-3-small')
          ON CONFLICT (conversation_id) DO UPDATE SET
            embedding = ${embeddingStr}::vector,
            summary_text = ${embeddingText},
            updated_at = now()
        `)
      } catch (error) {
        logger.error('Failed to generate embedding for conversation:', error)
        // Non-fatal — conversation is still archived
      }

      return { summary, archived: true }
    },

    async searchConversations(query: string, limit = 5) {
      const client = getOrCreateEmbeddingClient()
      const queryEmbedding = await client.generateEmbedding(query)
      return findSimilarConversations(db, queryEmbedding as number[], limit)
    },

    async convertToPlan(conversationId: string): Promise<{ planId: string; title: string }> {
      const rows = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, conversationId))
        .limit(1)

      if (rows.length === 0) throw new Error('Conversation not found')

      const conversation = rows[0]
      const messages = conversation.messages as ChatMessage[]
      if (messages.length === 0) throw new Error('No messages to convert')

      const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n')

      // Find similar conversations for context enrichment
      let similarContext = ''
      try {
        const similar = await this.searchConversations(conversation.title, 3)
        if (similar.length > 0) {
          similarContext = `\n\nSimilar past conversations for context:\n${similar.map(s => `- ${s.title}: ${s.summary}`).join('\n')}`
        }
      } catch {
        // Non-fatal — proceed without similar context
      }

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Convert this conversation into a structured plan. Return valid JSON with this structure:
{
  "title": "string",
  "summary": "string",
  "type": "feature" | "improvement" | "bugfix",
  "phases": [
    {
      "name": "string",
      "description": "string",
      "stories": [
        {
          "title": "string",
          "description": "string",
          "acceptance_criteria": ["string"]
        }
      ]
    }
  ]
}${similarContext}`,
          },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
      })

      const planJson = JSON.parse(response.choices[0]?.message?.content ?? '{}')
      const planId = crypto.randomUUID()

      // Store the plan as a JSON artifact in the conversation
      await db
        .update(chatConversations)
        .set({
          messages: sql`${chatConversations.messages} || ${JSON.stringify([
            {
              id: crypto.randomUUID(),
              role: 'system',
              content: `Plan "${planJson.title}" created successfully.`,
              timestamp: new Date().toISOString(),
            },
          ])}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(chatConversations.id, conversationId))

      logger.info(`Converted conversation ${conversationId} to plan: ${planJson.title}`)

      return {
        planId,
        title: planJson.title ?? conversation.title,
        ...planJson,
      }
    },
  }
}

export type ChatService = ReturnType<typeof createChatService>
