/**
 * Test Quality Monitor Graph
 *
 * Composes a complete test quality monitoring pipeline using LangGraph.
 * Orchestrates assertion density collection, orphaned test detection,
 * critical-path coverage collection, decay detection, and optional
 * improvement story generation.
 *
 * Graph flow:
 * START → initialize → collect_density → collect_orphaned → collect_coverage
 *       → detect_decay → [generate_story?] → output → END
 *
 * APIP-4040 AC-10
 */

import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { logger } from '@repo/logger'
import {
  TestQualityMonitorConfigSchema,
  TestQualitySnapshotSchema,
  type TestQualityMonitorConfig,
  type TestQualitySnapshot,
  type AssertionDensityResult,
  type OrphanedTestResult,
  type CriticalPathCoverageResult,
  type DecayDetectionResult,
} from '../nodes/test-quality/schemas.js'
import { collectAssertionDensity } from '../nodes/test-quality/collect-assertion-density.js'
import { collectOrphanedTests } from '../nodes/test-quality/collect-orphaned-tests.js'
import { collectCriticalPathCoverage } from '../nodes/test-quality/collect-critical-path-coverage.js'
import { detectDecay } from '../nodes/test-quality/detect-decay.js'
import {
  generateTestImprovementStory,
  type ImprovementStoryOptions,
} from '../nodes/test-quality/generate-improvement-story.js'
import type { StoryArtifact } from '../artifacts/story.js'

// ──────────────────────────────────────────────────────────────────────────────
// State Annotation
// ──────────────────────────────────────────────────────────────────────────────

const overwrite = <T>(_: T, b: T): T => b

export const TestQualityMonitorStateAnnotation = Annotation.Root({
  /** Configuration for this run */
  config: Annotation<TestQualityMonitorConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Assertion density collection result */
  assertionDensityResult: Annotation<AssertionDensityResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Orphaned test detection result */
  orphanedTestResult: Annotation<OrphanedTestResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Critical path coverage collection result */
  criticalPathCoverageResult: Annotation<CriticalPathCoverageResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Current snapshot built from collector results */
  currentSnapshot: Annotation<TestQualitySnapshot | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Previous snapshot for decay comparison (injected before graph run) */
  previousSnapshot: Annotation<TestQualitySnapshot | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Decay detection result */
  decayResult: Annotation<DecayDetectionResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Generated improvement story (if decay detected) */
  improvementStory: Annotation<StoryArtifact | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Whether the graph completed successfully */
  completed: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  /** Errors collected during graph execution */
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

export type TestQualityMonitorState = typeof TestQualityMonitorStateAnnotation.State

// ──────────────────────────────────────────────────────────────────────────────
// Node factories
// ──────────────────────────────────────────────────────────────────────────────

function createInitializeNode(config: Partial<TestQualityMonitorConfig> = {}) {
  return async (_state: TestQualityMonitorState): Promise<Partial<TestQualityMonitorState>> => {
    const fullConfig = TestQualityMonitorConfigSchema.parse(config)
    return { config: fullConfig }
  }
}

function createCollectDensityNode() {
  return async (state: TestQualityMonitorState): Promise<Partial<TestQualityMonitorState>> => {
    const cfg = state.config
    const scanRoot = cfg?.scanRoot ?? '.'

    try {
      const result = await collectAssertionDensity(scanRoot)
      return { assertionDensityResult: result }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Density collection failed'
      logger.warn('test-quality-monitor.density.error', { error: msg })
      return { errors: [msg] }
    }
  }
}

function createCollectOrphanedNode() {
  return async (state: TestQualityMonitorState): Promise<Partial<TestQualityMonitorState>> => {
    const cfg = state.config
    const scanRoot = cfg?.scanRoot ?? '.'

    try {
      const result = await collectOrphanedTests(scanRoot)
      return { orphanedTestResult: result }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Orphaned test detection failed'
      logger.warn('test-quality-monitor.orphaned.error', { error: msg })
      return { errors: [msg] }
    }
  }
}

function createCollectCoverageNode() {
  return async (state: TestQualityMonitorState): Promise<Partial<TestQualityMonitorState>> => {
    const cfg = state.config
    if (!cfg) return {}

    try {
      const result = await collectCriticalPathCoverage(
        cfg.criticalPathPatterns,
        cfg.criticalPathCoverageFloor,
        cfg.scanRoot,
        cfg.coverageTimeoutMs,
      )
      return { criticalPathCoverageResult: result }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Coverage collection failed'
      logger.warn('test-quality-monitor.coverage.error', { error: msg })
      return { errors: [msg] }
    }
  }
}

function createBuildSnapshotNode() {
  return async (state: TestQualityMonitorState): Promise<Partial<TestQualityMonitorState>> => {
    const cfg = state.config
    if (!cfg) return { errors: ['Config missing when building snapshot'] }

    const density = state.assertionDensityResult
    const orphaned = state.orphanedTestResult
    const coverage = state.criticalPathCoverageResult

    // Determine overall status
    const densityOk = (density?.densityRatio ?? 0) >= cfg.minAssertionDensity || !density?.success
    const orphanedOk =
      (orphaned?.orphanedCount ?? 0) <= cfg.maxOrphanedTests || !orphaned?.success
    const coverageOk =
      (coverage?.overallLineCoverage ?? 0) / 100 >= cfg.criticalPathCoverageFloor ||
      !coverage?.success

    let status: TestQualitySnapshot['status']
    if (densityOk && orphanedOk && coverageOk) {
      status = 'pass'
    } else if (!densityOk || !orphanedOk) {
      status = 'warn'
    } else {
      status = 'fail'
    }

    const snapshot = TestQualitySnapshotSchema.parse({
      snapshotAt: new Date().toISOString(),
      status,
      assertionCount: density?.assertionCount ?? 0,
      testCount: density?.testCount ?? 0,
      assertionDensityRatio: density?.densityRatio ?? 0,
      orphanedTestCount: orphaned?.orphanedCount ?? 0,
      criticalPathLineCoverage: coverage?.overallLineCoverage ?? 0,
      criticalPathBranchCoverage: coverage?.overallBranchCoverage ?? 0,
      mutationScore: null,
      config: cfg,
    })

    return { currentSnapshot: snapshot }
  }
}

function createDetectDecayNode() {
  return async (state: TestQualityMonitorState): Promise<Partial<TestQualityMonitorState>> => {
    if (!state.currentSnapshot) {
      return { errors: ['No current snapshot available for decay detection'] }
    }

    const result = detectDecay(state.currentSnapshot, state.previousSnapshot)
    return { decayResult: result }
  }
}

function createGenerateStoryNode(storyOptions: Partial<ImprovementStoryOptions> = {}) {
  return async (state: TestQualityMonitorState): Promise<Partial<TestQualityMonitorState>> => {
    const cfg = state.config
    const decay = state.decayResult

    if (!decay?.decayed || !cfg?.generateImprovementStories) {
      return {}
    }

    try {
      const now = Date.now()
      const options: ImprovementStoryOptions = {
        storyId: storyOptions.storyId ?? `APIP-IMP-${now}`,
        feature: storyOptions.feature ?? 'autonomous-pipeline',
        followUpFrom: storyOptions.followUpFrom ?? 'APIP-4040',
      }

      const story = generateTestImprovementStory(decay, options)
      logger.info('test-quality-monitor.improvement-story.generated', {
        storyId: story.id,
        decayedMetrics: decay.decayedMetrics.map(m => m.metric),
      })

      return { improvementStory: story }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Story generation failed'
      logger.warn('test-quality-monitor.story.error', { error: msg })
      return { errors: [msg] }
    }
  }
}

function createOutputNode() {
  return async (state: TestQualityMonitorState): Promise<Partial<TestQualityMonitorState>> => {
    logger.info('test-quality-monitor.complete', {
      status: state.currentSnapshot?.status,
      decayed: state.decayResult?.decayed,
      decayedMetrics: state.decayResult?.decayedMetrics?.map(m => m.metric),
      improvementStoryGenerated: !!state.improvementStory,
      errors: state.errors,
    })

    return { completed: true }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Graph factory
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates a compiled test quality monitor graph.
 *
 * @param config - Configuration overrides for this run
 * @param storyOptions - Options for generating improvement stories
 * @returns Compiled StateGraph
 */
export function createTestQualityMonitorGraph(
  config: Partial<TestQualityMonitorConfig> = {},
  storyOptions: Partial<ImprovementStoryOptions> = {},
) {
  const graph = new StateGraph(TestQualityMonitorStateAnnotation)
    .addNode('initialize', createInitializeNode(config))
    .addNode('collect_density', createCollectDensityNode())
    .addNode('collect_orphaned', createCollectOrphanedNode())
    .addNode('collect_coverage', createCollectCoverageNode())
    .addNode('build_snapshot', createBuildSnapshotNode())
    .addNode('detect_decay', createDetectDecayNode())
    .addNode('generate_story', createGenerateStoryNode(storyOptions))
    .addNode('output', createOutputNode())
    .addEdge(START, 'initialize')
    .addEdge('initialize', 'collect_density')
    .addEdge('collect_density', 'collect_orphaned')
    .addEdge('collect_orphaned', 'collect_coverage')
    .addEdge('collect_coverage', 'build_snapshot')
    .addEdge('build_snapshot', 'detect_decay')
    .addEdge('detect_decay', 'generate_story')
    .addEdge('generate_story', 'output')
    .addEdge('output', END)

  return graph.compile()
}

/**
 * Convenience function to run the test quality monitor for a given config.
 *
 * @param config - Configuration overrides
 * @param previousSnapshot - Previous snapshot for decay comparison (null = first run)
 * @param storyOptions - Options for improvement story generation
 * @returns Final graph state
 */
export async function runTestQualityMonitor(
  config: Partial<TestQualityMonitorConfig> = {},
  previousSnapshot: TestQualitySnapshot | null = null,
  storyOptions: Partial<ImprovementStoryOptions> = {},
): Promise<TestQualityMonitorState> {
  const graph = createTestQualityMonitorGraph(config, storyOptions)

  const initialState: Partial<TestQualityMonitorState> = {
    previousSnapshot,
  }

  return graph.invoke(initialState)
}
