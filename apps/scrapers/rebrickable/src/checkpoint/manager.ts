import { eq, and, desc } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { getDbClient } from '../db/client.js'
import { scrapeCheckpoints, scrapeRuns } from '../db/schema.js'
import type { CheckpointPhase } from '../__types__/index.js'

export class CheckpointManager {
  private readonly db = getDbClient()
  private readonly scrapeRunId: string

  constructor(scrapeRunId: string) {
    this.scrapeRunId = scrapeRunId
  }

  async save(
    mocNumber: string,
    phase: CheckpointPhase,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await this.db.insert(scrapeCheckpoints).values({
      scrapeRunId: this.scrapeRunId,
      mocNumber,
      phase,
      scrapedData: data,
    })

    logger.info(`[checkpoint] MOC-${mocNumber} → ${phase}`)
  }

  async getPhase(mocNumber: string): Promise<CheckpointPhase | null> {
    const results = await this.db
      .select()
      .from(scrapeCheckpoints)
      .where(
        and(
          eq(scrapeCheckpoints.scrapeRunId, this.scrapeRunId),
          eq(scrapeCheckpoints.mocNumber, mocNumber),
        ),
      )
      .orderBy(desc(scrapeCheckpoints.createdAt))
      .limit(1)

    return (results[0]?.phase as CheckpointPhase) ?? null
  }

  async getData(mocNumber: string): Promise<Record<string, unknown> | null> {
    const results = await this.db
      .select()
      .from(scrapeCheckpoints)
      .where(
        and(
          eq(scrapeCheckpoints.scrapeRunId, this.scrapeRunId),
          eq(scrapeCheckpoints.mocNumber, mocNumber),
        ),
      )
      .orderBy(desc(scrapeCheckpoints.createdAt))
      .limit(1)

    return (results[0]?.scrapedData as Record<string, unknown>) ?? null
  }

  async isCompleted(mocNumber: string): Promise<boolean> {
    const phase = await this.getPhase(mocNumber)
    return phase === 'completed'
  }

  async getCompletedCount(): Promise<number> {
    const results = await this.db
      .select()
      .from(scrapeCheckpoints)
      .where(
        and(
          eq(scrapeCheckpoints.scrapeRunId, this.scrapeRunId),
          eq(scrapeCheckpoints.phase, 'completed'),
        ),
      )

    return results.length
  }

  static async findInterruptedRun(): Promise<{
    id: string
    startedAt: Date
    downloaded: number
    instructionsFound: number
  } | null> {
    const db = getDbClient()
    const results = await db
      .select()
      .from(scrapeRuns)
      .where(eq(scrapeRuns.status, 'interrupted'))
      .orderBy(desc(scrapeRuns.startedAt))
      .limit(1)

    if (results.length === 0) return null

    const run = results[0]
    return {
      id: run.id,
      startedAt: run.startedAt,
      downloaded: run.downloaded,
      instructionsFound: run.instructionsFound,
    }
  }

  static async findRunningRun(): Promise<string | null> {
    const db = getDbClient()
    const results = await db
      .select()
      .from(scrapeRuns)
      .where(eq(scrapeRuns.status, 'running'))
      .orderBy(desc(scrapeRuns.startedAt))
      .limit(1)

    return results[0]?.id ?? null
  }
}
