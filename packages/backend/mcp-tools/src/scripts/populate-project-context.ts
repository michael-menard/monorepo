/**
 * Populate Project Context Cache
 *
 * Reads CLAUDE.md and docs in docs/tech-stack/ and docs/testing/,
 * extracts structured JSONB per domain, and writes 5 discrete cache entries
 * to wint.context_packs via contextCachePut().
 *
 * Each entry is a targeted, summarized JSONB pack — not a raw file dump —
 * optimized for agent injection under 2000 tokens per pack.
 *
 * @example Run from monorepo root
 * ```bash
 * pnpm tsx packages/backend/mcp-tools/src/scripts/populate-project-context.ts
 * ```
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 * (lego_dev at port 5432 — NOT the KB database at port 5433)
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { contextCachePut } from '../context-cache/context-cache-put.js'

// TTL: 30 days in seconds
const TTL_30_DAYS = 2592000

// Resolve from monorepo root (packages/backend/mcp-tools/src/scripts -> ../../../../..)
const MONOREPO_ROOT = resolve(import.meta.dirname ?? __dirname, '../../../../../')

/** Summary results returned from populateProjectContext() */
export const PopulateResultSchema = z.object({
  attempted: z.number(),
  succeeded: z.number(),
  failed: z.number(),
})
export type PopulateResult = z.infer<typeof PopulateResultSchema>

/**
 * Reads a file relative to the monorepo root. Returns null if not found.
 */
function readDoc(relPath: string): string | null {
  try {
    return readFileSync(resolve(MONOREPO_ROOT, relPath), 'utf-8')
  } catch (err) {
    logger.warn('[populate-project-context] Could not read source doc', {
      path: relPath,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Extract sections from a markdown file by ## heading.
 * Returns a map of heading → content.
 */
function extractSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {}
  let currentHeading = '__preamble__'
  let buffer: string[] = []

  for (const line of raw.split('\n')) {
    if (line.startsWith('## ')) {
      if (buffer.length > 0) {
        sections[currentHeading] = buffer.join('\n').trim()
      }
      currentHeading = line.replace(/^##\s+/, '').trim()
      buffer = []
    } else {
      buffer.push(line)
    }
  }

  if (buffer.length > 0) {
    sections[currentHeading] = buffer.join('\n').trim()
  }

  return sections
}

/**
 * Extract structured content from CLAUDE.md.
 * packType: architecture, packKey: project-conventions
 */
function extractProjectConventions(raw: string) {
  const sections = extractSections(raw)

  const rules: string[] = [
    'Zod-first types — never use TypeScript interfaces',
    'No barrel files — import directly from source files',
    'Use @repo/logger for all logging — never console.log',
    'Component directory: index.tsx + __tests__/ + __types__/ + utils/',
    'Use @repo/ui for UI components — never import from individual paths',
    'Prefix unused variables with _ to satisfy linter',
    'Functional components only; named exports preferred',
  ]

  const patterns: string[] = [
    'Prettier: no semicolons, single quotes, trailing commas, 100 char line width, 2 space indent',
    'TypeScript strict mode; noImplicitAny: false (any allowed but discouraged)',
    'Zod schema: const FooSchema = z.object({...}); type Foo = z.infer<typeof FooSchema>',
    'Component dir: MyComponent/index.tsx, MyComponent/__tests__/MyComponent.test.tsx, MyComponent/__types__/index.ts',
    'Arrow parens: x => x not (x) => x',
    'Conventional commits: feat:, fix:, docs:, refactor:',
    'Quality gates: TypeScript, ESLint, tests, Prettier must all pass',
  ]

  const commands: string[] = [
    'pnpm dev — start full dev environment',
    'pnpm build — build all packages',
    'pnpm check-types — type check changed files',
    'pnpm test — test changed files',
    'pnpm check-types:all — type check everything',
    'pnpm test:all — test everything',
    'Use /lint-fix instead of pnpm lint directly',
  ]

  const projectStructure = sections['Project Structure'] ?? ''
  const summary =
    'Core project conventions for LEGO MOC platform TypeScript monorepo. ' +
    'Enforces Zod-first types, no barrel files, @repo/logger, and component directory structure. ' +
    (projectStructure ? 'Structure: apps/(api,web), packages/(core,backend). ' : '') +
    'Pre-push hooks run lint, type-check, and tests.'

  return { summary, rules, patterns, commands }
}

/**
 * Extract structured content from docs/tech-stack/backend.md.
 * packType: architecture, packKey: tech-stack-backend
 */
function extractTechStackBackend(_raw: string) {
  const summary =
    'AWS serverless backend: Lambda for compute, API Gateway for HTTP routing, ' +
    'Aurora PostgreSQL for transactional data. All inputs/outputs validated with Zod.'

  const rules: string[] = [
    'Validate all external inputs and outputs with Zod schemas',
    'Keep Lambdas focused and single-responsibility',
    'Prefer composition over large multi-purpose handlers',
    'Each operation maps to its own Lambda where practical',
  ]

  const patterns: string[] = [
    'AWS Lambda: serverless compute in apps/api',
    'Amazon API Gateway (APIGW): routes HTTP requests to Lambda handlers',
    'Amazon Aurora PostgreSQL: primary relational database for transactional data',
    'TypeScript for Lambda handlers and shared backend code',
    'packages/backend/* — shared backend utilities and data access helpers',
    'Drizzle ORM v0.44.3 for type-safe database access',
    '@repo/db for connection pooling',
  ]

  return { summary, rules, patterns }
}

/**
 * Extract structured content from docs/tech-stack/frontend.md.
 * packType: architecture, packKey: tech-stack-frontend
 */
function extractTechStackFrontend(_raw: string) {
  const summary =
    'React 19 frontend with Tailwind CSS and shadcn/ui primitives. ' +
    'apps/web/main-app and apps/web/app-dashboard. Shared component library at @repo/app-component-library.'

  const rules: string[] = [
    'Functional components only',
    'Named exports preferred',
    'No barrel files — import from concrete paths',
    'No hardcoded colors — use design system tokens via Tailwind',
  ]

  const patterns: string[] = [
    'React 19: UI framework for apps/web/*',
    'TypeScript strict mode for all frontend code',
    'Tailwind CSS: utility-first styling',
    'shadcn/ui: base component primitives at _primitives/ (thin wrappers around Radix)',
    '@repo/app-component-library: feature components compose primitives (buttons/, cards/, selects/)',
    'app-component-library/_primitives/: raw shadcn/Radix wrappers wired to our Tailwind theme + cn',
    'Vitest + React Testing Library for component tests',
    'Components alongside tests in __tests__ directories',
  ]

  return { summary, rules, patterns }
}

/**
 * Extract structured content from docs/tech-stack/monorepo.md.
 * packType: architecture, packKey: tech-stack-monorepo
 */
function extractTechStackMonorepo(_raw: string) {
  const summary =
    'pnpm + Turborepo monorepo: fast builds with caching, clear boundaries between apps and packages. ' +
    'apps/ for user-facing applications; packages/ for shared libraries.'

  const rules: string[] = [
    'Use pnpm commands — never edit package.json manually',
    'Workspace dependencies use workspace:*',
    'Prefer running tasks via pnpm scripts at the root',
    'Keep tasks declarative in turbo.json',
    'Avoid per-package duplication of common scripts',
  ]

  const patterns: string[] = [
    'pnpm: workspace management, shared lockfile at root',
    'Turborepo: task orchestration, caching, parallelization',
    'Turborepo pipelines: build (all affected), lint (affected), test (affected)',
    'pnpm install — install dependencies',
    'pnpm dev — start the full dev environment',
    'pnpm build — build all apps and packages',
    'apps/: user-facing applications (APIs, web apps)',
    'packages/: shared libraries (UI, core utilities, backend helpers)',
  ]

  return { summary, rules, patterns }
}

/**
 * Extract structured content from docs/testing/overview.md.
 * packType: test_patterns, packKey: testing-strategy
 */
function extractTestingStrategy(_raw: string) {
  const summary =
    'Vitest + React Testing Library for unit/integration tests. Playwright for E2E browser tests. ' +
    'MSW for HTTP mocking in unit tests (not in E2E). Minimum 45% global coverage.'

  const rules: string[] = [
    'Minimum global coverage target: 45%',
    'Use MSW to mock external HTTP calls in unit/integration tests',
    'Do NOT use MSW in Playwright E2E — target real or fully integrated services',
    'Keep tests deterministic and isolated',
    'Prefer testing behavior over implementation details',
    'Add tests with every significant feature or bugfix',
  ]

  const patterns: string[] = [
    'Vitest: unit and integration test runner',
    'React Testing Library: testing React components',
    'Playwright: E2E browser tests under apps/web/playwright',
    'MSW (Mock Service Worker): mock HTTP requests in unit/integration only',
    'BDD-style test names that read like user flows',
    'Prefer it.each for covering multiple input/output cases',
    'Use semantic queries: getByRole, getByLabelText',
    'Tests in __tests__ directories alongside source files',
    'E2E: focus on core user journeys (sign-in, key flows, critical actions)',
    'Mocks setup in src/test/setup.ts',
  ]

  return { summary, rules, patterns }
}

/**
 * Populate project context cache from CLAUDE.md and tech-stack docs.
 *
 * Writes 5 entries to wint.context_packs:
 * - architecture/project-conventions (from CLAUDE.md)
 * - architecture/tech-stack-backend (from docs/tech-stack/backend.md)
 * - architecture/tech-stack-frontend (from docs/tech-stack/frontend.md)
 * - architecture/tech-stack-monorepo (from docs/tech-stack/monorepo.md)
 * - test_patterns/testing-strategy (from docs/testing/overview.md)
 *
 * Individual failures are logged but do not abort the run.
 *
 * @returns Summary with attempted, succeeded, failed counts
 */
export async function populateProjectContext(): Promise<PopulateResult> {
  const results: PopulateResult = { attempted: 0, succeeded: 0, failed: 0 }

  const packDefs = [
    {
      packType: 'architecture' as const,
      packKey: 'project-conventions',
      sourceFile: 'CLAUDE.md',
      extract: extractProjectConventions,
    },
    {
      packType: 'architecture' as const,
      packKey: 'tech-stack-backend',
      sourceFile: 'docs/tech-stack/backend.md',
      extract: extractTechStackBackend,
    },
    {
      packType: 'architecture' as const,
      packKey: 'tech-stack-frontend',
      sourceFile: 'docs/tech-stack/frontend.md',
      extract: extractTechStackFrontend,
    },
    {
      packType: 'architecture' as const,
      packKey: 'tech-stack-monorepo',
      sourceFile: 'docs/tech-stack/monorepo.md',
      extract: extractTechStackMonorepo,
    },
    {
      packType: 'test_patterns' as const,
      packKey: 'testing-strategy',
      sourceFile: 'docs/testing/overview.md',
      extract: extractTestingStrategy,
    },
  ]

  for (const pack of packDefs) {
    results.attempted++
    try {
      const raw = readDoc(pack.sourceFile)
      if (raw === null) {
        logger.warn('[populate-project-context] Skipping pack — source doc unreadable', {
          packKey: pack.packKey,
          sourceFile: pack.sourceFile,
        })
        results.failed++
        continue
      }

      const content = pack.extract(raw)
      const written = await contextCachePut({
        packType: pack.packType,
        packKey: pack.packKey,
        content,
        ttl: TTL_30_DAYS,
      })

      if (written) {
        logger.info('[populate-project-context] Pack written', {
          packType: pack.packType,
          packKey: pack.packKey,
        })
        results.succeeded++
      } else {
        logger.error('[populate-project-context] Pack write returned null', {
          packKey: pack.packKey,
        })
        results.failed++
      }
    } catch (error) {
      logger.error('[populate-project-context] Pack write failed', {
        packKey: pack.packKey,
        error: error instanceof Error ? error.message : String(error),
      })
      results.failed++
    }
  }

  return results
}

// Run as script if executed directly
const isMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.endsWith('populate-project-context.ts') ||
    process.argv[1]?.endsWith('populate-project-context.js'))

if (isMain) {
  populateProjectContext()
    .then(summary => {
      logger.info('[populate-project-context] Done', summary)
      process.exit(summary.failed > 0 ? 1 : 0)
    })
    .catch(err => {
      logger.error('[populate-project-context] Fatal error', {
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    })
}
