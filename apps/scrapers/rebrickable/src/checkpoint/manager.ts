import { eq, and, desc, inArray } from 'drizzle-orm'
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

  /**
   * Find MOCs that were partially scraped (reached detail_scraped) but never
   * completed (no completed checkpoint in any run). These are MOCs where the
   * description/images were saved but the file download failed.
   *
   * Returns an array of { mocNumber, rebrickableUrl } for use as the instruction
   * list in --retry-failed mode. The rebrickableUrl is stored in the
   * detail_scraped checkpoint's scrapedData.
   */
  static async findPartialMocs(): Promise<
    Array<{ mocNumber: string; rebrickableUrl: string; title: string }>
  > {
    const db = getDbClient()

    // MOCs that have at least one detail_scraped checkpoint
    const detailScraped = await db
      .select({
        mocNumber: scrapeCheckpoints.mocNumber,
        scrapedData: scrapeCheckpoints.scrapedData,
      })
      .from(scrapeCheckpoints)
      .where(eq(scrapeCheckpoints.phase, 'detail_scraped'))
      .orderBy(desc(scrapeCheckpoints.createdAt))

    if (detailScraped.length === 0) return []

    const allMocNumbers = [...new Set(detailScraped.map(r => r.mocNumber))]

    // MOCs that have a completed checkpoint in any run
    const completedRows = await db
      .select({ mocNumber: scrapeCheckpoints.mocNumber })
      .from(scrapeCheckpoints)
      .where(
        and(
          eq(scrapeCheckpoints.phase, 'completed'),
          inArray(scrapeCheckpoints.mocNumber, allMocNumbers),
        ),
      )

    const completedSet = new Set(completedRows.map(r => r.mocNumber))

    // Keep the most recent detail_scraped checkpoint per MOC (dedup)
    const seenMoc = new Set<string>()
    const partial: Array<{ mocNumber: string; rebrickableUrl: string; title: string }> = []

    for (const row of detailScraped) {
      if (completedSet.has(row.mocNumber)) continue
      if (seenMoc.has(row.mocNumber)) continue
      seenMoc.add(row.mocNumber)

      const data = row.scrapedData as Record<string, unknown>
      const rebrickableUrl = (data.rebrickableUrl as string) || ''
      const title = (data.title as string) || `MOC-${row.mocNumber}`

      if (!rebrickableUrl) {
        logger.warn(
          `[checkpoint] MOC-${row.mocNumber} has no rebrickableUrl in checkpoint data — skipping`,
        )
        continue
      }

      partial.push({ mocNumber: row.mocNumber, rebrickableUrl, title })
    }

    return partial
  }

  async hasBackfillCompleted(mocNumber: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(scrapeCheckpoints)
      .where(
        and(
          eq(scrapeCheckpoints.mocNumber, mocNumber),
          eq(scrapeCheckpoints.phase, 'backfill_completed'),
        ),
      )
      .limit(1)

    return results.length > 0
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
