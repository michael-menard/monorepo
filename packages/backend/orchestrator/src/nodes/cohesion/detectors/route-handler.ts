/**
 * Route Handler Cohesion Detector
 *
 * Detects violations of the route-handler pattern:
 * - Lambda handler functions must be in a `handlers/` directory
 * - Handler files must export a default function named `handler`
 * - Handler functions must not contain business logic directly (should delegate)
 *
 * Story: APIP-4020 - Cohesion Scanner
 */

import { readFileSync } from 'fs'
import { PatternViolationSchema } from '../__types__/index.js'
import type { PatternViolation } from '../__types__/index.js'

// ============================================================================
// Constants
// ============================================================================

const HANDLER_DIR_PATTERN = /[/\\]handlers[/\\]/
const HANDLER_EXPORT_PATTERN = /export\s+(const\s+handler|default\s+function\s+handler|async\s+function\s+handler)/
const LAMBDA_HANDLER_IMPORT_PATTERN = /from\s+['"]@aws-lambda-powertools|APIGatewayProxyHandler|APIGatewayEvent|LambdaEvent/
const DIRECT_DB_IN_HANDLER_PATTERN = /\bdrizzle\b|\bdb\.(select|insert|update|delete)\b/

// ============================================================================
// Detector
// ============================================================================

/**
 * Detects route-handler pattern violations in a file.
 *
 * AC-2, AC-3: Pure detector function returning PatternViolation[].
 *
 * @param filePath - Absolute or relative path to the file
 * @returns Array of pattern violations found
 */
export function detectRouteHandlerViolations(filePath: string): PatternViolation[] {
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const violations: PatternViolation[] = []

  // Only check handler-like files (those that export a handler or import lambda types)
  const isLambdaFile =
    LAMBDA_HANDLER_IMPORT_PATTERN.test(content) ||
    HANDLER_EXPORT_PATTERN.test(content) ||
    filePath.endsWith('.handler.ts') ||
    filePath.endsWith('.handler.js')

  if (!isLambdaFile) {
    return []
  }

  // Rule 1: Handler files must be in a handlers/ directory
  if (!HANDLER_DIR_PATTERN.test(filePath)) {
    violations.push(
      PatternViolationSchema.parse({
        category: 'route-handler',
        rule: 'handler-not-in-handlers-dir',
        filePath,
        description:
          'Lambda handler file is not located in a handlers/ directory. ' +
          'Move this file into a handlers/ subdirectory.',
        confidence: 'high',
      }),
    )
  }

  // Rule 2: Handler should not contain direct DB access (business logic leakage)
  if (DIRECT_DB_IN_HANDLER_PATTERN.test(content)) {
    // Find the line number of the first occurrence
    const lines = content.split('\n')
    let line: number | undefined
    for (let i = 0; i < lines.length; i++) {
      if (DIRECT_DB_IN_HANDLER_PATTERN.test(lines[i]!)) {
        line = i + 1
        break
      }
    }

    violations.push(
      PatternViolationSchema.parse({
        category: 'route-handler',
        rule: 'handler-contains-db-logic',
        filePath,
        line,
        description:
          'Lambda handler directly accesses the database. ' +
          'Extract DB logic into a service or repository layer.',
        confidence: 'medium',
      }),
    )
  }

  return violations
}
