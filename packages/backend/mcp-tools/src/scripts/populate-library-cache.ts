/**
 * Populate Library Cache
 *
 * Reads CLAUDE.md and docs/tech-stack/*.md, extracts structured JSONB per library,
 * and writes 4 discrete cache entries to wint.context_packs via contextCachePut().
 *
 * @example Run from monorepo root
 * ```bash
 * pnpm tsx packages/backend/mcp-tools/src/scripts/populate-library-cache.ts
 * ```
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { contextCachePut } from '../context-cache/context-cache-put.js'
import { readDoc as readDocUtil } from './utils/read-doc.js'

// TTL: 30 days in seconds
const TTL_30_DAYS = 2592000

// ============================================================================
// Zod Schemas
// ============================================================================

/** Summary results returned from populateLibraryCache() */
export const PopulateResultSchema = z.object({
  attempted: z.number(),
  succeeded: z.number(),
  failed: z.number(),
})
export type PopulateResult = z.infer<typeof PopulateResultSchema>

/** Structured content for a single library pack */
export const LibraryContentSchema = z.object({
  summary: z.string(),
  patterns: z.array(z.string()),
  rules: z.array(z.string()),
  examples: z.array(z.string()).optional(),
})
export type LibraryContent = z.infer<typeof LibraryContentSchema>

// ============================================================================
// File helpers
// ============================================================================

const CALLER_TAG = '[populate-library-cache]'

/**
 * Reads a file relative to the monorepo root. Returns null if not found.
 */
function readDoc(relPath: string): string | null {
  return readDocUtil(relPath, CALLER_TAG)
}

// ============================================================================
// Extraction functions — hardcoded codebase-specific patterns
// ============================================================================

/**
 * Extract React 19 patterns for LEGO MOC platform.
 * packType: codebase, packKey: lib-react19
 */
function extractReact19Patterns(_doc: string): LibraryContent {
  return {
    summary:
      'React 19 patterns for LEGO MOC platform. Functional components only, named exports, strict mode TypeScript.',
    patterns: [
      'React 19 with TypeScript strict mode',
      'Functional components only — no class components',
      'Named exports preferred over default exports',
      'Component dir structure: MyComponent/index.tsx + __tests__/ + __types__/ + utils/',
      'shadcn/ui primitives at _primitives/ — thin Radix wrappers wired to Tailwind theme',
      'Feature components compose primitives into app-specific components (buttons/, cards/, selects/)',
      '@repo/app-component-library for shared components',
      'Vitest + React Testing Library for component tests',
    ],
    rules: [
      'No barrel files — import from concrete source paths',
      'No hardcoded colors — use design system tokens via Tailwind',
      'Use semantic test queries: getByRole, getByLabelText',
      'Components live alongside tests in __tests__ directories',
    ],
  }
}

/**
 * Extract Tailwind CSS patterns for LEGO MOC platform.
 * packType: codebase, packKey: lib-tailwind
 */
function extractTailwindPatterns(_doc: string): LibraryContent {
  return {
    summary:
      'Tailwind CSS utility-first styling for LEGO MOC platform. Sky/Teal color palette, design system tokens, no hardcoded colors.',
    patterns: [
      'Tailwind CSS for all styling — utility-first approach',
      'Design system tokens via Tailwind config — never hardcode colors',
      'LEGO-inspired theme: Sky/Teal color palette',
      'Framer Motion for animations',
      'cn() utility for conditional class merging',
      'Prettier formats to 100 char line width',
    ],
    rules: [
      'No hardcoded colors — always use Tailwind classes from design system',
      'Use cn() for conditional styling, not string concatenation',
      'Accessibility-first: ARIA labels, keyboard nav, focus management',
      '2 space indentation in all files',
    ],
  }
}

/**
 * Extract Zod patterns for LEGO MOC platform.
 * packType: codebase, packKey: lib-zod
 */
function extractZodPatterns(_doc: string): LibraryContent {
  return {
    summary:
      'Zod-first type system for LEGO MOC platform. All types derived from Zod schemas — never use TypeScript interfaces.',
    patterns: [
      'const FooSchema = z.object({...}); type Foo = z.infer<typeof FooSchema>',
      'Runtime validation + automatic type inference from single Zod schema source',
      'z.string().uuid() for IDs, z.string().email() for emails',
      'z.string().min(1) for required strings',
      'z.array(z.string()) for string arrays',
      'z.record(z.unknown()) for flexible JSONB content',
    ],
    rules: [
      'NEVER use TypeScript interfaces — always use Zod schemas with z.infer<>',
      'All external inputs validated with Zod at system boundaries',
      'Schema naming: PascalCase + Schema suffix (e.g., UserSchema, PopulateResultSchema)',
      'Prefer z.infer<typeof Schema> over manual type declarations',
    ],
  }
}

/**
 * Extract Vitest patterns for LEGO MOC platform.
 * packType: codebase, packKey: lib-vitest
 */
function extractVitestPatterns(_doc: string): LibraryContent {
  return {
    summary:
      'Vitest testing patterns for LEGO MOC platform. Minimum 45% coverage, semantic queries, MSW for API mocking.',
    patterns: [
      'Vitest for unit and integration tests across apps and packages',
      'React Testing Library for component testing with semantic queries',
      'Playwright for E2E browser tests in apps/web/playwright',
      'MSW (Mock Service Worker) for API mocking in unit/integration tests only',
      'Tests in __tests__ directories alongside source files',
      'BDD-style test names that read like user flows',
    ],
    rules: [
      'Minimum global coverage target: 45%',
      'Use semantic queries: getByRole, getByLabelText — not getByTestId',
      'MSW for unit/integration only — NOT in Playwright E2E tests',
      'Mocks setup in src/test/setup.ts',
      'Keep tests deterministic and isolated',
    ],
  }
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Populate library cache from CLAUDE.md and tech-stack docs.
 *
 * Writes 4 entries to wint.context_packs:
 * - codebase/lib-react19 (from docs/tech-stack/frontend.md)
 * - codebase/lib-tailwind (from docs/tech-stack/frontend.md + CLAUDE.md)
 * - codebase/lib-zod (from CLAUDE.md)
 * - codebase/lib-vitest (from docs/tech-stack/backend.md)
 *
 * Individual failures are logged but do not abort the run.
 *
 * @returns Summary with attempted, succeeded, failed counts
 */
export async function populateLibraryCache(opts?: {
  contextCachePutFn?: typeof contextCachePut
  readDocFn?: (relPath: string) => string | null
}): Promise<PopulateResult> {
  const putFn = opts?.contextCachePutFn ?? contextCachePut
  const readFn = opts?.readDocFn ?? readDoc
  const results: PopulateResult = { attempted: 0, succeeded: 0, failed: 0 }

  const packDefs = [
    {
      packType: 'codebase' as const,
      packKey: 'lib-react19',
      sourceFiles: ['docs/tech-stack/frontend.md'],
      extract: extractReact19Patterns,
    },
    {
      packType: 'codebase' as const,
      packKey: 'lib-tailwind',
      sourceFiles: ['docs/tech-stack/frontend.md', 'CLAUDE.md'],
      extract: extractTailwindPatterns,
    },
    {
      packType: 'codebase' as const,
      packKey: 'lib-zod',
      sourceFiles: ['CLAUDE.md'],
      extract: extractZodPatterns,
    },
    {
      packType: 'codebase' as const,
      packKey: 'lib-vitest',
      sourceFiles: ['docs/tech-stack/backend.md'],
      extract: extractVitestPatterns,
    },
  ]

  for (const pack of packDefs) {
    results.attempted++
    try {
      // Read all source files; use the first non-null result
      let raw: string | null = null
      for (const sourceFile of pack.sourceFiles) {
        raw = readFn(sourceFile)
        if (raw !== null) break
      }

      if (raw === null) {
        logger.warn('[populate-library-cache] Skipping pack — all source docs unreadable', {
          packKey: pack.packKey,
          sourceFiles: pack.sourceFiles,
        })
        results.failed++
        continue
      }

      const content = pack.extract(raw)
      const written = await putFn({
        packType: pack.packType,
        packKey: pack.packKey,
        content,
        ttl: TTL_30_DAYS,
      })

      if (written) {
        logger.info('[populate-library-cache] Pack written', {
          packType: pack.packType,
          packKey: pack.packKey,
        })
        results.succeeded++
      } else {
        logger.error('[populate-library-cache] Pack write returned null', {
          packKey: pack.packKey,
        })
        results.failed++
      }
    } catch (error) {
      logger.error('[populate-library-cache] Pack write failed', {
        packKey: pack.packKey,
        error: error instanceof Error ? error.message : String(error),
      })
      results.failed++
    }
  }

  return results
}

// ============================================================================
// Script entry point
// ============================================================================

// Run as script if executed directly
const isMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.endsWith('populate-library-cache.ts') ||
    process.argv[1]?.endsWith('populate-library-cache.js'))

if (isMain) {
  populateLibraryCache()
    .then(summary => {
      logger.info('[populate-library-cache] Done', summary)
      process.exit(summary.failed > 0 ? 1 : 0)
    })
    .catch(err => {
      logger.error('[populate-library-cache] Fatal error', {
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    })
}
