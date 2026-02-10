/**
 * File discovery utilities for scanning the monorepo
 * WISH-20210
 */
import { glob } from 'glob'
import { resolve } from 'path'

/**
 * Default glob patterns for discovering TypeScript files to scan
 */
const DEFAULT_GLOBS = [
  'apps/api/lego-api/domains/**/*.ts',
  'apps/web/**/src/**/*.{ts,tsx}',
  'packages/core/api-client/src/**/*.ts',
  'packages/backend/database-schema/src/**/*.ts',
]

/**
 * Patterns to exclude from scanning
 */
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
]

/**
 * Discover TypeScript files in the monorepo for AST analysis
 * @param rootDir - Root directory of the monorepo
 * @param globs - Optional custom glob patterns (defaults to DEFAULT_GLOBS)
 * @returns Array of absolute file paths
 */
export async function discoverFiles(
  rootDir: string,
  globs: string[] = DEFAULT_GLOBS,
): Promise<string[]> {
  const allFiles: string[] = []

  for (const pattern of globs) {
    const files = await glob(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: EXCLUDE_PATTERNS,
      nodir: true,
    })

    allFiles.push(...files)
  }

  // Remove duplicates
  return Array.from(new Set(allFiles))
}

/**
 * Discover test files separately for categorization
 * @param rootDir - Root directory of the monorepo
 * @returns Array of absolute file paths to test files
 */
export async function discoverTestFiles(rootDir: string): Promise<string[]> {
  const testPatterns = [
    'apps/api/lego-api/domains/**/__tests__/**/*.ts',
    'apps/web/**/src/**/__tests__/**/*.{ts,tsx}',
    'apps/web/**/src/**/*.test.{ts,tsx}',
    'packages/core/api-client/src/**/__tests__/**/*.ts',
    'packages/backend/database-schema/**/__tests__/**/*.ts',
  ]

  const allTestFiles: string[] = []

  for (const pattern of testPatterns) {
    const files = await glob(pattern, {
      cwd: rootDir,
      absolute: true,
      nodir: true,
    })

    allTestFiles.push(...files)
  }

  return Array.from(new Set(allTestFiles))
}
