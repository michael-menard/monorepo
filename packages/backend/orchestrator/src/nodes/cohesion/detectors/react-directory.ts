/**
 * React Directory Structure Detector
 *
 * Detects violations of the React component directory convention:
 * - Each component must live in its own named directory (MyComponent/index.tsx)
 * - Components must have an accompanying __tests__/ directory
 * - Shared types must be in __types__/ directories
 * - No barrel files (index.ts that re-exports from multiple files)
 *
 * Story: APIP-4020 - Cohesion Scanner
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename, dirname } from 'path'
import { PatternViolationSchema } from '../__types__/index.js'
import type { PatternViolation } from '../__types__/index.js'

// ============================================================================
// Patterns
// ============================================================================

/** Matches barrel file re-exports */
const BARREL_EXPORT_PATTERN = /^export\s*\{[^}]+\}\s*from\s+['"]/gm
const STAR_EXPORT_PATTERN = /^export\s*\*\s*from\s+['"]/gm

/** Detects React component definitions */
const REACT_COMPONENT_PATTERN =
  /^(?:export\s+(?:default\s+)?function|export\s+const)\s+([A-Z][a-zA-Z0-9]*)\s*(?:=|\()/m

// ============================================================================
// Helpers
// ============================================================================

function isBarrelFile(content: string): boolean {
  const barrelExports = (content.match(BARREL_EXPORT_PATTERN) || []).length
  const starExports = (content.match(STAR_EXPORT_PATTERN) || []).length
  return barrelExports + starExports >= 3 // ≥3 re-exports = likely a barrel
}

function hasTestsDirectory(dirPath: string): boolean {
  try {
    const entries = readdirSync(dirPath)
    return entries.includes('__tests__')
  } catch {
    return false
  }
}

// ============================================================================
// Detector
// ============================================================================

/**
 * Detects React directory structure violations in a TypeScript/TSX file.
 *
 * AC-2, AC-3: Pure detector function returning PatternViolation[].
 *
 * @param filePath - Path to the file to check
 * @returns Array of pattern violations found
 */
export function detectReactDirectoryViolations(filePath: string): PatternViolation[] {
  // Only check TSX files and index.tsx
  const isTypescript = filePath.endsWith('.tsx') || filePath.endsWith('.ts')
  if (!isTypescript) return []

  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const violations: PatternViolation[] = []
  const fileName = basename(filePath)
  const dirPath = dirname(filePath)
  const dirName = basename(dirPath)

  // Rule 1: No barrel files
  if (isBarrelFile(content)) {
    violations.push(
      PatternViolationSchema.parse({
        category: 'react-directory',
        rule: 'no-barrel-files',
        filePath,
        description:
          'This file appears to be a barrel file (re-exports from multiple sources). ' +
          'Import directly from source files instead of creating barrel re-exports.',
        confidence: 'high',
      }),
    )
  }

  // Rule 2: React components should be in named directories
  const isIndexFile = fileName === 'index.tsx' || fileName === 'index.ts'
  if (isIndexFile && REACT_COMPONENT_PATTERN.test(content)) {
    // Check if parent directory name matches component name convention (PascalCase)
    const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(dirName)
    if (!isPascalCase) {
      violations.push(
        PatternViolationSchema.parse({
          category: 'react-directory',
          rule: 'component-not-in-named-dir',
          filePath,
          description:
            `React component index file is in directory '${dirName}', which is not a ` +
            `PascalCase component directory. Each component should have its own PascalCase directory.`,
          confidence: 'medium',
        }),
      )
    }

    // Rule 3: Component directories should have a __tests__ directory
    if (isPascalCase && !hasTestsDirectory(dirPath)) {
      violations.push(
        PatternViolationSchema.parse({
          category: 'react-directory',
          rule: 'missing-tests-directory',
          filePath,
          description:
            `Component directory '${dirName}' is missing a __tests__/ subdirectory. ` +
            `Add a __tests__/ directory with at least one test file.`,
          confidence: 'medium',
        }),
      )
    }
  }

  return violations
}
