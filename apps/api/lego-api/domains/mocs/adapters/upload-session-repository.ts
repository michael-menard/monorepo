/**
 * Upload Session Repository Adapter
 * (INST-1105: AC86)
 *
 * Implements UploadSessionRepository port interface using Drizzle ORM.
 * Provides CRUD operations for the upload_sessions table.
 */

import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '@repo/database-schema'
import type { UploadSessionRepository, UploadSession } from '../ports/index.js'

type Schema = typeof schema

/**
 * Map database row to UploadSession domain type
 */
function mapRowToUploadSession(row: {
  id: string
  userId: string
  mocInstructionId: string | null
  status: string
  partSizeBytes: number
  expiresAt: Date
  originalFilename: string | null
  originalFileSize: number | null
  createdAt: Date
  updatedAt: Date
  finalizedAt: Date | null
  finalizingAt: Date | null
}): UploadSession {
  return {
    id: row.id,
    userId: row.userId,
    mocInstructionId: row.mocInstructionId,
    status: row.status as UploadSession['status'],
    partSizeBytes: row.partSizeBytes,
    expiresAt: row.expiresAt,
    originalFilename: row.originalFilename,
    originalFileSize: row.originalFileSize,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    finalizedAt: row.finalizedAt,
    finalizingAt: row.finalizingAt,
  }
}

/**
 * Create an UploadSessionRepository implementation using Drizzle
 * (INST-1105: AC86)
 */
export function createUploadSessionRepository(
  db: NodePgDatabase<Schema>,
  dbSchema: Schema,
): UploadSessionRepository {
  const { uploadSessions } = dbSchema

  return {
    /**
     * Create a new upload session
     * (INST-1105: AC46)
     */
    async create(data): Promise<UploadSession> {
      const sessionId = randomUUID()

      const [row] = await db
        .insert(uploadSessions)
        .values({
          id: sessionId,
          userId: data.userId,
          mocInstructionId: data.mocInstructionId,
          status: data.status,
          partSizeBytes: data.partSizeBytes,
          expiresAt: data.expiresAt,
          originalFilename: data.originalFilename,
          originalFileSize: data.originalFileSize,
        })
        .returning()

      return mapRowToUploadSession(row)
    },

    /**
     * Find a session by ID
     * (INST-1105: AC50)
     */
    async findById(sessionId: string): Promise<UploadSession | null> {
      const result = await db.query.uploadSessions.findFirst({
        where: eq(uploadSessions.id, sessionId),
      })

      return result ? mapRowToUploadSession(result) : null
    },

    /**
     * Find a session by ID with user ownership check
     * (INST-1105: AC49, AC51)
     */
    async findByIdAndUserId(sessionId: string, userId: string): Promise<UploadSession | null> {
      const result = await db.query.uploadSessions.findFirst({
        where: and(eq(uploadSessions.id, sessionId), eq(uploadSessions.userId, userId)),
      })

      return result ? mapRowToUploadSession(result) : null
    },

    /**
     * Mark session as completed
     * (INST-1105: AC59)
     */
    async markCompleted(sessionId: string, completedAt: Date): Promise<void> {
      await db
        .update(uploadSessions)
        .set({
          status: 'completed',
          finalizedAt: completedAt,
          updatedAt: new Date(),
        })
        .where(eq(uploadSessions.id, sessionId))
    },

    /**
     * Update session status
     */
    async updateStatus(sessionId: string, status: string): Promise<void> {
      await db
        .update(uploadSessions)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(uploadSessions.id, sessionId))
    },
  }
}
