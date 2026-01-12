# CLAUDE.md - Project Guidelines

## Overview

This is a TypeScript monorepo (pnpm + Turborepo) for a LEGO MOC instructions platform. React 19 frontend with AWS serverless backend.

## Tech Stack

### Monorepo Tooling
- **pnpm** for package management and workspaces across all apps and packages in the monorepo
- **Turborepo** for orchestrating builds, tests, and linting with caching and parallelization
- See also: [Monorepo tooling details](./docs/tech-stack/monorepo.md)

### Frontend
- **React 19** for the main UI layer in `apps/web/*`
- **Tailwind CSS** for utility-first styling across all React apps
- **shadcn/ui** as the base component primitives, wrapped in our app component library under `packages/core/app-component-library`
- See also: [Frontend architecture](./docs/tech-stack/frontend.md)

### Backend
- **AWS Lambda** for serverless compute, deployed via the `apps/api` project
- **Amazon API Gateway (APIGW)** for HTTP APIs and routing into Lambda handlers
- **Amazon Aurora PostgreSQL** as the primary relational database for transactional data
- See also: [Backend & data architecture](./docs/tech-stack/backend.md)

### Testing
- **Vitest** for unit and integration tests across apps and packages
- **Playwright** for end-to-end browser tests in `apps/web/playwright`
- **MSW (Mock Service Worker)** for API mocking in unit/integration tests (not used in Playwright E2E)
- See also: [Testing strategy](./docs/testing/overview.md)

## Quick Commands

```bash
pnpm dev                  # Start full dev environment
pnpm build                # Build all packages
pnpm lint                 # Lint changed files
pnpm check-types          # Type check changed files
pnpm test                 # Test changed files
pnpm lint:all             # Lint everything
pnpm check-types:all      # Type check everything
pnpm test:all             # Test everything
```

## Project Structure

```
apps/
  api/                    # Serverless API (AWS Lambda)
  web/                    # Web applications
    main-app/             # Primary user-facing app
    app-dashboard/        # Dashboard app
    playwright/           # E2E tests
packages/
  core/                   # Shared core packages
    app-component-library/  # UI primitives + app-level components (@repo/app-component-library)
    logger/               # Logging utility (@repo/logger)
    design-system/        # Design tokens
    accessibility/        # A11y utilities
  backend/                # Backend utilities
```

### App Component Library Architecture (@repo/app-component-library)

- `_primitives/` = raw shadcn/Radix wrappers
  - Things like `Button`, `Tabs`, `Select`, `DropdownMenu`, etc. live here.
  - They are as close as possible to the original shadcn components, just wired to our Tailwind theme + `cn`.
- Feature folders (e.g. `buttons/`, `cards/`, `selects/`, etc.) = app‑level variations
  - Components like `CustomButton`, `AppSelect`, `StatsCards`, etc. compose or wrap the primitives with app‑specific behavior and opinionated APIs.

## Code Style

### Formatting (Prettier - auto-enforced)

- No semicolons
- Single quotes
- Trailing commas always
- 100 char line width
- 2 space indentation
- Arrow parens: `x => x` not `(x) => x`

### TypeScript

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

Benefits: Runtime validation, automatic type inference, self-documenting constraints.

### Components

- Functional components only (function declarations)
- Named exports preferred
- **NO BARREL FILES** - import directly from source files

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

Example:

```
UserProfile/
  index.tsx
  __tests__/
    UserProfile.test.tsx
  __types__/
    index.ts             # UserProfileSchema, UserProfilePropsSchema, etc.
  utils/
    formatUserData.ts
    index.ts
```

Notes:

- Shared types go in a central `__types__` directory, not component-local
- The `utils/` directory is for component-specific helper functions
- Import the component via its parent directory: `import { UserProfile } from './UserProfile'`

## Critical Import Rules

### UI Components - ALWAYS use @repo/ui

```typescript
// CORRECT
import { Button, Card, Table } from '@repo/ui'

// WRONG - never import from individual paths
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

- LEGO-inspired theme: Sky/Teal color palette
- Tailwind CSS for styling
- Framer Motion for animations
- Accessibility-first: ARIA labels, keyboard nav, focus management

## Quality Gates

All code must pass before commit, and **all new additions must pass linting and tests**:

1. TypeScript compilation
2. ESLint (no errors, warnings addressed) on all new/changed code
3. All relevant tests pass (unit, integration, and E2E where applicable) for new/changed code
4. Prettier formatting

## Package Management

- Use `pnpm` commands - never edit package.json manually
- Workspace dependencies use `workspace:*`

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Pre-push hooks run lint, type-check, and tests

## Common Pitfalls

1. Don't create barrel files (index.ts re-exports)
2. Don't import shadcn components from individual paths
3. Don't use console.log - use @repo/logger
4. Don't skip type errors - fix them
5. Don't hardcode colors - use Tailwind classes
6. Don't use TypeScript interfaces - use Zod schemas with `z.infer<>`
