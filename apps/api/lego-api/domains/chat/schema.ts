import { pgTable, uuid, text, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core'
import type { ChatMessage } from './types.js'

export const chatConversations = pgTable('chat_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default('New Chat'),
  messages: jsonb('messages').$type<ChatMessage[]>().notNull().default([]),
  summary: text('summary'),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
