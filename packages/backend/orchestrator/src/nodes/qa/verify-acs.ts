/**
 * QA verify-acs node
 *
 * Iterates evidence.acceptance_criteria; for each AC calls ModelClient.callModel() with
 * AC_VERIFICATION_PROMPT_V1 constant (named export, contains anti-hallucination instruction).
 * Parses structured JSON response { status, cited_evidence, reasoning }.
 * Model failure per AC → BLOCKED (not FAIL), continues remaining ACs.
 * Uses createToolNode factory. Logs qa_ac_verification_started and qa_ac_verified per AC.
 *
 * AC-6: PASS/FAIL/BLOCKED paths, model failure per AC = BLOCKED, continues remaining ACs
 * AC-7: AC_VERIFICATION_PROMPT_V1 anti-hallucination instruction
 * AC-16: Lifecycle logging
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import type { ModelClient, QAGraphState, AcVerificationResult } from '../../graphs/qa.js'

/**
 * Anti-hallucination prompt for AC verification.
 * AC-7: MUST contain anti-hallucination instruction to prevent model fabrication.
 *
 * This prompt instructs the model to only cite evidence that is EXPLICITLY present
 * in the provided evidence bundle. Do NOT infer, assume, or fabricate evidence.
 */
export const AC_VERIFICATION_PROMPT_V1 = `You are a precise QA verification agent. Your task is to verify whether an Acceptance Criterion (AC) is satisfied by the provided evidence.

ANTI-HALLUCINATION INSTRUCTION: You MUST only cite evidence that is EXPLICITLY present in the evidence bundle provided below. Do NOT infer, assume, guess, or fabricate evidence. If you cannot find explicit evidence for an AC, you MUST return status "FAIL" or "BLOCKED", not "PASS". Never make up test names, file names, or outcomes that are not in the evidence.

AC TO VERIFY:
{AC_ID}: {AC_TEXT}

EVIDENCE BUNDLE:
{EVIDENCE}

Respond with a JSON object (no markdown, no code block) in exactly this format:
{
  "status": "PASS" | "FAIL" | "BLOCKED",
  "cited_evidence": "exact quote or reference from the evidence bundle, or null if none found",
  "reasoning": "brief explanation of your determination"
}

Rules:
- "PASS": Evidence EXPLICITLY and DIRECTLY demonstrates the AC is satisfied
- "FAIL": Evidence is present but does NOT demonstrate the AC is satisfied
- "BLOCKED": Evidence is missing, unclear, or you cannot determine status from available evidence
- If you are uncertain, choose "BLOCKED" not "PASS"
`

/**
 * Schema for the model's AC verification response.
 */
const AcVerificationResponseSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  cited_evidence: z.string().nullable().optional(),
  reasoning: z.string().optional(),
})

/**
 * Creates the verify-acs node.
 *
 * @param modelClient - Injected model client for testability
 */
export function createVerifyAcsNode(modelClient: ModelClient) {
  return createToolNode('qa_verify_acs', async (state: GraphState): Promise<any> => {
    const qaState = state as unknown as QAGraphState
    const storyId = qaState.config?.storyId ?? 'unknown'
    const evidence = qaState.evidence

    if (!evidence) {
      logger.warn('qa_ac_verification_skipped', {
        storyId,
        stage: 'qa',
        event: 'ac_verification_skipped',
        reason: 'evidence is null',
      })
      return {
        acVerifications: [],
        warnings: ['AC verification skipped: evidence is null'],
      }
    }

    const acList = evidence.acceptance_criteria
    const verifications: AcVerificationResult[] = []

    // Serialize evidence for the prompt
    const evidenceText = JSON.stringify(
      {
        story_id: evidence.story_id,
        acceptance_criteria: evidence.acceptance_criteria,
        touched_files: evidence.touched_files,
        commands_run: evidence.commands_run,
        test_summary: evidence.test_summary,
        notable_decisions: evidence.notable_decisions,
      },
      null,
      2,
    )

    for (const acEvidence of acList) {
      const acId = acEvidence.ac_id
      const acText = acEvidence.ac_text ?? acId

      logger.info('qa_ac_verification_started', {
        storyId,
        stage: 'qa',
        event: 'ac_verification_started',
        acId,
      })

      try {
        const prompt = AC_VERIFICATION_PROMPT_V1.replace('{AC_ID}', acId)
          .replace('{AC_TEXT}', acText)
          .replace('{EVIDENCE}', evidenceText)

        const rawResponse = await modelClient.callModel(prompt)

        // Parse JSON response - strip markdown if present
        let jsonStr = rawResponse.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
        }

        const parsed = AcVerificationResponseSchema.safeParse(JSON.parse(jsonStr))

        if (!parsed.success) {
          // Model returned invalid JSON structure → BLOCKED
          logger.warn('qa_ac_verified', {
            storyId,
            stage: 'qa',
            event: 'ac_verified',
            acId,
            status: 'BLOCKED',
            reason: 'invalid response structure',
          })
          verifications.push({
            ac_id: acId,
            status: 'BLOCKED',
            reasoning: `Model returned invalid response structure: ${parsed.error.message}`,
          })
          continue
        }

        const { status, cited_evidence, reasoning } = parsed.data

        logger.info('qa_ac_verified', {
          storyId,
          stage: 'qa',
          event: 'ac_verified',
          acId,
          status,
        })

        verifications.push({
          ac_id: acId,
          status,
          cited_evidence: cited_evidence ?? undefined,
          reasoning: reasoning ?? undefined,
        })
      } catch (err) {
        // Model failure → BLOCKED (not FAIL), continue remaining ACs
        const errMsg = err instanceof Error ? err.message : String(err)
        logger.warn('qa_ac_verified', {
          storyId,
          stage: 'qa',
          event: 'ac_verified',
          acId,
          status: 'BLOCKED',
          reason: `model call failed: ${errMsg}`,
        })
        verifications.push({
          ac_id: acId,
          status: 'BLOCKED',
          reasoning: `Model call failed: ${errMsg}`,
        })
      }
    }

    return {
      acVerifications: verifications,
    }
  })
}
