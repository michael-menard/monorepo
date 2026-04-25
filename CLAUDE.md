# CLAUDE.md - Project Guidelines

## Overview

This is a TypeScript monorepo (pnpm + Turborepo) for a personal LEGO building app. See `PRODUCT.md` for domain context and `DESIGN.md` for design and UX guidance.

## Tech Stack

### Monorepo Tooling

- **pnpm** for package management and workspaces across all apps and packages
- **Turborepo** for orchestrating builds, tests, and linting with caching and parallelization
- See also: [Monorepo tooling details](./docs/tech-stack/monorepo.md)

### Frontend

- **React 19** + **Vite** for all web apps in `apps/web/*`
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** primitives wrapped in `@repo/app-component-library` — see `packages/core/CLAUDE.md` for the layering convention
- See also: [Frontend architecture](./docs/tech-stack/frontend.md)

### Backend

- **Bun** runtime with **Hono** framework
- **Hexagonal architecture** (Ports & Adapters) with composition root DI
- **Drizzle** ORM + **Drizzle Kit** for migrations
- **PostgreSQL** + **MinIO** in Docker, **AWS Cognito** for auth (only AWS service)
- **Zero trust** — validate at every boundary, Zod on all inputs
- See also: [Backend & data architecture](./docs/tech-stack/backend.md)

### Database Migrations (REQUIRED)

All database schema changes **must** go through Drizzle Kit. Never write raw SQL migration files by hand or run DDL statements directly.

1. **Update the Drizzle schema** (the `.ts` schema file is the source of truth)
2. **Generate the migration** with `pnpm drizzle-kit generate` (from the relevant app directory)
3. **Apply the migration** with `pnpm drizzle-kit migrate` (or `push` for dev)
4. **Verify** the generated SQL before applying

If Drizzle Kit cannot be run (e.g., no DB credentials available), **ask the user** before writing a migration file manually. Never silently hand-write migration SQL.

### Testing

- **Vitest** for unit and integration tests
- **Playwright** for end-to-end browser tests in `apps/web/playwright`
- **MSW (Mock Service Worker)** for API mocking in unit/integration tests (not used in Playwright E2E)
- See also: [Testing strategy](./docs/testing/overview.md)

## Quick Commands

```bash
pnpm dev                  # Start full dev environment
pnpm build                # Build all packages
pnpm check-types          # Type check changed files
pnpm test                 # Test changed files
pnpm check-types:all      # Type check everything
pnpm test:all             # Test everything
```

> **Linting:** Always use `/lint-fix` instead of `pnpm lint` directly. The skill runs lint with auto-fix, captures unfixable errors grouped by rule, and surfaces config improvement candidates.

## Project Structure

```
apps/
  api/                      # Backend services (see apps/api/CLAUDE.md)
    lego-api/               # Main product API (Bun + Hono)
    knowledge-base/         # KB MCP server (see apps/api/knowledge-base/CLAUDE.md)
    workflow/               # Being rearchitected (see apps/api/workflow/CLAUDE.md)
    notifications-server/   # Real-time notifications
  web/                      # Micro-apps (see apps/web/CLAUDE.md for full inventory)
    main-app/               # Shell — hosts all micro-apps
    app-dashboard/          # Collection overview and stats
    app-design-system/      # Design system reference (Next.js, port 8036)
    app-*-gallery/          # Collection browsers (sets, MOCs, minifigs, wishlist, inspiration)
    app-scraper-queue/      # Scraper queue management
    playwright/             # E2E tests
  scrapers/                 # Data scrapers (Rebrickable, BrickLink, LEGO.com)
  data/                     # Data utilities
packages/
  core/                     # Shared frontend packages (see packages/core/CLAUDE.md)
    app-component-library/  # UI primitives + app-level components (@repo/ui)
    design-system/          # Design tokens, CSS variables, Tailwind preset
    logger/                 # Structured logging (@repo/logger)
  backend/                  # Shared backend packages (@repo/db, @repo/api-core, etc.)
infra/
  ports.json                # Canonical port registry — never hardcode ports
```

Nested `CLAUDE.md` files exist in key directories for area-specific conventions and gotchas.

## Working Principles

### See Something, Fix Something

If you encounter an issue while working:

- **Easy fix** — fix it inline, don't ignore it
- **Moderate complexity** — stop and ask the user how to proceed
- **Large scope** — create a plan in the KB for later, flag it to the user

**Never** say "not my problem" or "out of scope" and move on silently.

### No Code Without Proof

All code changes require tests. "Done" means tests exist and pass.

- **New component** — unit tests + integration test showing it renders correctly
- **Bug fix** — regression test proving the bug is fixed
- **API endpoint** — integration test hitting the endpoint
- **Refactor** — existing tests still pass

**Mocking rules:**

- **Mock** external dependencies: API calls, database calls, imported modules, file system, third-party services
- **Never mock** the code under test — the function, component, or module being exercised must run its real implementation
- Tests must exercise **real behavior**. A test that mocks the function it's testing to return true is worthless.

## Code Style

### Formatting (Prettier - auto-enforced)

- No semicolons
- Single quotes
- Trailing commas always
- 100 char line width
- 2 space indentation
- Arrow parens: `x => x` not `(x) => x`

### TypeScript

- ES7+ TypeScript — use modern syntax
- Strict mode enabled
- `noImplicitAny: false` (any is allowed but discouraged)
- **ALWAYS use Zod schemas for types - never use TypeScript interfaces**

### Zod-First Types (REQUIRED)

```typescript
// CORRECT - Zod schema with inferred type
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
})

type User = z.infer<typeof UserSchema>

// WRONG - never use interfaces or type aliases without Zod
interface User {
  id: string
  email: string
  name: string
}
```

### Components

- Functional components only (function declarations)
- Named exports preferred
- **NO BARREL FILES** - import directly from source files
- **Component decomposition** — break components down aggressively, maximize reuse

### Component Directory Structure (REQUIRED)

```
MyComponent/
  index.tsx              # Main component file
  __tests__/
    MyComponent.test.tsx # Component tests
  __types__/
    index.ts             # Zod schemas for this component (unless shared)
  utils/
    index.ts             # Component-specific utilities
```

**Colocation rule:** Sub-components, utils, tests, and types live next to the component they serve. Extract to a shared location (`packages/`) only when a second consumer needs it.

## Critical Import Rules

### UI Components - ALWAYS use @repo/ui

```typescript
// CORRECT
import { Button, Card, Table } from '@repo/ui'

// WRONG - never import from individual paths or primitives
import { Button } from '@repo/ui/button'
```

### Logging - ALWAYS use @repo/logger

```typescript
// CORRECT
import { logger } from '@repo/logger'
logger.info('message')

// WRONG - never use console
console.log('message')
```

## Testing

- Framework: Vitest + React Testing Library
- Minimum coverage: 45% global
- Use semantic queries: `getByRole`, `getByLabelText`
- Mocks in `src/test/setup.ts`

## Design System

- **Theme:** Dark Academia (v3.0.0) — warm earth tones, forest greens, burgundy accents
- **Reference site:** `apps/web/app-design-system` (port 8036) — the single source of truth
- **Fonts:** Cormorant Garamond (`font-heading`), Lora (`font-body`), Geist Mono (`font-mono`), Geist (`font-sans`)
- **Colors:** oklch color space, semantic tokens only — never use direct colors like `bg-white` or `text-black`
- **Docs:** `apps/web/app-design-system/docs/STYLE_GUIDE.md` for quick reference
- Tailwind CSS for styling
- Framer Motion for animations
- Accessibility-first: ARIA labels, keyboard nav, focus management
- **Before writing or modifying UI components**, search the KB for "design system" to get current theme tokens, typography, spacing, and component patterns

## Quality Gates

All code must pass before commit, and **all new additions must pass linting and tests**:

1. TypeScript compilation
2. ESLint (no errors, warnings addressed) on all new/changed code
3. All relevant tests pass (unit, integration, and E2E where applicable) for new/changed code
4. Prettier formatting

## Package Management

- Use `pnpm` commands - never edit package.json manually
- Workspace dependencies use `workspace:*`

### Package Exports (REQUIRED)

All packages under `packages/` **must export built JavaScript + declaration files from `dist/`**, not raw TypeScript source. See `packages/core/CLAUDE.md` for details.

### Worktree Awareness

This repo uses git worktrees. Worktrees share `node_modules` with the main tree but **do not share `dist/` output**. The `^build` dependency in turbo's `dev` task ensures packages are built before dev servers start, even in fresh worktrees.

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Pre-push hooks run lint, type-check, and tests

## Agents

Claude agents live in `.claude/agents/*.agent.md`.

## Common Pitfalls

1. Don't create barrel files (index.ts re-exports)
2. Don't import shadcn components directly — use `@repo/ui`
3. Don't use console.log — use `@repo/logger`
4. Don't skip type errors — fix them
5. Don't hardcode colors — use semantic Tailwind tokens
6. Don't use TypeScript interfaces — use Zod schemas with `z.infer<>`
7. Prefix intentionally unused variables with `_` (e.g., `_unused`) — the linter ignores `_`-prefixed names
8. Don't hardcode ports — use `infra/ports.json`
9. Don't mock the code under test — mock external dependencies only
10. Don't write migration SQL by hand — use Drizzle Kit to generate migrations from schema changes
