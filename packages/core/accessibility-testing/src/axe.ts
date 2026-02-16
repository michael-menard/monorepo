/**
 * axe-core Integration for Accessibility Testing
 *
 * Provides utilities for automated WCAG AA compliance checking
 * using axe-core integrated with Vitest and React Testing Library.
 *
 * @module a11y/axe
 * @see AC1, AC5, AC9, AC14
 */

import { axe } from 'vitest-axe'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matchers = require('vitest-axe/matchers')
import { expect } from 'vitest'
import { defaultA11yConfig, toAxeRunOptions, type A11yConfig } from './config'

// Extend Vitest matchers with axe-core assertions
expect.extend(matchers)

// Export toHaveNoViolations matcher
const toHaveNoViolations = matchers.toHaveNoViolations

// Type for axe-core results
interface AxeResults {
  violations: AxeViolation[]
  passes: AxeViolation[]
  incomplete: AxeViolation[]
  inapplicable: AxeViolation[]
  toolOptions?: { impactLevels?: string[] }
}

interface AxeViolation {
  id: string
  impact?: string
  description: string
  help: string
  helpUrl: string
  tags: string[]
  nodes: Array<{
    target: string[]
    html: string
    failureSummary?: string
  }>
}

/**
 * Violation severity levels from axe-core
 */
export type ViolationSeverity = 'minor' | 'moderate' | 'serious' | 'critical'

/**
 * Simplified violation result for easier testing assertions
 */
export interface SimplifiedViolation {
  /** axe-core rule ID (e.g., 'color-contrast', 'label') */
  ruleId: string
  /** Severity level */
  severity: ViolationSeverity
  /** Human-readable description */
  description: string
  /** Help URL for remediation */
  helpUrl: string
  /** Number of elements affected */
  nodeCount: number
  /** Affected element selectors */
  selectors: string[]
  /** WCAG criteria violated */
  wcagTags: string[]
}

/**
 * Performance timing result for axe-core scans
 */
export interface ScanPerformance {
  /** Total scan time in milliseconds */
  totalMs: number
  /** Whether scan exceeded configured maximum */
  exceededMax: boolean
  /** Configured maximum time */
  maxMs: number
}

/**
 * Result of accessibility check including performance metrics
 */
export interface A11yCheckResult {
  /** Raw axe-core results */
  raw: AxeResults
  /** Simplified violation list */
  violations: SimplifiedViolation[]
  /** Number of violations by severity */
  violationCounts: Record<ViolationSeverity, number>
  /** Total violation count */
  totalViolations: number
  /** Performance metrics */
  performance: ScanPerformance
  /** Whether the check passed (no violations) */
  passed: boolean
}

/**
 * Simplifies axe-core violation results for easier assertions
 *
 * @param violations - Raw axe-core violation results
 * @returns Simplified violation array
 */
function simplifyViolations(violations: AxeViolation[]): SimplifiedViolation[] {
  return violations.map(violation => ({
    ruleId: violation.id,
    severity: violation.impact as ViolationSeverity,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodeCount: violation.nodes.length,
    selectors: violation.nodes.map(node => node.target.join(' ')),
    wcagTags: violation.tags.filter(tag => tag.startsWith('wcag')),
  }))
}

/**
 * Counts violations by severity level
 *
 * @param violations - Simplified violations
 * @returns Count by severity
 */
function countBySeverity(violations: SimplifiedViolation[]): Record<ViolationSeverity, number> {
  return violations.reduce(
    (acc, v) => {
      acc[v.severity]++
      return acc
    },
    { minor: 0, moderate: 0, serious: 0, critical: 0 }
  )
}

/**
 * Runs axe-core accessibility check on a container element
 *
 * @param container - DOM element to check (usually from render().container)
 * @param config - Optional accessibility configuration
 * @returns Detailed accessibility check result
 *
 * @example
 * // Basic usage
 * const { container } = render(<MyComponent />)
 * const result = await checkAccessibility(container)
 * expect(result.passed).toBe(true)
 *
 * @example
 * // With custom configuration
 * const result = await checkAccessibility(container, {
 *   wcagLevel: 'wcag2aaa',
 *   ruleExceptions: [{ ruleId: 'color-contrast', justification: 'Test data' }]
 * })
 */
export async function checkAccessibility(
  container: Element,
  config: Partial<A11yConfig> = {}
): Promise<A11yCheckResult> {
  const mergedConfig: A11yConfig = { ...defaultA11yConfig, ...config }
  const runOptions = toAxeRunOptions(mergedConfig)

  const startTime = performance.now()
  const results = await axe(container, runOptions as Record<string, unknown>) as AxeResults
  const endTime = performance.now()
  const scanTime = endTime - startTime

  const violations = simplifyViolations(results.violations)
  const violationCounts = countBySeverity(violations)

  const performanceResult: ScanPerformance = {
    totalMs: scanTime,
    exceededMax: scanTime > mergedConfig.performance.maxScanTime,
    maxMs: mergedConfig.performance.maxScanTime,
  }

  if (mergedConfig.performance.logTiming) {
    // Using console intentionally for test debugging (not production code)
    // eslint-disable-next-line no-console
    console.log(`[axe] Scan completed in ${scanTime.toFixed(2)}ms`)
  }

  return {
    raw: results,
    violations,
    violationCounts,
    totalViolations: violations.length,
    performance: performanceResult,
    passed: violations.length === 0,
  }
}

/**
 * Asserts that a container has no accessibility violations
 *
 * This is the primary assertion for AC1: axe-core integration in tests.
 * Throws a descriptive error if violations are found.
 *
 * @param container - DOM element to check
 * @param config - Optional accessibility configuration
 *
 * @example
 * // In a test
 * it('should have no accessibility violations', async () => {
 *   const { container } = render(<WishlistCard item={mockItem} />)
 *   await assertNoViolations(container)
 * })
 */
export async function assertNoViolations(
  container: Element,
  config: Partial<A11yConfig> = {}
): Promise<void> {
  const result = await checkAccessibility(container, config)

  if (!result.passed) {
    const violationDetails = result.violations
      .map(
        v =>
          `  - [${v.severity.toUpperCase()}] ${v.ruleId}: ${v.description}\n` +
          `    Affected: ${v.selectors.join(', ')}\n` +
          `    Help: ${v.helpUrl}`
      )
      .join('\n\n')

    throw new Error(
      `Accessibility violations found (${result.totalViolations}):\n\n${violationDetails}`
    )
  }
}

/**
 * Asserts that specific violations exist (for testing violation detection)
 *
 * Useful for testing that axe-core correctly identifies issues.
 *
 * @param container - DOM element to check
 * @param expectedRuleIds - Rule IDs that should be violated
 * @param config - Optional accessibility configuration
 *
 * @example
 * // Testing that we detect missing labels
 * it('should detect missing form labels', async () => {
 *   const { container } = render(<input type="text" />)
 *   await assertViolationsExist(container, ['label'])
 * })
 */
export async function assertViolationsExist(
  container: Element,
  expectedRuleIds: string[],
  config: Partial<A11yConfig> = {}
): Promise<void> {
  const result = await checkAccessibility(container, config)
  const foundRuleIds = result.violations.map(v => v.ruleId)

  const missingRules = expectedRuleIds.filter(id => !foundRuleIds.includes(id))

  if (missingRules.length > 0) {
    throw new Error(
      `Expected violations not found: ${missingRules.join(', ')}\n` +
        `Found violations: ${foundRuleIds.join(', ') || 'none'}`
    )
  }
}

/**
 * Checks for color contrast violations specifically
 *
 * Per AC5: Color contrast checking with WCAG AA 4.5:1 ratio.
 *
 * @param container - DOM element to check
 * @returns Color contrast violations with detailed ratio information
 *
 * @example
 * it('should pass color contrast requirements', async () => {
 *   const { container } = render(<Text color="lightGray">Hello</Text>)
 *   const violations = await checkColorContrast(container)
 *   expect(violations).toHaveLength(0)
 * })
 */
export async function checkColorContrast(container: Element): Promise<SimplifiedViolation[]> {
  const result = await checkAccessibility(container, {
    includeTags: ['wcag2aa'],
  })

  return result.violations.filter(v => v.ruleId === 'color-contrast')
}

/**
 * Filters violations by severity level
 *
 * @param violations - Violations to filter
 * @param minSeverity - Minimum severity to include
 * @returns Filtered violations
 */
export function filterBySeverity(
  violations: SimplifiedViolation[],
  minSeverity: ViolationSeverity
): SimplifiedViolation[] {
  const severityOrder: ViolationSeverity[] = ['minor', 'moderate', 'serious', 'critical']
  const minIndex = severityOrder.indexOf(minSeverity)

  return violations.filter(v => severityOrder.indexOf(v.severity) >= minIndex)
}

/**
 * Formats violations for test failure output
 *
 * @param violations - Violations to format
 * @returns Formatted string for error messages
 */
export function formatViolations(violations: SimplifiedViolation[]): string {
  if (violations.length === 0) {
    return 'No violations found'
  }

  const grouped = violations.reduce(
    (acc, v) => {
      if (!acc[v.severity]) {
        acc[v.severity] = []
      }
      acc[v.severity].push(v)
      return acc
    },
    {} as Record<string, SimplifiedViolation[]>
  )

  return Object.entries(grouped)
    .map(([severity, viols]) => {
      const header = `${severity.toUpperCase()} (${viols.length}):`
      const details = viols
        .map(v => `  - ${v.ruleId}: ${v.description}\n    Elements: ${v.selectors.join(', ')}`)
        .join('\n')
      return `${header}\n${details}`
    })
    .join('\n\n')
}

/**
 * Creates a custom axe-core runner with preset configuration
 *
 * Useful for creating test-specific configurations that can be reused.
 *
 * @param baseConfig - Base configuration for all checks
 * @returns Configured checker functions
 *
 * @example
 * const a11yChecker = createA11yChecker({
 *   ruleExceptions: [{ ruleId: 'region', justification: 'Test context' }]
 * })
 *
 * it('should be accessible', async () => {
 *   const { container } = render(<Component />)
 *   await a11yChecker.assertNoViolations(container)
 * })
 */
export function createA11yChecker(baseConfig: Partial<A11yConfig> = {}) {
  return {
    check: (container: Element, overrides: Partial<A11yConfig> = {}) =>
      checkAccessibility(container, { ...baseConfig, ...overrides }),

    assertNoViolations: (container: Element, overrides: Partial<A11yConfig> = {}) =>
      assertNoViolations(container, { ...baseConfig, ...overrides }),

    assertViolationsExist: (
      container: Element,
      expectedRuleIds: string[],
      overrides: Partial<A11yConfig> = {}
    ) => assertViolationsExist(container, expectedRuleIds, { ...baseConfig, ...overrides }),

    checkColorContrast: (container: Element) => checkColorContrast(container),
  }
}

// Re-export for convenience
export { axe, toHaveNoViolations }
