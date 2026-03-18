/**
 * Graph Loader
 *
 * Loads production graph runners from the orchestrator graphs module.
 * This module is a seam for testing — tests either:
 * 1. Inject runners directly via dispatchJob(job, data, config, runners)
 * 2. Can vi.mock('./graph-loader') if needed
 *
 * In production, this module dynamically resolves the orchestrator dist
 * so that Vite/Vitest does not perform static export analysis on the
 * orchestrator package's graph sub-paths.
 *
 * APIP-0020: Supervisor Loop (Plain TypeScript)
 */

import type {
  GraphRunners,
  RunElaborationFn,
  RunStoryCreationFn,
  RunDevImplementFn,
  RunReviewFn,
  RunQAVerifyFn,
} from './dispatch-router.js'

/**
 * Load production graph runners from the orchestrator graphs dist.
 *
 * Note: runElaboration and runStoryCreation are exported from
 * packages/backend/orchestrator/dist/graphs/index.js but are NOT
 * in the main @repo/orchestrator package exports map.
 * We resolve the path at runtime to avoid Vite's static package export validation.
 *
 * This function is ONLY called in production (never in unit tests,
 * which inject runners via the optional `runners` parameter of dispatchJob).
 */
export async function loadGraphRunners(): Promise<GraphRunners> {
  // Resolve the path to orchestrator dist/graphs/index.js dynamically.
  // This avoids Vite's static validation of package exports maps.
  const orchestratorPath = require.resolve('@repo/orchestrator')
  // orchestratorPath is something like: .../orchestrator/dist/index.js
  // graphs/index.js is a sibling: .../orchestrator/dist/graphs/index.js
  const graphsPath = orchestratorPath.replace('/dist/index.js', '/dist/graphs/index.js')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import(/* @vite-ignore */ graphsPath)

  return {
    runElaboration: mod.runElaboration as RunElaborationFn,
    runStoryCreation: mod.runStoryCreation as RunStoryCreationFn,
    runDevImplement: mod.runDevImplement as RunDevImplementFn,
    runReview: mod.runReview as RunReviewFn,
    runQAVerify: mod.runQAVerify as RunQAVerifyFn,
  }
}
