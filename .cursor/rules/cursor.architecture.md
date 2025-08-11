---
description: Monorepo architecture rules for apps, packages, and shared standards to ensure consistency, reuse, and reliable builds
globs: apps/**/*, packages/**/*, **/tsconfig.json, **/package.json
alwaysApply: true
---

- **Monorepo Layout**
  - `apps/`: Deployed applications and services (web apps, APIs)
  - `packages/`: Shared UI, features, utilities, types, and schemas
  - Keep infrastructure (Docker, serverless configs) in app directories, never in shared packages
  - Reference overview: [ARCHITECTURE_README.md](mdc:__docs__/ARCHITECTURE_README.md)

- **Frontend Stack**
  - React + Vite only (no Next.js)
  - Tailwind CSS v4 for all styling; do not create CSS files or PostCSS configs
  - shadcn/ui for atoms in `packages/ui`; compose larger components in feature packages
  - Example atoms: [packages/ui](mdc:packages/ui)

- **Data & State**
  - Use RTK Query for all HTTP calls (no fetch/axios). For GraphQL, use Apollo Client
  - Share API slices/types where appropriate via `packages/shared` or `packages/features/shared`
  - Example test setup for frontend: [packages/features/gallery/src/test/setup.ts](mdc:packages/features/gallery/src/test/setup.ts)

- **Types & Validation**
  - Prefer Zod schemas for runtime validation and inferred types across the stack
  - Export shared types and schemas from `packages/shared` and feature packages

- **API Design**
  - Uniform response object: `{ statusCode, message, data }`
  - Keep handlers thin; move shared error/response helpers to `packages/shared`

- **Backend Services**
  - Prefer Serverless Framework for APIs when possible
  - Use Drizzle ORM for data access and schema modeling (mock DB in unit tests)
  - Keep Dockerfiles within each app directory; compose files local to the app
  - Example compose: [apps/api/auth-service/docker-compose.yml](mdc:apps/api/auth-service/docker-compose.yml)

- **TypeScript Configuration**
  - Each package/app has its own `tsconfig.json` (no `extends`), `module` and `target` are ESNext; never use NodeNext
  - Enable path aliases and keep them consistent across apps and packages
  - DO:
    ```json
    {
      "compilerOptions": {
        "module": "ESNext",
        "target": "ESNext",
        "moduleResolution": "Bundler",
        "jsx": "react-jsx",
        "baseUrl": ".",
        "paths": {
          "@shared/*": ["packages/shared/src/*"]
        },
        "strict": true
      },
      "include": ["src"]
    }
    ```
  - DON’T: use `module: NodeNext`, or rely on a root `tsconfig` with `extends`

- **Packaging & Tree Shaking**
  - All packages must declare ESM `exports` and be tree-shakeable; avoid deep imports
  - Provide a clear entry file (`src/index.ts`) and a barrel export
  - Example `package.json`:
    ```json
    {
      "name": "@scope/ui",
      "type": "module",
      "exports": {
        ".": {
          "types": "./dist/index.d.ts",
          "import": "./dist/index.js"
        }
      },
      "files": ["dist"],
      "sideEffects": false
    }
    ```

- **Directory Boundaries**
  - Do not import app code into packages; packages are independent and reusable
  - Feature packages can depend on `packages/ui` and `packages/shared`, not on apps
  - Use barrel exports to avoid deep nested import paths

- **Styling Rules**
  - Tailwind utility classes only; no `.css` or CSS modules in new code
  - Use design tokens from `packages/shared` where applicable: [design-system.ts](mdc:packages/shared/src/design-system.ts)
  - Prefer Framer Motion for animations over CSS keyframes when needed

- **Testing Architecture**
  - Unit/Component: Vitest + React Testing Library; mock all external dependencies (MSW for HTTP in unit tests)
  - Backend API: Jest + Supertest; mock external services and DB by default
  - E2E: Playwright with real services (no MSW), max 15s per test
  - Place tests in `__tests__` directories next to the code under test

- **Environment & Secrets**
  - Store secrets in `.env` at the project root or app root (never in code)
  - Example: S3 bucket name must live in the environment file, not source

- **Infrastructure & Docker**
  - Dockerfiles live in each app directory; keep base images lean
  - Use app-scoped `docker-compose.yml` for local dependencies (DB, MailHog/Ethereal)

- **Performance & Build**
  - Ensure packages are tree-shakeable (`sideEffects: false`)
  - Avoid circular dependencies between packages; prefer composition
  - Lazy-load heavy feature components in apps; keep `packages/ui` atoms lightweight

- **DO/DON’T Examples**
  - DO: Export shared utilities from `packages/shared` and import via aliases
    ```ts
    // packages/shared/src/index.ts
    export * from './design-system'
    export * from './store'
    ```
  - DON’T: Import app-level modules inside shared packages or features

- **Maintenance**
  - Update these rules when introducing new shared patterns (≥3 usages) or after major refactors
  - Keep examples and references synced with code; follow [cursor_rules.mdc](mdc:.cursor/rules/cursor_rules.mdc) formatting

