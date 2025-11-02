# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Turborepo-based monorepo** for a LEGO MOC (My Own Creation) platform with separate backend services and a React frontend. The codebase follows strict conventions around shared packages, centralized configuration, and type safety.

**Core Philosophy:**

- Reuse over reinvention - always search `packages/` before creating new utilities
- Shared packages for common functionality
- Centralized environment configuration
- **TypeScript-only codebase** - no JavaScript files (except config files that require .js)
- **Zod schemas for all validation** - prefer Zod schemas + inferred types over manual type definitions
- Type-safe with TypeScript strict mode
- RTK Query for all data fetching (no axios/fetch in feature code)
- TanStack Router for routing (do not introduce alternatives)

## Commands

### Development

```bash
# Start entire development stack (infrastructure + all services)
pnpm dev

# Kill processes on application ports (if needed before starting)
pnpm kill-ports

# Start specific service types
pnpm dev:web        # Frontend only
pnpm dev:api        # API services only

# View service logs
pnpm logs:lego      # LEGO API logs

# Storybook (Design System)
pnpm storybook      # Start Storybook dev server (port 6007)
pnpm storybook:dev  # Alternative command for Storybook dev
pnpm build-storybook # Build Storybook for production
```

### Building & Type Checking

```bash
# Build all packages and apps with Turbo
pnpm build

# Build specific workspace
pnpm --filter lego-moc-instructions-app build
pnpm --filter @repo/ui build

# Type check all packages
pnpm check-types
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e                    # All E2E tests
pnpm test:e2e:auth               # Auth flow tests
pnpm test:e2e:navigation         # Navigation tests
pnpm test:e2e:headed             # Run with browser visible
pnpm test:e2e:debug              # Debug mode

# Test specific package
pnpm --filter @repo/ui test
pnpm --filter lego-moc-instructions-app test
```

### Linting & Formatting

```bash
pnpm lint           # Lint all code
pnpm lint:fix       # Auto-fix linting issues
pnpm format         # Format all code with Prettier
pnpm sync-deps      # Sync dependency versions across packages
pnpm sync-deps:check # Check for dependency version mismatches
```

### Database Operations

```bash
pnpm db:generate    # Generate Drizzle schema types
pnpm db:push        # Push schema changes to database
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed database with test data
pnpm db:studio      # Open Drizzle Studio (database GUI)
```

### Package Management

```bash
# Add dependency to specific package
pnpm --filter @repo/ui add [package]
pnpm --filter lego-moc-instructions-app add [package]

# Add dev dependency to root
pnpm add -Dw [package]

# Remove dependency
pnpm --filter [workspace] remove [package]
```

**Automatic Dependency Sync**: The monorepo automatically enforces consistent versions for common dependencies (React, TypeScript, ESLint, etc.) via `lint-staged` integration. When you commit changes to any `package.json`, version mismatches are automatically fixed to maintain consistency across all packages. See `DEPENDENCY_SYNC_LINT_STAGED.md` for details.

## Architecture

### Service Ports (DO NOT CHANGE)

Ports are centrally defined in root `.env` file and **must never be changed**:

- **Frontend**: `3002` (FRONTEND_PORT)
- **LEGO Projects API**: `9000` (LEGO_API_PORT)
- **PostgreSQL**: `5432` (POSTGRESQL_PORT)
- **Redis**: `6379` (REDIS_PORT)
- **Elasticsearch**: `9200` (ELASTICSEARCH_PORT)

**Important**: If a port is busy, kill the existing process with `pnpm kill-ports` - it means the service is already running.

### Centralized Environment Configuration

All services load environment variables from the **monorepo root `.env` file** via `shared/config/env-loader.js`. This loader:

- Automatically detects service type
- Assigns correct PORT based on service type
- Maps centralized env vars to legacy variable names for backward compatibility
- Validates port configuration on startup

**Never modify service ports manually** - the env-loader handles all port assignment.

### Backend Services

**Authentication** (`apps/api/auth-service-cognito`):

- **AWS Cognito**: Serverless authentication with User Pools
- Handles user registration, login, email verification, password reset
- Frontend uses AWS Amplify/Cognito SDK
- JWT tokens validated by `lego-projects-api`
- Infrastructure: CDK (`apps/api/auth-service-cognito/infrastructure/`)

**LEGO Projects API** (`apps/api/lego-projects-api`):

- Express + PostgreSQL + Drizzle ORM
- MOC management, file uploads (S3), image processing (Sharp)
- Elasticsearch search, Redis caching
- Port: 9000
- Entry point: `index.ts` (imports env-loader first)

### Frontend Applications

**LEGO MOC Instructions App** (`apps/web/lego-moc-instructions-app`):

- React 19 + TypeScript + Vite
- TanStack Router for routing (do not introduce alternatives)
- Redux Toolkit + RTK Query for state/data fetching
- TanStack React Query for server state
- Tailwind CSS + Radix UI components
- PWA with service worker for offline support
- Port: 3002 (dev server may use 5173 - check terminal)
- **Code splitting**: Manual chunks configured in `vite.config.ts` for optimal bundle sizes

**Storybook** (`apps/web/storybook`):

- Storybook 8.6.14 for component documentation
- React 19 + TypeScript
- Comprehensive component library showcase
- Accessibility testing with @storybook/addon-a11y
- Port: 6007 (dev), 6008 (preview)

### Shared Packages

**Location**: `packages/core/`, `packages/features/`, `packages/tools/`, `packages/dev/`

**Discovery workflow before creating new utilities:**

1. Search existing exports: `rg -n "export (function|const|class)" packages/`
2. Check if similar functionality exists in `@repo/ui`, `@repo/upload`, etc.
3. If code appears 2+ times, promote to shared package

**Key packages:**

- `@repo/ui` - Radix UI components, 25+ components
- **Authentication** - AWS Cognito with Amplify integration (no shared package)
- `@repo/upload` - File/image upload with drag-and-drop, validation, compression
- `@repo/file-list` - Generic file display component
- `@repo/moc-instructions` - MOC-specific features and forms
- `@repo/gallery` - Image gallery with filtering
- `@repo/cache` - Client-side caching utilities
- `@monorepo/file-validator` - Universal file validation (frontend + backend)

### Data Fetching Stack

**Use RTK Query exclusively** for data fetching. Do **not** import `axios` or `fetch` in feature code.

- API slices defined using `createApi` from RTK Query
- Base query configured with CSRF token handling
- Automatic caching and invalidation
- Example: `packages/core/auth/src/store/authApi.ts`, `packages/features/moc-instructions/src/store/instructionsApi.ts`

### Routing

**Use TanStack Router exclusively**. Do not introduce React Router or alternatives without RFC approval.

- File-based routing in `src/routes/`
- Route configuration in `src/routes/root.tsx`
- Type-safe route parameters and search params

## Development Conventions

### TypeScript

- **TypeScript-only codebase** - all new files must be `.ts` or `.tsx` (no `.js` or `.jsx`)
- **Strict mode enabled** - no `any` types
- Do not use `@ts-ignore` without justification in comment
- Use path aliases from `tsconfig.json` for imports: `@repo/ui`, `@repo/upload`, etc.
- **Prefer Zod schemas + inferred types** over manual type definitions:

  ```typescript
  // ✅ Preferred - single source of truth
  import { z } from 'zod'
  const userSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
  })
  type User = z.infer<typeof userSchema>

  // ❌ Avoid - duplicates shape definition
  interface User {
    id: string
    email: string
    name: string
  }
  ```

- Use Zod for all data validation at boundaries: API requests/responses, form inputs, environment variables

### Import Order

1. External dependencies
2. Internal packages (`@repo/*`, `@monorepo/*`)
3. Relative imports

Use specific imports: `import { Button } from '@repo/ui'` not barrel exports.

### Error Handling

- **Never use `throw new Error()`** - create custom error types in `packages/` directory
- Never expose 500 errors to users - provide meaningful error messages
- Use Zod for input validation at boundaries (API, forms, env)

### Logging

- **Use Winston** for all logging in backend services
- **Never use `console.log`** in production code
- Use appropriate log levels (debug, info, warn, error)

### File Naming

- **kebab-case** for files: `user-profile.tsx`, `api-client.ts`
- **PascalCase** for components: `UserProfile`, `CreateMocModal`
- **camelCase** for functions/variables: `getUserById`, `isAuthenticated`

### Security

- Never hardcode secrets - use environment variables
- Validate all external input with Zod
- CSRF protection enabled on all auth endpoints
- CORS configured with specific origins
- Rate limiting on API endpoints
- Helmet security headers

### Testing Philosophy

**Vitest** for unit/integration, **Playwright** for E2E, **React Testing Library** for components.

**Test definitions:**

- **Unit test**: Tests one module in isolation. **Must mock all imports**, API calls, database, Redux, contexts, hooks, 3rd-party deps.
- **Integration test**: Tests interactions between our modules. **May mock only** 3rd-party deps, API calls, database. Do **not** mock internal modules under test.

**Best practices:**

- Use descriptive test names and `data-testid` selectors
- Prefer `waitFor` over timeouts for async operations
- Keep tests hermetic - no network except controlled mocks
- MSW for API mocking
- E2E tests run in CI with retries and artifacts on failure

**Playwright E2E Tests:**

- **ALL Playwright tests must use Gherkin syntax** with `.feature` files
- Store feature files in `apps/e2e/features/`
- Use `@playwright/test` with cucumber integration (e.g., `playwright-bdd`)
- Example structure:
  ```
  apps/e2e/
  ├── features/
  │   ├── auth/
  │   │   ├── login.feature
  │   │   └── signup.feature
  │   └── profile/
  │       └── avatar-upload.feature
  ├── step-definitions/
  │   ├── auth-steps.ts
  │   └── profile-steps.ts
  └── playwright.config.ts
  ```
- Feature files use Given/When/Then syntax for clear test scenarios
- Step definitions are in TypeScript files that implement the Gherkin steps
- This ensures tests are readable by non-technical stakeholders and maintainable

### Performance

- Lazy-load routes by default
- Run bundle analyzer before adding heavy dependencies
- Code splitting configured in Vite for optimal chunks
- Memoize when profiling shows benefit (`useMemo`, `useCallback`, `React.memo`)

### Database

- **Never modify existing migrations** - create new ones for schema changes
- Include indexes for new query patterns
- PostgreSQL via Drizzle ORM for LEGO Projects API
- MongoDB via Mongoose for Auth Service

### Change Process for Shared Code

**Discuss with human before modifying shared packages**. Prefer composition over inheritance and keep modules closed for modification, open for extension (Open/Closed Principle).

## Common Workflows

### Adding a New Feature

1. Search for existing utilities in `packages/` first
2. Use RTK Query for any API calls
3. Add to existing feature package or create new one if justified
4. Write tests (unit + integration)
5. Update documentation if architecture changes
6. Use `pnpm changeset` for versioning

### Using Generators

The monorepo includes Turborepo generators for scaffolding:

```bash
# Interactive generator selection
pnpm turbo gen

# Direct generator commands
pnpm gen:package    # Create new package (React lib, Node lib, feature)
pnpm gen:component  # Create React component with stories/tests
pnpm gen:api        # Create new API service with full setup
pnpm gen:prd        # Create Product Requirements Document
```

### Debugging Port Conflicts

```bash
# Kill all application ports
pnpm kill-ports

# Kill specific port
pnpm kill-port 3002

# Check what's on a port (macOS/Linux)
lsof -ti:3002
```

### Running Single Test File

```bash
# Frontend test
pnpm --filter lego-moc-instructions-app test src/components/UserProfile.test.tsx

# E2E test
pnpm test:e2e -- --grep="Login flow"
```

### Adding New Package Dependency

```bash
# To specific workspace
pnpm --filter @repo/ui add lucide-react

# To root (monorepo-wide)
pnpm add -Dw @types/node
```

### Viewing Service Logs

```bash
# Real-time logs
tail -f logs/auth-service.log
tail -f logs/lego-projects-api.log

# Or use convenience scripts
pnpm logs:auth
pnpm logs:lego
```

## Tech Stack Reference

**Language:** TypeScript 5.8 (strict mode)
**Monorepo:** pnpm 9 workspaces + Turborepo 2.5
**Frontend:** React 19, TanStack Router, Redux Toolkit, TanStack Query, Tailwind CSS 4, Radix UI
**Backend:** Express, Drizzle ORM (PostgreSQL), Mongoose (MongoDB)
**Infrastructure:** Docker Compose (dev), AWS (prod), Redis, Elasticsearch
**Testing:** Vitest, Playwright, React Testing Library, MSW
**Build:** Vite 6, ESBuild
**Linting:** ESLint 9 (Airbnb style), Prettier

## Important Notes

- **TypeScript-only codebase**: All new files must be `.ts` or `.tsx` (no JavaScript)
- **Zod schemas preferred**: Use Zod schemas + inferred types over manual type definitions
- **Single entry point**: Use only `pnpm dev` from root to start the stack
- **No axios/fetch in features**: Use RTK Query exclusively
- **No React Router**: TanStack Router only
- **Ports are immutable**: Never change service ports - they're centrally configured
- **Shared packages first**: Always search before creating new utilities
- **Strict TypeScript**: No `any`, no `@ts-ignore` without justification
- **Custom errors only**: Never `throw new Error()` - use typed error classes
- **Winston logging**: Never `console.log` in production code
- **Gherkin for E2E tests**: All Playwright tests must use `.feature` files with Gherkin syntax
- **Discuss before modifying shared code**: Shared packages affect multiple consumers

## AI Assistant Context

When working in this codebase:

1. Act as a senior full-stack engineer - be direct and candid
2. Challenge assumptions and ask for clarity
3. Follow the "reuse over reinvention" principle strictly
4. Search `packages/` before creating anything new
5. Use built-in task management for complex multi-step work
6. Keep humans in the loop for architectural decisions
7. Write tests for all new functionality
8. Update documentation when behavior/architecture changes
