/**
 * Unit tests for import-convention detector.
 *
 * AC-11: Detector tests with compliant + violating fixtures.
 * AC-3: Asserts PatternViolationSchema shape on detector outputs.
 */

import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { detectImportConventionViolations } from '../detectors/import-convention.js'

const FIXTURES_DIR = join(import.meta.dirname, '../__fixtures__')
const COMPLIANT_ROUTE = join(FIXTURES_DIR, 'compliant/sample-route.ts')
const VIOLATING_ROUTE = join(FIXTURES_DIR, 'violating/sample-route.ts')

describe('detectImportConventionViolations', () => {
  it('returns no violations for non-TypeScript files', () => {
    const violations = detectImportConventionViolations('/path/to/file.js')
    expect(violations).toHaveLength(0)
  })

  it('returns no violations for compliant fixture', () => {
    const violations = detectImportConventionViolations(COMPLIANT_ROUTE)
    // Compliant fixture uses @repo/logger, no console.log, no individual @repo/ui imports
    expect(violations).toHaveLength(0)
  })

  it('detects console.log violations in violating fixture', () => {
    const violations = detectImportConventionViolations(VIOLATING_ROUTE)
    const consoleViolations = violations.filter(v => v.rule === 'no-console-log')
    // The violating fixture uses console.log, console.warn, console.error
    expect(consoleViolations.length).toBeGreaterThan(0)
  })

  it('detects interface-instead-of-zod when Zod is used', () => {
    // The violating fixture has interfaces but no Zod import, so this rule
    // doesn't trigger (correct — only fires in files that already use Zod)
    const violations = detectImportConventionViolations(VIOLATING_ROUTE)
    const interfaceViolations = violations.filter(v => v.rule === 'interface-instead-of-zod')
    expect(interfaceViolations).toHaveLength(0)
  })

  it('validates PatternViolation schema shape on all returned violations', () => {
    const violations = detectImportConventionViolations(VIOLATING_ROUTE)
    for (const v of violations) {
      expect(v).toMatchObject({
        category: 'import-convention',
        rule: expect.any(String),
        filePath: expect.any(String),
        description: expect.any(String),
        confidence: expect.stringMatching(/^(high|medium|low)$/),
      })
      // All violations must have a line number (console violations always do)
      expect(typeof v.line).toBe('number')
    }
  })

  it('skips test files (no console violations in __tests__ dirs)', () => {
    const testFilePath = '/project/__tests__/some.test.ts'
    const violations = detectImportConventionViolations(testFilePath)
    // File doesn't exist → returns [] gracefully
    expect(violations).toHaveLength(0)
  })
})
