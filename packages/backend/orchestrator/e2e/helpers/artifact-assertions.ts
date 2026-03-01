import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { EvidenceSchema } from '../../src/artifacts/evidence.js'
import { ReviewSchema } from '../../src/artifacts/review.js'
import { QaVerifySchema } from '../../src/artifacts/qa-verify.js'

export type Evidence = z.infer<typeof EvidenceSchema>
export type Review = z.infer<typeof ReviewSchema>
export type QaVerify = z.infer<typeof QaVerifySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Stub MergeArtifactSchema
// TODO: Replace with canonical MergeArtifactSchema from APIP-1070
// ─────────────────────────────────────────────────────────────────────────────

export const MergeArtifactSchema = z.object({
  verdict: z.string(),
  story_id: z.string(),
})

export type MergeArtifact = z.infer<typeof MergeArtifactSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function readYamlFile(filePath: string): Promise<unknown> {
  const content = await fs.readFile(filePath, 'utf-8')
  return yaml.parse(content)
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertion Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read EVIDENCE.yaml from storyDir and validate against EvidenceSchema.
 * Throws ZodError if validation fails, throws ENOENT error if file missing.
 */
export async function assertEvidenceArtifact(storyDir: string): Promise<Evidence> {
  const filePath = path.join(storyDir, '_implementation', 'EVIDENCE.yaml')
  logger.info('[assertEvidenceArtifact] Reading artifact', { filePath })

  const raw = await readYamlFile(filePath)
  const parsed = EvidenceSchema.parse(raw)

  logger.info('[assertEvidenceArtifact] Artifact valid', { story_id: parsed.story_id })
  return parsed
}

/**
 * Read REVIEW.yaml from storyDir and validate against ReviewSchema.
 * Throws ZodError if validation fails, throws ENOENT error if file missing.
 */
export async function assertReviewArtifact(storyDir: string): Promise<Review> {
  const filePath = path.join(storyDir, '_implementation', 'REVIEW.yaml')
  logger.info('[assertReviewArtifact] Reading artifact', { filePath })

  const raw = await readYamlFile(filePath)
  const parsed = ReviewSchema.parse(raw)

  logger.info('[assertReviewArtifact] Artifact valid', { story_id: parsed.story_id, verdict: parsed.verdict })
  return parsed
}

/**
 * Read QA-VERIFY.yaml from storyDir and validate against QaVerifySchema.
 * Throws ZodError if validation fails, throws ENOENT error if file missing.
 */
export async function assertQaVerifyArtifact(storyDir: string): Promise<QaVerify> {
  const filePath = path.join(storyDir, '_implementation', 'QA-VERIFY.yaml')
  logger.info('[assertQaVerifyArtifact] Reading artifact', { filePath })

  const raw = await readYamlFile(filePath)
  const parsed = QaVerifySchema.parse(raw)

  logger.info('[assertQaVerifyArtifact] Artifact valid', { story_id: parsed.story_id, verdict: parsed.verdict })
  return parsed
}

/**
 * Read MERGE.yaml from storyDir and validate against stub MergeArtifactSchema.
 * Throws ZodError if validation fails, throws ENOENT error if file missing.
 *
 * TODO: Replace with canonical MergeArtifactSchema from APIP-1070
 */
export async function assertMergeArtifact(storyDir: string): Promise<MergeArtifact> {
  const filePath = path.join(storyDir, '_implementation', 'MERGE.yaml')
  logger.info('[assertMergeArtifact] Reading artifact', { filePath })

  const raw = await readYamlFile(filePath)
  const parsed = MergeArtifactSchema.parse(raw)

  logger.info('[assertMergeArtifact] Artifact valid', { story_id: parsed.story_id, verdict: parsed.verdict })
  return parsed
}
