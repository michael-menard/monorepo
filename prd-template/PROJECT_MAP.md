# Monorepo Project Map

This repository follows an atomic design-informed structure and a reuse-first policy.
Use shared packages (`packages/**`) for atoms and molecules; keep app-local code for organisms/pages and full applications only.

## Top-Level Layout

```
Monorepo/
├─ apps/                      # Full applications (frontend + backend)
│  ├─ web/<app>/              # Frontend React apps (organisms/pages live here)
│  └─ api/<service>/          # Backend services (Serverless/Express/etc.)
│
├─ packages/                  # Shared, versioned libraries (preferred reuse)
│  ├─ ui/                     # Atoms (UI primitives)
│  │  └─ src/
│  │     ├─ ui/               # Buttons, Inputs, Selects, Dialogs, etc.
│  │     ├─ hooks/            # UI-only hooks
│  │     └─ lib/              # lightweight UI utilities
│  │
│  ├─ features/               # Molecules (feature modules)
│  │  ├─ <feature-name>/      # e.g., gallery, profile, wishlist, image-upload
│  │  │  ├─ src/components/   # Composable feature components
│  │  │  ├─ src/hooks/        # Feature hooks
│  │  │  ├─ src/schemas/      # Zod schemas (feature-scoped)
│  │  │  ├─ src/store/        # RTK Query endpoints/selectors (frontend-only)
│  │  │  └─ src/test/         # Feature-level test helpers
│  │
│  ├─ shared/                 # Cross-cutting utilities and tokens
│  │  ├─ src/design-system.ts # Design tokens, theme contracts
│  │  ├─ src/utils/           # Pure utilities (string, date, etc.)
│  │  └─ src/schemas/         # Cross-feature Zod types
│  │
│  └─ <other-packages>/       # e.g., shared-image-utils, shared-cache
│
├─ prd-template/              # PRD templates and task config
└─ .taskmaster/               # Taskmaster tasks and PRDs
```

## What Lives Where

- packages/ui (Atoms)
  - Purpose: low-level UI primitives (Buttons, Inputs, Dialogs, Popovers, Tabs, Accordion, etc.).
  - Constraints: no business logic; no app-specific styling; Tailwind-only; accessible by default.
  - Import path: `@ui/*`.

- packages/features (Molecules)
  - Purpose: feature modules composed from atoms (and other molecules). Examples: `@features/gallery`, `@features/profile`.
  - May include: components, hooks, Zod schemas, RTK Query slices (frontend), small feature utilities.
  - Must not: contain app routing, global providers, or app-only state wiring.
  - Import path: `@features/<feature>`.

- packages/shared (Cross-cutting)
  - Purpose: shared design tokens, pure utilities, widely reused Zod schemas/types.
  - Import path: `@shared/*`.

- apps/web/* (Organisms, Pages, App Wiring)
  - Purpose: compose atoms + molecules into organisms and pages; app routing; providers (Redux, QueryClient, etc.).
  - Place app-only components and page-level state here (do not duplicate atoms/molecules).
  - Example: `apps/web/lego-moc-instructions-app/src/pages/*`, page-level layouts, feature composition.

- apps/api/* (Backend Services)
  - Purpose: service code, handlers, middleware, Drizzle ORM schemas, storage adapters.
  - Reuse: prefer pulling common types and utilities from `packages/**`.
  - Tests: Jest + Supertest; mock external DB/services by default (E2E brings up real services via docker-compose).

## Golden Rules

- Reuse-first
  - Before creating new UI or logic, check `packages/ui`, `packages/features`, and `packages/shared`.
  - Extend the canonical module via props/slots; avoid forking.

- Import policy
  - Use path aliases: `@ui/*`, `@features/*`, `@shared/*`.
  - Prefer exports from `packages/**` over app-local copies.

- Styling
  - Tailwind-only in web apps; keep atoms unopinionated; compose styles at molecule/organism level.

- Types & Validation
  - Use Zod schemas across frontend and backend. Avoid TypeScript `enum`s.

- Data Access
  - Frontend: RTK Query clients in features (and provided at app level).
  - Backend: Drizzle ORM for schema and queries.

## Testing Policy (Summary)

- Unit/Component (frontend): Vitest + RTL
  - Colocate `__tests__` next to code.
  - Mock all externals (network, storage, heavy UI). Use MSW for HTTP in unit tests only.
  - Enforce 5s max per test (timeouts already configured in vitest config for gallery).

- Backend (Node): Jest + Supertest
  - Mock external services and DB by default.

- E2E: Playwright
  - No mocks; real services via docker-compose; ≤ 15s/test.

## Example Placement Scenarios

- New button style → `packages/ui/src/ui/Button.tsx` (atom)
- Gallery search bar with filters → `packages/features/gallery/src/components/FilterBar/` (molecule)
- Page assembling gallery grid + filters + pagination → `apps/web/<app>/src/pages/GalleryPage.tsx` (organism/page)
- Shared date formatting utility → `packages/shared/src/utils/date.ts`
- Shared image metadata schema → `packages/shared/src/schemas/image.ts`
- Backend image model/migration → `apps/api/<service>/db/*` (with Drizzle)

## Naming & Structure

- Components: one component per directory with `index.tsx` (where applicable) to match existing conventions.
- Tests: `__tests__` beside the file under test; `*.test.ts(x)` naming.
- Public API: index files at package roots (`packages/*/src/index.ts`) re-export canonical modules.

## Anti-Patterns (Don’t)

- Duplicating atoms/molecules in apps; add or extend in `packages/ui` or `packages/features` instead.
- Putting routing/providers inside `packages/features` (keep it in `apps/web/*`).
- Mixing backend-only types into frontend packages; place cross-cutting types in `packages/shared`.

## Quick Import Cheatsheet

- Atoms: `import { Button } from '@ui/ui/button'`
- Molecules: `import { Gallery } from '@features/gallery'`
- Shared: `import { designTokens } from '@shared/design-system'`


