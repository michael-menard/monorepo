/**
 * QA evidence-judge node
 *
 * Classifies evidence items as STRONG/WEAK, derives per-AC verdicts
 * (ACCEPT/CHALLENGE/REJECT), and writes ac-verdict.json.
 *
 * AC-1: createEvidenceJudgeNode() factory using createToolNode
 * AC-5: 4-phase logic: load evidence, classify items per AC, derive verdicts, write file
 * AC-6: Null evidence handling — return FAIL with warnings, don't throw
 * AC-7: File write: path.join(qaState.config.worktreeDir, '_implementation', 'ac-verdict.json')
 * AC-8: Return shape: { acVerdictResult, warnings }
 */

import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  classifyEvidenceStrength,
  deriveAcVerdict,
  deriveOverallVerdict,
  AcVerdictResultSchema,
  OverallVerdictSchema,
} from '@repo/workflow-logic'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import type { QAGraphState } from '../../graphs/qa.js'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for a single AC verdict in the output file.
 */
export const AcVerdictOutputSchema = AcVerdictResultSchema

/**
 * Schema for the full ac-verdict.json output.
 */
export const EvidenceJudgeOutputSchema = z.object({
  story_id: z.string(),
  generated_at: z.string().datetime(),
  overall_verdict: OverallVerdictSchema,
  ac_verdicts: z.array(AcVerdictOutputSchema),
  total_acs: z.number().int().min(0),
  accepted: z.number().int().min(0),
  challenged: z.number().int().min(0),
  rejected: z.number().int().min(0),
})

export type EvidenceJudgeOutput = z.infer<typeof EvidenceJudgeOutputSchema>

// ============================================================================
// Node factory
// ============================================================================

/**
 * Creates the evidence-judge node.
 *
 * 4-phase logic:
 *   Phase 1: Load evidence from QA state
 *   Phase 2: Classify each evidence item per AC as STRONG/WEAK
 *   Phase 3: Derive per-AC verdicts (ACCEPT/CHALLENGE/REJECT)
 *   Phase 4: Compute overall verdict and write ac-verdict.json
 *
 * AC-1: Uses createToolNode factory with exactly 2 args
 * AC-6: Null evidence → return FAIL output without throwing
 */
export function createEvidenceJudgeNode() {
  return createToolNode('qa_evidence_judge', async (state: GraphState): Promise<any> => {
    const qaState = state as unknown as QAGraphState
    const storyId = qaState.config?.storyId ?? qaState.storyId ?? 'unknown'

    logger.info('qa_evidence_judge_started', {
      storyId,
      stage: 'qa',
      event: 'qa_evidence_judge_started',
    })

    const evidence = qaState.evidence

    // Phase 1: Null evidence handling — return FAIL with warnings, don't throw (AC-6)
    if (!evidence) {
      logger.warn('qa_evidence_judge_no_evidence', {
        storyId,
        stage: 'qa',
        event: 'qa_evidence_judge_no_evidence',
        reason: 'evidence is null',
      })

      const output: EvidenceJudgeOutput = {
        story_id: storyId,
        generated_at: new Date().toISOString(),
        overall_verdict: 'FAIL',
        ac_verdicts: [],
        total_acs: 0,
        accepted: 0,
        challenged: 0,
        rejected: 0,
      }

      await writeAcVerdictFile(qaState, output)

      logger.info('qa_evidence_judge_complete', {
        storyId,
        stage: 'qa',
        event: 'qa_evidence_judge_complete',
        overall_verdict: 'FAIL',
        total_acs: 0,
      })

      return {
        acVerdictResult: output,
        warnings: ['Evidence judge: evidence is null — cannot evaluate ACs'],
      }
    }

    // Phase 2: Classify evidence items per AC
    const acList = evidence.acceptance_criteria
    const acVerdicts: z.infer<typeof AcVerdictOutputSchema>[] = []

    for (const acEvidence of acList) {
      const acId = acEvidence.ac_id
      const acText = acEvidence.ac_text ?? acId
      const items = acEvidence.evidence_items ?? []

      let strongCount = 0
      let weakCount = 0

      for (const item of items) {
        const strength = classifyEvidenceStrength({
          type: item.type,
          path: item.path ?? null,
          command: item.command ?? null,
          result: item.result ?? null,
          description: item.description,
        })

        if (strength === 'STRONG') {
          strongCount++
        } else {
          weakCount++
        }
      }

      // Phase 3: Derive per-AC verdict
      const verdict = deriveAcVerdict(strongCount, weakCount, items.length)

      logger.info('qa_evidence_judge_ac_evaluated', {
        storyId,
        stage: 'qa',
        event: 'qa_evidence_judge_ac_evaluated',
        acId,
        verdict,
        strongCount,
        weakCount,
        totalItems: items.length,
      })

      let challengeReason: string | null = null
      let proofRequired: string | null = null

      if (verdict === 'REJECT') {
        challengeReason = 'No evidence items provided. AC cannot be verified.'
        proofRequired =
          'Provide at minimum one evidence item with type, path, and deterministic result.'
      } else if (verdict === 'CHALLENGE') {
        challengeReason = 'All evidence items are WEAK. No deterministic or verifiable proof found.'
        proofRequired =
          'Provide strong evidence: test file paths with pass counts, commands with deterministic results, or E2E results with file paths.'
      }

      acVerdicts.push({
        ac_id: acId,
        ac_text: acText,
        verdict,
        evidence_evaluated: items.length,
        strong_evidence_count: strongCount,
        weak_evidence_count: weakCount,
        challenge_reason: challengeReason,
        proof_required: proofRequired,
      })
    }

    // Phase 4: Compute overall verdict and write output
    const verdictValues = acVerdicts.map(v => v.verdict)
    const overallVerdict = deriveOverallVerdict(verdictValues)

    const accepted = acVerdicts.filter(v => v.verdict === 'ACCEPT').length
    const challenged = acVerdicts.filter(v => v.verdict === 'CHALLENGE').length
    const rejected = acVerdicts.filter(v => v.verdict === 'REJECT').length

    const output: EvidenceJudgeOutput = {
      story_id: storyId,
      generated_at: new Date().toISOString(),
      overall_verdict: overallVerdict,
      ac_verdicts: acVerdicts,
      total_acs: acVerdicts.length,
      accepted,
      challenged,
      rejected,
    }

    await writeAcVerdictFile(qaState, output)

    logger.info('qa_evidence_judge_complete', {
      storyId,
      stage: 'qa',
      event: 'qa_evidence_judge_complete',
      overall_verdict: overallVerdict,
      total_acs: acVerdicts.length,
      accepted,
      challenged,
      rejected,
    })

    return {
      acVerdictResult: output,
      warnings: [],
    }
  })
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Writes the ac-verdict.json file to the story's _implementation directory.
 * Creates the directory if it doesn't exist.
 * AC-7: File write path: {worktreeDir}/_implementation/ac-verdict.json
 */
async function writeAcVerdictFile(
  qaState: QAGraphState,
  output: EvidenceJudgeOutput,
): Promise<void> {
  const worktreeDir = qaState.config?.worktreeDir
  if (!worktreeDir) {
    logger.warn('qa_evidence_judge_no_worktree', {
      stage: 'qa',
      event: 'qa_evidence_judge_no_worktree',
      reason: 'worktreeDir not set in config — skipping file write',
    })
    return
  }

  const outputDir = path.join(worktreeDir, '_implementation')
  const outputPath = path.join(outputDir, 'ac-verdict.json')

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8')
}
