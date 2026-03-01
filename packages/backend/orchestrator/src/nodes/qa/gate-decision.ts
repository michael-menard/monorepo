/**
 * QA gate-decision node
 *
 * Aggregates acVerifications and testResults; calls Claude (gate model) via ModelClient
 * with structured QA state summary; parses { verdict, blocking_issues, reasoning };
 * sets state.qaVerdict and state.gateDecision; model failure → BLOCKED;
 * uses createToolNode factory with NodeCircuitBreaker for gate model calls;
 * calls qaPassedSuccessfully() before returning PASS; logs qa_gate_decision.
 *
 * AC-8: PASS aggregate, FAIL aggregate, model failure = BLOCKED
 * AC-12: qaPassedSuccessfully() invoked before PASS returned; all checks encoded
 * AC-16: Lifecycle logging
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createNode } from '../../runner/node-factory.js'
import { NodeCircuitBreaker } from '../../runner/circuit-breaker.js'
import type { GraphState } from '../../state/index.js'
import { qaPassedSuccessfully, createQaVerify, addAcVerification, calculateVerdict } from '../../artifacts/qa-verify.js'
import type { ModelClient, QAGraphState, QAGraphConfig, GateDecisionData } from '../../graphs/qa.js'

/**
 * Schema for the gate model response.
 */
const GateResponseSchema = z.object({
  verdict: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  blocking_issues: z.string(),
  reasoning: z.string(),
})

/**
 * Creates the gate-decision node.
 *
 * @param modelClient - Injected model client
 * @param config - QA graph configuration
 */
export function createGateDecisionNode(modelClient: ModelClient, config: QAGraphConfig) {
  // Circuit breaker for gate model calls
  const circuitBreaker = new NodeCircuitBreaker({
    failureThreshold: 3,
    recoveryTimeoutMs: 60000,
  })

  return createNode(
    {
      name: 'qa_gate_decision',
      retry: {
        maxAttempts: 2,
        backoffMs: 500,
        backoffMultiplier: 2,
        maxBackoffMs: 10000,
        timeoutMs: config.nodeTimeoutMs,
        jitterFactor: 0.25,
      },
    },
    async (state: GraphState): Promise<any> => {
      const qaState = state as unknown as QAGraphState
      const storyId = config.storyId
      const startTime = Date.now()

      logger.info('qa_gate_decision', {
        storyId,
        stage: 'qa',
        event: 'gate_decision_started',
        acCount: qaState.acVerifications.length,
      })

      // Check circuit breaker
      if (!circuitBreaker.canExecute()) {
        const durationMs = Date.now() - startTime
        logger.warn('qa_gate_decision', {
          storyId,
          stage: 'qa',
          event: 'gate_decision_circuit_open',
          durationMs,
        })
        return {
          qaVerdict: 'BLOCKED',
          gateDecision: {
            verdict: 'BLOCKED',
            blocking_issues: 'Gate model circuit breaker is open',
            reasoning: 'Too many recent gate model failures',
          },
          warnings: ['Gate decision BLOCKED: circuit breaker is open'],
        }
      }

      // Build state summary for the gate model
      const unitVerdictSummary = qaState.unitTestVerdict
        ? `Unit tests: ${qaState.unitTestVerdict}`
        : 'Unit tests: NOT RUN'

      const e2eVerdictSummary = config.enableE2e
        ? qaState.e2eVerdict
          ? `E2E tests: ${qaState.e2eVerdict} (${qaState.playwrightAttempts.length} attempt(s))`
          : 'E2E tests: NOT RUN'
        : 'E2E tests: SKIPPED (disabled)'

      const acSummaryLines = qaState.acVerifications.map(
        ac => `  - ${ac.ac_id}: ${ac.status}${ac.reasoning ? ` (${ac.reasoning.slice(0, 100)})` : ''}`,
      )

      const stateSummary = [
        `Story: ${storyId}`,
        '',
        'TEST RESULTS:',
        unitVerdictSummary,
        e2eVerdictSummary,
        '',
        'ACCEPTANCE CRITERIA VERIFICATIONS:',
        ...acSummaryLines,
      ].join('\n')

      const prompt = `You are a QA gate decision agent. Review the following QA results and make a final verdict.

QA STATE SUMMARY:
${stateSummary}

Based on these results, provide your gate decision as a JSON object (no markdown):
{
  "verdict": "PASS" | "FAIL" | "BLOCKED",
  "blocking_issues": "comma-separated list of blocking issues, or 'none' if PASS",
  "reasoning": "brief explanation of decision"
}

Rules:
- PASS: All ACs verified as PASS, tests pass, no blocking issues
- FAIL: One or more ACs FAIL, or unit tests FAIL
- BLOCKED: Cannot determine (model failures, missing data, circuit open)
`

      try {
        const rawResponse = await modelClient.callModel(prompt, { model: config.gateModel })
        circuitBreaker.recordSuccess()

        // Parse JSON response
        let jsonStr = rawResponse.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
        }

        const parsed = GateResponseSchema.safeParse(JSON.parse(jsonStr))

        if (!parsed.success) {
          circuitBreaker.recordFailure()
          const durationMs = Date.now() - startTime
          logger.warn('qa_gate_decision', {
            storyId,
            stage: 'qa',
            event: 'gate_decision_parse_error',
            durationMs,
          })
          return {
            qaVerdict: 'BLOCKED',
            gateDecision: {
              verdict: 'BLOCKED',
              blocking_issues: 'Gate model response could not be parsed',
              reasoning: `Parse error: ${parsed.error.message}`,
            },
            warnings: ['Gate decision BLOCKED: invalid response from model'],
          }
        }

        const gateData: GateDecisionData = parsed.data

        // Before finalizing PASS, run qaPassedSuccessfully() check (AC-12)
        if (gateData.verdict === 'PASS') {
          // Build a temporary QaVerify to run the check
          let tempQa = createQaVerify(storyId)

          // Populate with AC verifications
          for (const acVerif of qaState.acVerifications) {
            tempQa = addAcVerification(tempQa, {
              ac_id: acVerif.ac_id,
              status: acVerif.status,
              evidence_ref: acVerif.cited_evidence,
              notes: acVerif.reasoning,
            })
          }

          tempQa = {
            ...tempQa,
            verdict: calculateVerdict(tempQa),
            tests_executed: qaState.unitTestResult !== null,
            architecture_compliant: true,
          }

          if (!qaPassedSuccessfully(tempQa)) {
            // qaPassedSuccessfully failed - downgrade to FAIL
            gateData.verdict = 'FAIL'
            gateData.blocking_issues =
              (gateData.blocking_issues === 'none' ? '' : gateData.blocking_issues + '; ') +
              'qaPassedSuccessfully() check failed'
          }
        }

        const durationMs = Date.now() - startTime
        logger.info('qa_gate_decision', {
          storyId,
          stage: 'qa',
          event: 'gate_decision_complete',
          verdict: gateData.verdict,
          durationMs,
        })

        return {
          qaVerdict: gateData.verdict,
          gateDecision: gateData,
        }
      } catch (err) {
        circuitBreaker.recordFailure()
        const errMsg = err instanceof Error ? err.message : String(err)
        const durationMs = Date.now() - startTime

        logger.warn('qa_gate_decision', {
          storyId,
          stage: 'qa',
          event: 'gate_decision_model_failure',
          reason: errMsg,
          durationMs,
        })

        return {
          qaVerdict: 'BLOCKED',
          gateDecision: {
            verdict: 'BLOCKED',
            blocking_issues: `Gate model call failed: ${errMsg}`,
            reasoning: `Model failure: ${errMsg}`,
          },
          warnings: [`Gate decision BLOCKED: model call failed: ${errMsg}`],
        }
      }
    },
  )
}
