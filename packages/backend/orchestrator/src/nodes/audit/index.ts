/**
 * Code Audit Nodes
 *
 * Multi-lens code audit workflow nodes for security, quality, and debt analysis.
 * Supports pipeline (fast) and roundtable (thorough) modes.
 */

// --- Scope Discovery ---

/**
 * Scan scope - discover files to audit based on scope and target
 */
export { scanScope, ScanScopeResultSchema, type ScanScopeResult } from './scan-scope.js'

// --- Lens Nodes ---

/**
 * Security lens - identify security vulnerabilities
 */
export { run as runSecurityLens } from './lens-security.js'

/**
 * Duplication lens - detect code duplication
 */
export { run as runDuplicationLens } from './lens-duplication.js'

/**
 * React lens - analyze React-specific issues
 */
export { run as runReactLens } from './lens-react.js'

/**
 * TypeScript lens - analyze type safety and TypeScript usage
 */
export { run as runTypeScriptLens } from './lens-typescript.js'

/**
 * Accessibility lens - identify a11y issues
 */
export { run as runAccessibilityLens } from './lens-accessibility.js'

/**
 * UI/UX lens - analyze user interface and experience issues
 */
export { run as runUiUxLens } from './lens-ui-ux.js'

/**
 * Performance lens - identify performance bottlenecks
 */
export { run as runPerformanceLens } from './lens-performance.js'

/**
 * Test coverage lens - analyze test coverage and quality
 */
export { run as runTestCoverageLens } from './lens-test-coverage.js'

/**
 * Code quality lens - general code quality issues
 */
export { run as runCodeQualityLens } from './lens-code-quality.js'

// --- Orchestration Nodes ---

/**
 * Devil's advocate - challenge findings with skeptical review (roundtable mode)
 */
export { runDevilsAdvocate } from './devils-advocate.js'

/**
 * Roundtable - cross-reference findings and identify patterns (roundtable mode)
 */
export { runRoundtable } from './roundtable.js'

/**
 * Synthesize - aggregate and synthesize findings from all lenses
 */
export { synthesize } from './synthesize.js'

/**
 * Deduplicate - remove duplicate findings and identify related issues
 */
export { deduplicate } from './deduplicate.js'

/**
 * Persist findings - save findings to FINDINGS-{timestamp}.yaml
 */
export { persistFindings } from './persist-findings.js'

/**
 * Persist trends - update trend data and generate visualizations
 */
export { persistTrends } from './persist-trends.js'
