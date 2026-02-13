import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'

import type { GraphState } from '../state/graph-state.js'
import type {
  AuditFindings,
  AuditMode,
  AuditScope,
  AuditLens,
  LensResult,
  ChallengeResult,
  RoundtableResult,
  DedupResult,
  TrendSnapshot,
  AuditFinding,
} from '../artifacts/audit-findings.js'
import {
  AuditModeSchema,
  AuditScopeSchema,
  AuditLensSchema,
  createAuditFindings,
} from '../artifacts/audit-findings.js'

/**
 * Code Audit Graph (FLOW-045)
 *
 * Multi-lens codebase audit with pipeline and roundtable modes.
 * Mirrors the Claude Code /code-audit command family in LangGraph.
 */

// --- Configuration ---

export const CodeAuditConfigSchema = z.object({
  scope: AuditScopeSchema.default('full'),
  mode: AuditModeSchema.default('pipeline'),
  lenses: z.array(AuditLensSchema).default([
    'security',
    'duplication',
    'react',
    'typescript',
    'a11y',
    'ui-ux',
    'performance',
    'test-coverage',
    'code-quality',
  ]),
  target: z.string().default('apps/'),
  since: z.string().optional(),
  storyId: z.string().optional(),
  nodeTimeoutMs: z.number().positive().default(60000),
})

export type CodeAuditConfig = z.infer<typeof CodeAuditConfigSchema>

// --- State Annotation ---

const overwrite = <T>(_: T, b: T): T => b
const appendArray = <T>(current: T[], update: T[]): T[] => [...current, ...update]

export const CodeAuditStateAnnotation = Annotation.Root({
  // Configuration
  scope: Annotation<AuditScope>({
    reducer: overwrite,
    default: () => 'full' as AuditScope,
  }),
  mode: Annotation<AuditMode>({
    reducer: overwrite,
    default: () => 'pipeline' as AuditMode,
  }),
  lenses: Annotation<AuditLens[]>({
    reducer: overwrite,
    default: () => [],
  }),
  target: Annotation<string>({
    reducer: overwrite,
    default: () => 'apps/',
  }),
  storyId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  // Phase 0: Scope discovery
  targetFiles: Annotation<string[]>({
    reducer: overwrite,
    default: () => [],
  }),
  fileCategories: Annotation<Record<string, number>>({
    reducer: overwrite,
    default: () => ({}),
  }),
  previousAudit: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Phase 1: Lens results (append as each lens completes)
  lensResults: Annotation<LensResult[]>({
    reducer: appendArray,
    default: () => [],
  }),

  // Phase 2: Devil's advocate (roundtable only)
  devilsAdvocateResult: Annotation<ChallengeResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Phase 3: Roundtable synthesis (roundtable only)
  roundtableResult: Annotation<RoundtableResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Phase 4: Synthesis
  findings: Annotation<AuditFinding[]>({
    reducer: appendArray,
    default: () => [],
  }),

  // Phase 5: Dedup
  deduplicationResult: Annotation<DedupResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Phase 6: Persistence
  auditFindings: Annotation<AuditFindings | null>({
    reducer: overwrite,
    default: () => null,
  }),
  trendData: Annotation<TrendSnapshot | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Metadata
  errors: Annotation<string[]>({
    reducer: appendArray,
    default: () => [],
  }),
  completed: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
})

export type CodeAuditState = typeof CodeAuditStateAnnotation.State

// --- Extended interface for composition ---

export interface GraphStateWithCodeAudit extends GraphState {
  scope?: AuditScope
  mode?: AuditMode
  lenses?: AuditLens[]
  targetFiles?: string[]
  lensResults?: LensResult[]
  devilsAdvocateResult?: ChallengeResult | null
  roundtableResult?: RoundtableResult | null
  findings?: AuditFinding[]
  deduplicationResult?: DedupResult | null
  auditFindings?: AuditFindings | null
  trendData?: TrendSnapshot | null
}

// --- Conditional Routing ---

function routeAfterMergeLenses(state: CodeAuditState): 'devils_advocate' | 'synthesize' {
  return state.mode === 'roundtable' ? 'devils_advocate' : 'synthesize'
}

function routeAfterDevilsAdvocate(_state: CodeAuditState): 'roundtable' {
  return 'roundtable'
}

function routeAfterRoundtable(_state: CodeAuditState): 'synthesize' {
  return 'synthesize'
}

// --- Placeholder Node Factories ---
// These create minimal nodes that return state updates.
// Full implementations live in src/nodes/audit/*.ts

function createScanScopeNode(config: CodeAuditConfig) {
  return async (state: CodeAuditState): Promise<Partial<CodeAuditState>> => {
    // Delegates to scan-scope node implementation
    const { scanScope } = await import('../nodes/audit/scan-scope.js')
    return scanScope(state, config)
  }
}

function createLensParallelNode(config: CodeAuditConfig) {
  return async (state: CodeAuditState): Promise<Partial<CodeAuditState>> => {
    // Run all selected lenses in parallel
    const lensModules = {
      security: () => import('../nodes/audit/lens-security.js'),
      duplication: () => import('../nodes/audit/lens-duplication.js'),
      react: () => import('../nodes/audit/lens-react.js'),
      typescript: () => import('../nodes/audit/lens-typescript.js'),
      a11y: () => import('../nodes/audit/lens-accessibility.js'),
      'ui-ux': () => import('../nodes/audit/lens-ui-ux.js'),
      performance: () => import('../nodes/audit/lens-performance.js'),
      'test-coverage': () => import('../nodes/audit/lens-test-coverage.js'),
      'code-quality': () => import('../nodes/audit/lens-code-quality.js'),
    }

    const results = await Promise.all(
      config.lenses.map(async lens => {
        const loader = lensModules[lens]
        if (!loader) return null
        const mod = await loader()
        return mod.run(state)
      }),
    )

    return {
      lensResults: results.filter((r): r is LensResult => r !== null),
    }
  }
}

function createDevilsAdvocateNode() {
  return async (state: CodeAuditState): Promise<Partial<CodeAuditState>> => {
    const { runDevilsAdvocate } = await import('../nodes/audit/devils-advocate.js')
    return runDevilsAdvocate(state)
  }
}

function createRoundtableNode() {
  return async (state: CodeAuditState): Promise<Partial<CodeAuditState>> => {
    const { runRoundtable } = await import('../nodes/audit/roundtable.js')
    return runRoundtable(state)
  }
}

function createSynthesizeNode() {
  return async (state: CodeAuditState): Promise<Partial<CodeAuditState>> => {
    const { synthesize } = await import('../nodes/audit/synthesize.js')
    return synthesize(state)
  }
}

function createDeduplicateNode() {
  return async (state: CodeAuditState): Promise<Partial<CodeAuditState>> => {
    const { deduplicate } = await import('../nodes/audit/deduplicate.js')
    return deduplicate(state)
  }
}

function createPersistFindingsNode() {
  return async (state: CodeAuditState): Promise<Partial<CodeAuditState>> => {
    const { persistFindings } = await import('../nodes/audit/persist-findings.js')
    return persistFindings(state)
  }
}

function createPersistTrendsNode() {
  return async (state: CodeAuditState): Promise<Partial<CodeAuditState>> => {
    const { persistTrends } = await import('../nodes/audit/persist-trends.js')
    return persistTrends(state)
  }
}

// --- Graph Composition ---

/**
 * Create the code audit graph with pipeline or roundtable routing.
 *
 * Pipeline:  scan_scope → lens_parallel → synthesize → deduplicate → persist_findings → persist_trends → END
 * Roundtable: scan_scope → lens_parallel → devils_advocate → roundtable → synthesize → deduplicate → persist_findings → persist_trends → END
 */
export function createCodeAuditGraph(config: Partial<CodeAuditConfig> = {}) {
  const fullConfig = CodeAuditConfigSchema.parse(config)

  const graph = new StateGraph(CodeAuditStateAnnotation)
    // Phase 0: Scope discovery
    .addNode('scan_scope', createScanScopeNode(fullConfig))
    // Phase 1: Parallel lens fanout
    .addNode('lens_parallel', createLensParallelNode(fullConfig))
    // Phase 2: Devil's advocate (roundtable only)
    .addNode('devils_advocate', createDevilsAdvocateNode())
    // Phase 3: Roundtable synthesis (roundtable only)
    .addNode('roundtable', createRoundtableNode())
    // Phase 4: Synthesize
    .addNode('synthesize', createSynthesizeNode())
    // Phase 5: Deduplicate
    .addNode('deduplicate', createDeduplicateNode())
    // Phase 6: Persist
    .addNode('persist_findings', createPersistFindingsNode())
    .addNode('persist_trends', createPersistTrendsNode())

    // Edges
    .addEdge(START, 'scan_scope')
    .addEdge('scan_scope', 'lens_parallel')
    // Conditional: pipeline skips devil's advocate + roundtable
    .addConditionalEdges('lens_parallel', routeAfterMergeLenses, {
      devils_advocate: 'devils_advocate',
      synthesize: 'synthesize',
    })
    .addEdge('devils_advocate', 'roundtable')
    .addEdge('roundtable', 'synthesize')
    .addEdge('synthesize', 'deduplicate')
    .addEdge('deduplicate', 'persist_findings')
    .addEdge('persist_findings', 'persist_trends')
    .addEdge('persist_trends', END)

  return graph.compile()
}

// --- Convenience Runner ---

/**
 * Run a code audit and return the findings
 */
export async function runCodeAudit(
  config: Partial<CodeAuditConfig> = {},
): Promise<AuditFindings | null> {
  const fullConfig = CodeAuditConfigSchema.parse(config)
  const graph = createCodeAuditGraph(fullConfig)

  const initialState: Partial<CodeAuditState> = {
    scope: fullConfig.scope,
    mode: fullConfig.mode,
    lenses: fullConfig.lenses,
    target: fullConfig.target,
    storyId: fullConfig.storyId || '',
  }

  const result = await graph.invoke(initialState)
  return result.auditFindings || createAuditFindings(fullConfig.mode, fullConfig.scope, fullConfig.target, fullConfig.lenses)
}

// --- Node adapter for workflow integration ---

export const codeAuditNode = async (state: GraphState): Promise<Partial<GraphStateWithCodeAudit>> => {
  const stateWithAudit = state as GraphStateWithCodeAudit
  const result = await runCodeAudit({
    scope: stateWithAudit.scope,
    mode: stateWithAudit.mode,
    lenses: stateWithAudit.lenses,
  })
  return {
    auditFindings: result,
  }
}

export function createCodeAuditNode(config: Partial<CodeAuditConfig> = {}) {
  return async (state: GraphState): Promise<Partial<GraphStateWithCodeAudit>> => {
    const result = await runCodeAudit(config)
    return {
      auditFindings: result,
    }
  }
}
