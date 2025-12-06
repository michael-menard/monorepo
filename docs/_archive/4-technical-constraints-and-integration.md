# 4. Technical Constraints and Integration

## 4.1 Technology Stack

| Layer      | Technology                | Version        | Constraint                 |
| ---------- | ------------------------- | -------------- | -------------------------- |
| Language   | TypeScript                | 5.x            | Strict mode                |
| Framework  | React                     | 19.0.0         | Functional components only |
| Routing    | TanStack Router           | Latest         | Type-safe, file-based      |
| State      | Redux Toolkit + RTK Query | Latest         | Single store in shell      |
| Validation | Zod                       | Latest         | All props/forms            |
| Styling    | Tailwind CSS              | 4.x            | Design tokens              |
| Components | shadcn/ui                 | Via `@repo/ui` | No direct imports          |
| Icons      | Lucide React              | Latest         | Exclusive                  |
| Build      | Vite                      | 6.x            | Code splitting             |
| Testing    | Vitest + RTL              | Latest         | Min 45% coverage           |
| Monorepo   | Turborepo + pnpm          | Latest         | Workspace orchestration    |
| Auth       | AWS Amplify               | v6             | Cognito                    |
| Backend    | `apps/api`                | Existing       | AWS Lambda + API Gateway   |

## 4.2 Integration Strategy

**API Integration:**

- Each domain app defines its own RTK Query API slice
- Shared base query from `@repo/api` provides auth headers, error handling
- Domain apps inject endpoints at runtime via `injectEndpoints`

**Frontend Integration:**

- Shell creates Redux store with shared slices
- React.lazy() for code splitting at route boundaries
- Shared components via `@repo/ui` only

**Testing Integration:**

- Unit tests per component using Vitest + RTL
- API mocking via MSW (Mock Service Worker)
- Each app owns its test suite

## 4.3 File Structure

```
apps/web/{app-name}/
├── src/
│   ├── components/       # App-specific components
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom hooks
│   ├── store/            # RTK Query API slice
│   ├── schemas/          # Zod schemas
│   ├── types/            # TypeScript types (from Zod)
│   ├── utils/            # App-specific utilities
│   └── index.tsx         # App entry point
├── tests/                # Test files
├── package.json
└── vite.config.ts
```

## 4.4 Coding Standards

Per `.bmad-coding-style.md`:

- No semicolons, single quotes, trailing commas
- 2-space indentation
- Functional components with `function` declarations
- Zod schemas for all props validation
- Named exports (no default exports)
- No barrel files
- Import from `@repo/ui` for shadcn components
- Import from `@repo/logger` instead of console.log

---
