# CLAUDE.md - Project Guidelines

## Overview

This is a TypeScript monorepo (pnpm + Turborepo) for a LEGO MOC instructions platform. React 19 frontend with AWS serverless backend.

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
- **NO NEW BARREL FILES** – import directly from source files for new code
- Existing barrel files may remain for now (do not refactor them as part of unrelated work)

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

### UI Components - App Component Library (@repo/app-component-library)

- For application code (apps/), import UI from `@repo/app-component-library`.
- Use the **app-level components** (e.g. `AppDialog`, `AppButton`, etc.) where they exist.
- Only add or modify `_primitives` inside the `app-component-library` package itself.
- Do **not** import directly from `_primitives` in app code.

```typescript
// CORRECT (app code)
import { Button, Dialog, Form } from '@repo/app-component-library'

// WRONG - do not import primitives directly from the internal folder
import { Button as PrimitiveButton } from '@repo/app-component-library/src/_primitives/button'
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

1. Don't create new barrel files (index.ts re-exports); leave existing ones in place unless a story explicitly calls for refactoring
2. Don't import shadcn components from individual paths
3. Don't use console.log - use @repo/logger
4. Don't skip type errors - fix them
5. Don't hardcode colors - use Tailwind classes
6. Don't use TypeScript interfaces - use Zod schemas with `z.infer<>`
