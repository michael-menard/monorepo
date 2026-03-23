/**
 * CLI Decision Callback Adapter for Plan Refinement
 *
 * Bridges the graph's DecisionCallback interface (human-review-checkpoint.ts)
 * to inquirer-based interactive terminal prompts.
 *
 * This is DIFFERENT from CLIDecisionCallback in adapters/decision-callbacks/cli-callback.ts.
 * That adapter handles generic DecisionRequest/DecisionResponse.
 * This adapter handles plan-refinement-specific DecisionContext with flow summaries,
 * warnings, errors, and confirmedFlowIds/rejectedFlowIds population.
 *
 * AC-1: Satisfies graph's DecisionCallback interface (ask(DecisionContext))
 * AC-2: Displays plan slug, flows with IDs, warnings, errors; 4 inquirer choices
 *
 * APRS-5040: ST-1
 */

import inquirer from 'inquirer'
import { logger } from '@repo/logger'
import type {
  DecisionCallback,
  DecisionContext,
} from '../../nodes/plan-refinement/human-review-checkpoint.js'
import type { HiTLDecision } from '../../state/plan-refinement-state.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Result returned by the adapter's ask() call.
 */
export type CLIDecisionResult = {
  decision: HiTLDecision
  confirmedFlowIds?: string[]
  rejectedFlowIds?: string[]
  reason?: string
}

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Creates a CLI-based DecisionCallback for the plan-refinement graph's
 * human_review_checkpoint node.
 *
 * Uses inquirer directly for interactive prompts. Handles all 4 HiTL outcomes:
 *   approve — confirms all or selected flows, proceeds to final_validation
 *   edit    — re-runs gap analysis (extract_flows)
 *   reject  — terminates graph with error
 *   defer   — terminates graph with deferred flag
 *
 * @returns An object satisfying the graph's DecisionCallback interface
 */
export function createCLIDecisionCallbackAdapter(): DecisionCallback {
  return {
    ask: async (context: DecisionContext): Promise<CLIDecisionResult> => {
      logger.info('plan-refinement CLI: presenting human review', {
        planSlug: context.planSlug,
        flowCount: context.flows.length,
        warningCount: context.warnings.length,
        errorCount: context.errors.length,
      })

      // -----------------------------------------------------------------------
      // Print plan summary header
      // -----------------------------------------------------------------------
      process.stdout.write(`\n`)
      process.stdout.write(`=== Plan Refinement Review: ${context.planSlug} ===\n`)
      process.stdout.write(`\n`)

      // -----------------------------------------------------------------------
      // Print flows
      // -----------------------------------------------------------------------
      if (context.flows.length === 0) {
        process.stdout.write(`Flows: (none)\n`)
      } else {
        process.stdout.write(`Flows (${context.flows.length}):\n`)
        for (const flow of context.flows) {
          process.stdout.write(`  [${flow.id}] ${flow.name} — Actor: ${flow.actor}\n`)
        }
      }

      // -----------------------------------------------------------------------
      // Print warnings
      // -----------------------------------------------------------------------
      if (context.warnings.length > 0) {
        process.stdout.write(`\nWarnings (${context.warnings.length}):\n`)
        for (const warning of context.warnings) {
          process.stdout.write(`  ⚠ ${warning}\n`)
        }
      }

      // -----------------------------------------------------------------------
      // Print errors
      // -----------------------------------------------------------------------
      if (context.errors.length > 0) {
        process.stdout.write(`\nErrors (${context.errors.length}):\n`)
        for (const error of context.errors) {
          process.stdout.write(`  ✗ ${error}\n`)
        }
      }

      process.stdout.write(`\n`)

      // -----------------------------------------------------------------------
      // Primary decision prompt — 4 choices
      // -----------------------------------------------------------------------
      let decisionAnswer: { decision: HiTLDecision }
      try {
        decisionAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'decision',
            message: `Review decision for plan "${context.planSlug}":`,
            choices: [
              {
                name: 'Approve — accept flows and proceed to final validation',
                value: 'approve',
              },
              {
                name: 'Edit — re-run gap analysis (returns to extract_flows)',
                value: 'edit',
              },
              {
                name: 'Reject — terminate with error',
                value: 'reject',
              },
              {
                name: 'Defer — pause for stakeholder input',
                value: 'defer',
              },
            ],
          },
        ])
      } catch (err) {
        // Ctrl+C or other interruption — default to defer
        logger.info('plan-refinement CLI: decision interrupted, defaulting to defer', {
          planSlug: context.planSlug,
        })
        return {
          decision: 'defer',
          reason: 'Decision interrupted by user',
        }
      }

      const { decision } = decisionAnswer

      // -----------------------------------------------------------------------
      // Decision-specific follow-up prompts
      // -----------------------------------------------------------------------

      if (decision === 'approve') {
        if (context.flows.length > 0) {
          return await handleApprovePrompt(context)
        }
        logger.info('plan-refinement CLI: approve with no flows', {
          planSlug: context.planSlug,
        })
        return {
          decision: 'approve',
          confirmedFlowIds: [],
          rejectedFlowIds: [],
        }
      }

      if (decision === 'reject') {
        return await handleRejectPrompt(context, 'reject')
      }

      if (decision === 'defer') {
        return await handleRejectPrompt(context, 'defer')
      }

      // edit — no follow-up needed, all flows marked as rejected for re-analysis
      logger.info('plan-refinement CLI: edit decision selected', {
        planSlug: context.planSlug,
      })
      return {
        decision: 'edit',
        confirmedFlowIds: [],
        rejectedFlowIds: context.flows.map(f => f.id),
      }
    },
  }
}

// ============================================================================
// Follow-up Prompt Helpers
// ============================================================================

/**
 * Handles the approve follow-up: asks user which flows to confirm.
 * Populates confirmedFlowIds and rejectedFlowIds.
 */
async function handleApprovePrompt(context: DecisionContext): Promise<CLIDecisionResult> {
  let flowSelectionAnswer: { confirmedFlowIds: string[] }

  try {
    flowSelectionAnswer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'confirmedFlowIds',
        message: 'Select flows to confirm (space to toggle, enter to confirm):',
        choices: context.flows.map(flow => ({
          name: `[${flow.id}] ${flow.name} — Actor: ${flow.actor}, Trigger: ${flow.trigger}`,
          value: flow.id,
          checked: true, // default: all checked
        })),
      },
    ])
  } catch (err) {
    // Ctrl+C — approve all flows by default
    logger.info('plan-refinement CLI: flow selection interrupted, approving all flows', {
      planSlug: context.planSlug,
    })
    const allFlowIds = context.flows.map(f => f.id)
    return {
      decision: 'approve',
      confirmedFlowIds: allFlowIds,
      rejectedFlowIds: [],
    }
  }

  const confirmedFlowIds = flowSelectionAnswer.confirmedFlowIds
  const allFlowIds = context.flows.map(f => f.id)
  const rejectedFlowIds = allFlowIds.filter(id => !confirmedFlowIds.includes(id))

  logger.info('plan-refinement CLI: approve decision confirmed', {
    planSlug: context.planSlug,
    confirmedFlowIds,
    rejectedFlowIds,
  })

  return {
    decision: 'approve',
    confirmedFlowIds,
    rejectedFlowIds,
  }
}

/**
 * Handles the reject/defer follow-up: asks user for a reason.
 */
async function handleRejectPrompt(
  context: DecisionContext,
  decision: 'reject' | 'defer',
): Promise<CLIDecisionResult> {
  let reasonAnswer: { reason: string }

  try {
    reasonAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'reason',
        message: `Reason for ${decision} (optional):`,
        default: '',
      },
    ])
  } catch (err) {
    // Ctrl+C — no reason provided
    logger.info(`plan-refinement CLI: ${decision} reason input interrupted`, {
      planSlug: context.planSlug,
    })
    return { decision, reason: '' }
  }

  logger.info(`plan-refinement CLI: ${decision} decision confirmed`, {
    planSlug: context.planSlug,
    reason: reasonAnswer.reason,
  })

  return {
    decision,
    reason: reasonAnswer.reason || undefined,
  }
}
