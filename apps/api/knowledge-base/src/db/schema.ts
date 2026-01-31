/**
 * Knowledge Base Database Schema
 *
 * This schema defines tables for storing knowledge entries with vector embeddings
 * for semantic search functionality.
 *
 * IMPORTANT:
 * - VECTOR(1536) dimension is tied to OpenAI text-embedding-3-small model
 * - Changing the embedding model requires a schema migration to update the dimension
 * - See: https://platform.openai.com/docs/guides/embeddings
 *
 * @see KNOW-002 for embedding client implementation
 */

import { pgTable, text, timestamp, uuid, index, customType, jsonb } from 'drizzle-orm/pg-core'

/**
 * Custom Drizzle column type for pgvector VECTOR columns.
 *
 * This type handles serialization/deserialization between JavaScript number arrays
 * and PostgreSQL vector format.
 *
 * @example
 * // In schema definition
 * embedding: vector('embedding', { dimensions: 1536 }).notNull()
 *
 * // In queries
 * const embedding = [0.1, 0.2, ...] // 1536 floats
 * await db.insert(knowledgeEntries).values({ embedding })
 */
export const vector = customType<{
  data: number[]
  driverData: string
  config: { dimensions: number }
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    // Parse PostgreSQL vector format: [0.1,0.2,0.3,...]
    const cleaned = value.replace(/^\[|\]$/g, '')
    return cleaned.split(',').map(Number)
  },
})

/**
 * Knowledge Entries Table
 *
 * Stores knowledge content with vector embeddings for semantic search.
 * Each entry represents a piece of knowledge (e.g., a documentation section,
 * a best practice, or a workflow description).
 *
 * Roles:
 * - 'pm' - Product manager knowledge
 * - 'dev' - Developer knowledge
 * - 'qa' - QA/testing knowledge
 * - 'all' - Universal knowledge applicable to all roles
 */
export const knowledgeEntries = pgTable(
  'knowledge_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * The knowledge content text.
     * This is the human-readable content that will be displayed to users.
     */
    content: text('content').notNull(),

    /**
     * Vector embedding of the content.
     *
     * DIMENSION: 1536 (OpenAI text-embedding-3-small)
     *
     * If you change the embedding model, you MUST:
     * 1. Update this dimension to match the new model's output
     * 2. Re-generate embeddings for all existing entries
     * 3. Update the IVFFlat index (may need different lists parameter)
     *
     * Common dimensions:
     * - OpenAI text-embedding-3-small: 1536
     * - OpenAI text-embedding-3-large: 3072
     * - OpenAI text-embedding-ada-002: 1536 (legacy)
     */
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),

    /**
     * Role that this knowledge is most relevant for.
     *
     * Values: 'pm' | 'dev' | 'qa' | 'all'
     */
    role: text('role').notNull(),

    /**
     * Tags for categorization and filtering.
     *
     * Stored as TEXT[] (PostgreSQL array).
     * Examples: ['workflow', 'best-practice', 'setup']
     */
    tags: text('tags').array(),

    /** When the entry was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),

    /** When the entry was last updated */
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    /**
     * NOTE: The IVFFlat index on embedding is created in the migration SQL
     * because Drizzle doesn't natively support pgvector's IVFFlat index type.
     *
     * See: src/db/migrations/0000_initial_schema.sql for index definition.
     * Configuration: lists=100, vector_cosine_ops (cosine similarity)
     *
     * For performance tuning with larger datasets, see KNOW-007.
     */

    /** Index for filtering by role */
    roleIdx: index('knowledge_entries_role_idx').on(table.role),

    /** Index for created_at for ordering */
    createdAtIdx: index('knowledge_entries_created_at_idx').on(table.createdAt),
  }),
)

/**
 * Embedding Cache Table
 *
 * Caches embeddings by content hash to avoid redundant API calls.
 * Uses composite key of (content_hash, model) to support multiple embedding models.
 *
 * Cache strategy:
 * - Before calling OpenAI API, check if (content_hash, model) exists
 * - If exists, return cached embedding
 * - If not, generate embedding and cache it
 *
 * Model versioning:
 * - Same text with different models creates separate cache entries
 * - Enables model upgrades without cache corruption
 * - Model version changes trigger cache miss (correct behavior)
 *
 * @see KNOW-002 for embedding client implementation with caching
 */
export const embeddingCache = pgTable(
  'embedding_cache',
  {
    /**
     * Unique ID for each cache entry
     */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * SHA-256 hash of the content.
     *
     * Example: 'a7ffc6f8bf1ed766...'
     */
    contentHash: text('content_hash').notNull(),

    /**
     * Embedding model used to generate this embedding.
     *
     * Examples: 'text-embedding-3-small', 'text-embedding-3-large'
     *
     * This is part of the composite unique constraint with content_hash
     * to support multiple models for the same content.
     */
    model: text('model').notNull(),

    /**
     * Cached vector embedding.
     *
     * Dimension: 1536 (for text-embedding-3-small)
     * Note: Different models may have different dimensions
     */
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),

    /** When the cache entry was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    /**
     * Composite index on (content_hash, model) for fast lookups
     * Note: The UNIQUE constraint is created in the migration SQL
     * because Drizzle doesn't natively support .unique() on composite indexes
     *
     * See: src/db/migrations/0001_add_model_to_embedding_cache.sql
     */
    contentModelIdx: index('embedding_cache_content_model_idx').on(table.contentHash, table.model),
  }),
)

/**
 * Audit Log Table
 *
 * Stores audit trail of all knowledge entry modifications (add, update, delete).
 * Used for compliance, debugging, and operational transparency.
 *
 * Design decisions:
 * - entry_id uses ON DELETE SET NULL to preserve audit history after entry deletion
 * - previous_value and new_value store JSONB snapshots (embedding excluded)
 * - user_context stores MCP session metadata when available
 *
 * @see KNOW-018 for audit logging requirements
 */
export const auditLog = pgTable(
  'audit_log',
  {
    /** Unique identifier for the audit log entry */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * ID of the knowledge entry being audited.
     *
     * Nullable because:
     * - ON DELETE SET NULL preserves audit history after entry deletion
     * - Allows audit log to outlive the entry for compliance requirements
     */
    entryId: uuid('entry_id').references(() => knowledgeEntries.id, { onDelete: 'set null' }),

    /**
     * Type of operation performed.
     *
     * Values: 'add' | 'update' | 'delete'
     */
    operation: text('operation').notNull(),

    /**
     * Entry state before the operation.
     *
     * - null for 'add' operations (no previous state)
     * - JSONB snapshot for 'update' and 'delete' operations
     * - Embedding vectors are excluded (too large)
     */
    previousValue: jsonb('previous_value'),

    /**
     * Entry state after the operation.
     *
     * - JSONB snapshot for 'add' and 'update' operations
     * - null for 'delete' operations (no new state)
     * - Embedding vectors are excluded (too large)
     */
    newValue: jsonb('new_value'),

    /**
     * When the operation occurred.
     *
     * UTC timestamp for consistent ordering and retention policy.
     */
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

    /**
     * MCP session context.
     *
     * Stores available metadata:
     * - correlation_id (for request tracing)
     * - client info (if available from MCP)
     * - session metadata
     */
    userContext: jsonb('user_context'),

    /** When the audit log entry was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    /** Index for querying audit history by entry */
    entryIdIdx: index('audit_log_entry_id_idx').on(table.entryId),

    /** Index for time range queries and retention cleanup */
    timestampIdx: index('audit_log_timestamp_idx').on(table.timestamp),

    /** Composite index for sorted history retrieval by entry */
    entryTimestampIdx: index('audit_log_entry_timestamp_idx').on(table.entryId, table.timestamp),
  }),
)

// Export table types for use in queries
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect
export type NewKnowledgeEntry = typeof knowledgeEntries.$inferInsert
export type EmbeddingCacheEntry = typeof embeddingCache.$inferSelect
export type NewEmbeddingCacheEntry = typeof embeddingCache.$inferInsert
export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
