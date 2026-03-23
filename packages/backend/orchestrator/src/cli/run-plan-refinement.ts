#!/usr/bin/env tsx
/**
 * run-plan-refinement CLI
 *
 * Runs the plan-refinement LangGraph for a given plan slug.
 * Wires the CLI decision callback adapter for interactive HiTL prompts.
 *
 * AC-1: Bridge adapter wired into createPlanRefinementGraph
 * AC-2: CLI prompt format with plan slug, flows, warnings, errors
 *
 * Usage:
 *   npx tsx packages/backend/orchestrator/src/cli/run-plan-refinement.ts --plan-slug <slug>
 *   npx tsx packages/backend/orchestrator/src/cli/run-plan-refinement.ts --help
 *
 * Environment:
 *   MCP_KB_URL - Knowledge base MCP server URL (required for production use)
 *
 * INJECTION POINTS:
 *   planLoader - stub until MCP client is wired
 *
 * @see APRS-5040 AC-1, AC-2
 */

import { logger } from '@repo/logger'
import { createPlanRefinementGraph } from '../graphs/plan-refinement.js'
import { createCLIDecisionCallbackAdapter } from '../adapters/plan-refinement/cli-decision-callback-adapter.js'
import type { PlanLoaderFn } from '../nodes/plan-refinement/normalize-plan.js'

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(args: string[]): { planSlug?: string; help: boolean } {
  const result: { planSlug?: string; help: boolean } = { help: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      result.help = true
    } else if (arg === '--plan-slug' && args[i + 1]) {
      result.planSlug = args[i + 1]
      i++ // skip value
    }
  }

  return result
}

function printHelp(): void {
  process.stdout.write(`
run-plan-refinement — Run the plan-refinement LangGraph for a given plan slug

USAGE
  npx tsx run-plan-refinement.ts --plan-slug <slug>

OPTIONS
  --plan-slug <slug>   Plan slug to run refinement for (required).
  --help, -h           Print this help message.

ENVIRONMENT
  MCP_KB_URL           Knowledge base MCP server URL. Required for production use.
                       Example: http://localhost:3002

OUTPUT
  [run-plan-refinement] plan_slug: <slug>
  [run-plan-refinement] refinement_phase: <phase>
  [run-plan-refinement] hitl_decision: <decision>
  [run-plan-refinement] COMPLETE | FAILED: <reason>

EXIT CODES
  0   Graph completed successfully (approve/defer).
  1   Error: plan not found, KB unavailable, graph failure, or reject decision.

`)
}

// ============================================================================
// Stub Implementations (used until MCP client is wired)
// ============================================================================

/**
 * INJECTION POINT: planLoader
 * Replace with actual MCP client call to kb_get_plan.
 */
const stubPlanLoader: PlanLoaderFn = async planSlug => {
  logger.warn('run-plan-refinement: using stub planLoader — replace with MCP client', {
    planSlug,
  })
  process.stdout.write(`[run-plan-refinement] WARN: stub planLoader called for ${planSlug}\n`)
  return null
}

// ============================================================================
// Refinement Logic
// ============================================================================

/**
 * Runs the plan-refinement graph for the given plan slug.
 *
 * AC-1: Wires createCLIDecisionCallbackAdapter into createPlanRefinementGraph.
 * AC-2: CLI output shows plan slug, refinement phase, HiTL decision, errors.
 */
async function runPlanRefinement(planSlug: string): Promise<void> {
  logger.info('run-plan-refinement: starting', { planSlug })
  process.stdout.write(`[run-plan-refinement] plan_slug: ${planSlug}\n`)

  // Wire CLI decision callback adapter (AC-1)
  const decisionCallback = createCLIDecisionCallbackAdapter()

  const graph = createPlanRefinementGraph({
    planLoader: stubPlanLoader,
    decisionCallback,
  })

  process.stdout.write(`[run-plan-refinement] running graph...\n`)

  const result = await graph.invoke({ planSlug })

  process.stdout.write(
    `[run-plan-refinement] refinement_phase: ${result.refinementPhase}\n` +
      `[run-plan-refinement] hitl_decision: ${result.hitlDecision ?? 'none'}\n`,
  )

  if (result.warnings.length > 0) {
    process.stdout.write(`[run-plan-refinement] warnings: ${result.warnings.join('; ')}\n`)
  }

  if (result.errors.length > 0) {
    process.stdout.write(`[run-plan-refinement] errors: ${result.errors.join('; ')}\n`)
  }

  if (result.refinementPhase === 'error') {
    process.stdout.write(
      `[run-plan-refinement] FAILED: refinement_phase=error, errors=${result.errors.join('; ')}\n`,
    )
    logger.error('run-plan-refinement: graph ended in error phase', {
      planSlug,
      errors: result.errors,
    })
    process.exitCode = 1
    return
  }

  if (result.hitlDecision === 'reject') {
    process.stdout.write(`[run-plan-refinement] FAILED: hitl_decision=reject\n`)
    logger.error('run-plan-refinement: plan rejected by human reviewer', { planSlug })
    process.exitCode = 1
    return
  }

  process.stdout.write(`[run-plan-refinement] COMPLETE\n`)
  logger.info('run-plan-refinement: complete', {
    planSlug,
    refinementPhase: result.refinementPhase,
    hitlDecision: result.hitlDecision,
  })
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const parsed = parseArgs(args)

  if (parsed.help) {
    printHelp()
    return
  }

  if (!parsed.planSlug) {
    process.stderr.write('Error: --plan-slug <slug> is required\n')
    printHelp()
    process.exitCode = 1
    return
  }

  try {
    await runPlanRefinement(parsed.planSlug)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('run-plan-refinement: fatal error', { error: message })
    process.stderr.write(`Error: ${message}\n`)
    process.exitCode = 1
  }
}

main().catch(error => {
  process.stderr.write(`Unhandled error: ${String(error)}\n`)
  process.exitCode = 1
})
