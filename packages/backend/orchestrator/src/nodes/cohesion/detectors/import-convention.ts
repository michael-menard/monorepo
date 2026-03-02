/**
 * Import Convention Detector
 *
 * Detects violations of import conventions:
 * - console.log must not be used (use @repo/logger instead)
 * - shadcn components must be imported from @repo/ui (not individual paths)
 * - TypeScript interfaces should not be used (use Zod schemas instead)
 *
 * Story: APIP-4020 - Cohesion Scanner
 */

import { readFileSync } from 'fs'
import { PatternViolationSchema } from '../__types__/index.js'
import type { PatternViolation } from '../__types__/index.js'

// ============================================================================
// Patterns
// ============================================================================

/** Detects console.log/warn/error/info usage */
const CONSOLE_LOG_PATTERN = /\bconsole\.(log|warn|error|info|debug|trace)\s*\(/g

/** Detects imports from @repo/ui/* individual paths (wrong) */
const SHADCN_INDIVIDUAL_IMPORT_PATTERN = /from\s+['"]@repo\/ui\/([a-z-]+)['"]/g

/** Detects TypeScript interface declarations (should use Zod instead) */
const INTERFACE_PATTERN = /^(?:export\s+)?interface\s+([A-Z][a-zA-Z0-9]*)\s*(?:extends\s+\S+\s*)?\{/gm

/** Detects Zod imports (if present, interfaces may be intentionally minimal) */
const ZOD_IMPORT_PATTERN = /from\s+['"]zod['"]/

// ============================================================================
// Helpers
// ============================================================================

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

// ============================================================================
// Detector
// ============================================================================

/**
 * Detects import convention violations in a TypeScript file.
 *
 * AC-2, AC-3: Pure detector function returning PatternViolation[].
 *
 * @param filePath - Path to the file to check
 * @returns Array of pattern violations found
 */
export function detectImportConventionViolations(filePath: string): PatternViolation[] {
  // Only check TypeScript and TSX files
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return []
  }

  // Skip test files — console is acceptable in tests
  if (filePath.includes('__tests__') || filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) {
    return []
  }

  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const violations: PatternViolation[] = []

  // Rule 1: No console.log — use @repo/logger
  CONSOLE_LOG_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  const consoleLinesFound = new Set<number>()
  while ((match = CONSOLE_LOG_PATTERN.exec(content)) !== null) {
    const line = getLineNumber(content, match.index)
    if (!consoleLinesFound.has(line)) {
      consoleLinesFound.add(line)
      violations.push(
        PatternViolationSchema.parse({
          category: 'import-convention',
          rule: 'no-console-log',
          filePath,
          line,
          description:
            `console.${match[1]}() is not allowed. Use @repo/logger instead: ` +
            `import { logger } from '@repo/logger'; logger.info('message')`,
          confidence: 'high',
        }),
      )
    }
  }

  // Rule 2: Import shadcn from @repo/ui, not individual paths
  SHADCN_INDIVIDUAL_IMPORT_PATTERN.lastIndex = 0
  while ((match = SHADCN_INDIVIDUAL_IMPORT_PATTERN.exec(content)) !== null) {
    const line = getLineNumber(content, match.index)
    violations.push(
      PatternViolationSchema.parse({
        category: 'import-convention',
        rule: 'shadcn-individual-import',
        filePath,
        line,
        description:
          `Importing from '@repo/ui/${match[1]}' is not allowed. ` +
          `Import from '@repo/ui' instead: import { ${match[1]} } from '@repo/ui'`,
        confidence: 'high',
      }),
    )
  }

  // Rule 3: No TypeScript interface declarations in files that use Zod
  const hasZod = ZOD_IMPORT_PATTERN.test(content)
  if (hasZod) {
    INTERFACE_PATTERN.lastIndex = 0
    while ((match = INTERFACE_PATTERN.exec(content)) !== null) {
      const interfaceName = match[1]
      const line = getLineNumber(content, match.index)
      violations.push(
        PatternViolationSchema.parse({
          category: 'import-convention',
          rule: 'interface-instead-of-zod',
          filePath,
          line,
          description:
            `TypeScript interface '${interfaceName}' should be replaced with a Zod schema. ` +
            `Use: const ${interfaceName}Schema = z.object({...}); type ${interfaceName} = z.infer<typeof ${interfaceName}Schema>`,
          confidence: 'medium',
        }),
      )
    }
  }

  return violations
}
