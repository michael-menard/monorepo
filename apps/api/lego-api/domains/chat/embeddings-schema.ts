import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { chatConversations } from './schema.js'
import { sql } from 'drizzle-orm'

// Note: The vector column type isn't natively supported by drizzle-orm.
// We create the table via raw SQL migration, but define the non-vector columns here
// for type-safe selects on non-vector fields.

export const chatConversationEmbeddings = pgTable(
  'chat_conversation_embeddings',
  {
    conversationId: uuid('conversation_id')
      .primaryKey()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    summaryText: text('summary_text').notNull(),
    model: text('model').notNull().default('text-embedding-3-small'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
)

/**
 * Raw SQL to create the embeddings table with the vector column.
 * Run this as a migration or during app startup.
 */
export const CREATE_EMBEDDINGS_TABLE_SQL = sql`
  CREATE TABLE IF NOT EXISTS chat_conversation_embeddings (
    conversation_id UUID PRIMARY KEY REFERENCES chat_conversations(id) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL,
    summary_text TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_chat_conv_embeddings_ivfflat
    ON chat_conversation_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
`
