# packages/core

## Philosophy

Well-organized code is the top priority. Use proper inheritance and composition to minimize maintenance surface. When something changes at a lower layer, it should propagate automatically. Extract to a shared package only when more than one consumer needs it.

## Component Layering Convention (CRITICAL)

The monorepo uses a three-layer component architecture:

```
Layer 1: shadcn/ui primitives (app-component-library/_primitives/)
  → Raw Radix wrappers, wired to Tailwind theme + cn()
  → NEVER imported directly by apps

Layer 2: App components (app-component-library/buttons/, cards/, etc.)
  → Wrap Layer 1 with app-specific styles, behavior, and opinionated APIs
  → Apps import from @repo/ui — this is the public API

Layer 3: App-level components (in each web app)
  → Compose Layer 2 components into page-specific layouts
```

**Rules:**

- Apps import from `@repo/ui`, never from `_primitives/`, never from `shadcn` directly
- New base components go in `_primitives/` first, then get wrapped in a feature folder
- If a component is only used by one app, it stays in that app until a second consumer needs it

## Package Exports

All packages must export built JavaScript + declaration files from `dist/`, never raw TypeScript source.

```jsonc
// CORRECT
"exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }

// WRONG
"exports": { ".": "./src/index.ts" }
```

## Package Inventory

| Package                                     | Purpose                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `app-component-library`                     | UI primitives + app-level components (`@repo/ui`) |
| `design-system`                             | Design tokens, CSS variables, Tailwind preset     |
| `accessibility`                             | A11y utilities                                    |
| `accessibility-testing`                     | A11y test helpers (dev dependency)                |
| `api-client`                                | API client for frontend apps                      |
| `auth-hooks`                                | React hooks for auth state                        |
| `auth-services`                             | Auth service layer (Cognito)                      |
| `auth-utils`                                | Auth utility functions                            |
| `cache`                                     | Caching utilities                                 |
| `charts`                                    | Chart components                                  |
| `gallery`                                   | Gallery component patterns                        |
| `hooks`                                     | Shared React hooks                                |
| `logger`                                    | Structured logging (`@repo/logger`)               |
| `upload` / `upload-client` / `upload-types` | File upload system                                |
| `file-list`                                 | File listing utilities                            |
