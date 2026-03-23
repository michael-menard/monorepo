import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { ChatDb } from '../db.js'

export const SimilarConversationResultSchema = z.object({
  conversationId: z.string().uuid(),
  title: z.string(),
  summary: z.string(),
  similarityScore: z.number(),
})

export type SimilarConversationResult = z.infer<typeof SimilarConversationResultSchema>

export async function findSimilarConversations(
  db: ChatDb,
  queryEmbedding: number[],
  limit = 5,
): Promise<SimilarConversationResult[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const results = await db.execute(sql`
    SELECT
      e.conversation_id AS "conversationId",
      c.title,
      e.summary_text AS summary,
      1 - (e.embedding <=> ${embeddingStr}::vector) AS "similarityScore"
    FROM chat_conversation_embeddings e
    JOIN chat_conversations c ON c.id = e.conversation_id
    WHERE c.archived = true
    ORDER BY e.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `)

  return (results.rows as SimilarConversationResult[]).filter(r => r.similarityScore > 0.1)
}
