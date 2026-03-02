/**
 * Health Gate Collectors — Index
 *
 * Re-exports all 8 metric collector functions and the ExecFn type.
 * Story: APIP-4010 - Codebase Health Gate (ST-04a, ST-04b)
 * AC: AC-4
 */

// ExecFn type (shared by all collectors)
export type { ExecFn } from './collectLintWarnings.js'

// ST-04a: stdout-based collectors
export { collectLintWarnings } from './collectLintWarnings.js'
export { collectTypeErrors } from './collectTypeErrors.js'
export { collectAnyCount } from './collectAnyCount.js'
export { collectEslintDisableCount } from './collectEslintDisableCount.js'

// ST-04b: structured-output collectors
export { collectTestCoverage } from './collectTestCoverage.js'
export { collectCircularDeps } from './collectCircularDeps.js'
export { collectBundleSize } from './collectBundleSize.js'
export { collectDeadExports } from './collectDeadExports.js'
