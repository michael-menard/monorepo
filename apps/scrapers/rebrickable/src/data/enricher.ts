import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { getDbClient } from '../db/client.js'
import { instructions, parts, instructionParts } from '../db/schema.js'
import type { EnrichmentSummary } from '../__types__/index.js'

export async function enrichScrapeRun(scrapeRunId: string): Promise<EnrichmentSummary> {
  const db = getDbClient()

  // Fetch all instructions for this run
  const allInstructions = await db
    .select()
    .from(instructions)
    .where(eq(instructions.scrapeRunId, scrapeRunId))

  // Fetch all parts linked to these instructions via the join table
  const instructionIds = allInstructions.map(i => i.id)
  const allLinkedParts: Array<{
    partNumber: string
    name: string
    color: string
    quantity: number
    instructionId: string
  }> = []

  for (const instId of instructionIds) {
    const rows = await db
      .select({
        partNumber: parts.partNumber,
        name: parts.name,
        color: parts.color,
        quantity: instructionParts.quantity,
        instructionId: instructionParts.instructionId,
      })
      .from(instructionParts)
      .innerJoin(parts, eq(instructionParts.partId, parts.id))
      .where(eq(instructionParts.instructionId, instId))
    allLinkedParts.push(...rows)
  }

  // Compute unique parts
  const partMap = new Map<string, { partNumber: string; name: string; appearances: Set<string>; totalQuantity: number }>()

  for (const part of allLinkedParts) {
    const key = `${part.partNumber}|${part.color}`
    const existing = partMap.get(key)
    if (existing) {
      existing.appearances.add(part.instructionId)
      existing.totalQuantity += part.quantity
    } else {
      partMap.set(key, {
        partNumber: part.partNumber,
        name: part.name,
        appearances: new Set([part.instructionId]),
        totalQuantity: part.quantity,
      })
    }
  }

  // Most common parts (by appearance count)
  const mostCommonParts = Array.from(partMap.values())
    .sort((a, b) => b.appearances.size - a.appearances.size)
    .slice(0, 20)
    .map(p => ({
      partNumber: p.partNumber,
      name: p.name,
      appearances: p.appearances.size,
      totalQuantity: p.totalQuantity,
    }))

  // Color distribution
  const colorDistribution: Record<string, number> = {}
  for (const part of allLinkedParts) {
    const color = part.color || 'Unknown'
    colorDistribution[color] = (colorDistribution[color] || 0) + part.quantity
  }

  const totalPartQuantity = allLinkedParts.reduce((sum, p) => sum + p.quantity, 0)

  const summary: EnrichmentSummary = {
    totalInstructions: allInstructions.length,
    totalUniqueParts: partMap.size,
    totalPartQuantity,
    mostCommonParts,
    colorDistribution,
  }

  logger.info('[enricher] Enrichment complete', {
    instructions: summary.totalInstructions,
    uniqueParts: summary.totalUniqueParts,
    totalParts: summary.totalPartQuantity,
  })

  return summary
}
