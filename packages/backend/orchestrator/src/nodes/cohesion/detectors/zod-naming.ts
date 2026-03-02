/**
 * Zod Naming Convention Detector
 *
 * Detects violations of the Zod naming convention:
 * - Zod schemas must be named with a `Schema` suffix (e.g. `UserSchema`)
 * - The inferred type alias must match the schema name without the suffix
 * - z.infer<typeof XSchema> must be assigned to a `type X =` declaration
 *
 * Story: APIP-4020 - Cohesion Scanner
 */

import { readFileSync } from 'fs'
import { PatternViolationSchema } from '../__types__/index.js'
import type { PatternViolation } from '../__types__/index.js'

// ============================================================================
// Patterns
// ============================================================================

/** Matches Zod schema definitions without the Schema suffix */
const BAD_SCHEMA_NAME_PATTERN =
  /\bconst\s+([A-Z][a-zA-Z0-9]*(?<!Schema))\s*=\s*z\.(object|array|string|number|boolean|enum|union|intersection|record|tuple)\(/g

/** Matches `z.infer<typeof ...>` usage */
const ZOD_INFER_PATTERN = /z\.infer<typeof\s+(\w+)>/g

/** Matches type alias declarations for Zod inferred types */
const TYPE_ALIAS_PATTERN = /^(?:export\s+)?type\s+(\w+)\s*=\s*z\.infer<typeof\s+(\w+)>/gm

/** Matches valid schema definitions (name ending in Schema) */
const VALID_SCHEMA_NAME_PATTERN =
  /\bconst\s+([A-Z][a-zA-Z0-9]*Schema)\s*=\s*z\.(object|array|string|number|boolean|enum|union|intersection|record|tuple)\(/g

// ============================================================================
// Detector
// ============================================================================

/**
 * Detects Zod naming convention violations in a TypeScript file.
 *
 * AC-2, AC-3: Pure detector function returning PatternViolation[].
 *
 * @param filePath - Path to the TypeScript file to check
 * @returns Array of pattern violations found
 */
export function detectZodNamingViolations(filePath: string): PatternViolation[] {
  // Only check TypeScript files
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return []
  }

  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  // Skip files with no Zod usage
  if (!content.includes("from 'zod'") && !content.includes('from "zod"')) {
    return []
  }

  const violations: PatternViolation[] = []
  const lines = content.split('\n')

  // Rule 1: Zod schemas must be named with Schema suffix
  let match: RegExpExecArray | null
  BAD_SCHEMA_NAME_PATTERN.lastIndex = 0
  while ((match = BAD_SCHEMA_NAME_PATTERN.exec(content)) !== null) {
    const schemaName = match[1]
    // Skip if the name already ends with Schema (double-check)
    if (schemaName && !schemaName.endsWith('Schema')) {
      // Find the line number
      const beforeMatch = content.slice(0, match.index)
      const line = beforeMatch.split('\n').length

      violations.push(
        PatternViolationSchema.parse({
          category: 'zod-naming',
          rule: 'schema-missing-suffix',
          filePath,
          line,
          description:
            `Zod schema '${schemaName}' is missing the 'Schema' suffix. ` +
            `Rename to '${schemaName}Schema'.`,
          confidence: 'high',
        }),
      )
    }
  }

  // Rule 2: z.infer<typeof X> should have a matching `type X =` declaration
  const inferredNames = new Set<string>()
  ZOD_INFER_PATTERN.lastIndex = 0
  while ((match = ZOD_INFER_PATTERN.exec(content)) !== null) {
    if (match[1]) {
      inferredNames.add(match[1])
    }
  }

  // Collect declared type aliases
  const declaredAliases = new Map<string, string>() // typeName -> schemaName
  TYPE_ALIAS_PATTERN.lastIndex = 0
  while ((match = TYPE_ALIAS_PATTERN.exec(content)) !== null) {
    if (match[1] && match[2]) {
      declaredAliases.set(match[2], match[1])
    }
  }

  // Check that each valid schema with z.infer usage has a type alias
  VALID_SCHEMA_NAME_PATTERN.lastIndex = 0
  while ((match = VALID_SCHEMA_NAME_PATTERN.exec(content)) !== null) {
    const schemaName = match[1]
    if (schemaName && inferredNames.has(schemaName) && !declaredAliases.has(schemaName)) {
      const expectedTypeName = schemaName.replace(/Schema$/, '')
      const beforeMatch = content.slice(0, match.index)
      const line = beforeMatch.split('\n').length

      violations.push(
        PatternViolationSchema.parse({
          category: 'zod-naming',
          rule: 'missing-type-alias',
          filePath,
          line,
          description:
            `Schema '${schemaName}' is used with z.infer<> but has no corresponding ` +
            `'type ${expectedTypeName} = z.infer<typeof ${schemaName}>' declaration.`,
          confidence: 'medium',
        }),
      )
    }
  }

  // Suppress duplicates per file+rule+line
  const seen = new Set<string>()
  return violations.filter(v => {
    const key = `${v.rule}:${v.line ?? '?'}:${v.description.slice(0, 50)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
