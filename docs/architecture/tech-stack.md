# Tech Stack

This document defines the technology stack and architectural principles for the LEGO MOC Instructions monorepo.

## Programming Paradigm

**CRITICAL: This codebase follows a functional programming paradigm with modern ES7+ syntax.**

### Core Principles

| Principle              | Requirement    | Notes                                               |
| ---------------------- | -------------- | --------------------------------------------------- |
| Functional Programming | **Required**   | Pure functions, closures, composition               |
| Classes                | **Prohibited** | Except Error classes and React Error Boundaries     |
| Arrow Functions        | **Preferred**  | For all non-component functions                     |
| ES7+ Syntax            | **Required**   | Optional chaining, nullish coalescing, spread, etc. |
| Immutability           | **Required**   | Never mutate state directly                         |
| TypeScript             | **Required**   | Strict mode, no JavaScript files                    |

### What This Means

```typescript
// ✅ REQUIRED - Functional approach
const createService = () => {
  const cache = new Map()
  return {
    get: async (id: string) => cache.get(id) ?? (await fetch(id)),
  }
}

// ❌ PROHIBITED - Class-based approach
class Service {
  private cache = new Map()
  async get(id: string) {
    /* ... */
  }
}
```

## Existing Technology Stack

| Category           | Current Technology   | Version | Usage in Enhancement                | Notes                                           |
| ------------------ | -------------------- | ------- | ----------------------------------- | ----------------------------------------------- |
| Frontend Framework | React                | 19.0.0  | Core framework for all modules      | Functional components only, no class components |
| Routing            | TanStack Router      | 1.130.2 | Enhanced for modular routing        | Type-safe, file-based routing                   |
| State Management   | Redux Toolkit        | 2.8.2   | Enhanced with modular patterns      | RTK Query for API, slices for state             |
| Styling            | Tailwind CSS         | 4.1.11  | Enhanced design system foundation   | LEGO-inspired sky/teal palette                  |
| Component Library  | Shadcn/ui (@repo/ui) | Latest  | Enhanced design system foundation   | Import from @repo/ui package only               |
| Build Tool         | Vite                 | 6.3.5   | Optimized for modular builds        | Fast builds, HMR, tree-shaking                  |
| Testing            | Vitest               | 3.0.5   | Enhanced with module testing        | Vite-native, excellent performance              |
| Monorepo           | Turborepo            | 2.5.4   | Enhanced for modular architecture   | Incremental builds, caching                     |
| Package Manager    | pnpm                 | 9.0.0   | Workspace management                | Workspace protocol, efficient                   |
| Authentication     | AWS Amplify          | 6.15.7  | Maintained across all modules       | Cognito integration                             |
| Deployment         | Serverless Framework | Latest  | Enhanced for modular deployment     | SST v3 for AWS Lambda                           |
| Validation         | Zod                  | Latest  | Runtime validation + type inference | Preferred over TypeScript interfaces            |
| Logging            | @repo/logger         | Latest  | Centralized logging                 | Never use console.log                           |

## New Technology Additions

| Technology           | Version  | Purpose                                    | Rationale                                   | Integration Method                        |
| -------------------- | -------- | ------------------------------------------ | ------------------------------------------- | ----------------------------------------- |
| Framer Motion        | 12.23.24 | Enhanced animations and micro-interactions | LEGO brick building animations              | Integrate with design system components   |
| React Query DevTools | 5.66.5   | Enhanced API debugging for serverless      | Better debugging for serverless patterns    | Development environment enhancement       |
| Lucide React         | 0.476.0  | Consistent icon system                     | Already in use, expanding for design system | Integrate with enhanced component library |

## Code Style Summary

| Rule            | Requirement                    |
| --------------- | ------------------------------ |
| Semicolons      | No (`semi: false`)             |
| Quotes          | Single quotes                  |
| Trailing commas | Always                         |
| Line width      | 100 characters                 |
| Arrow parens    | Avoid when possible (`x => x`) |
| Barrel files    | **Prohibited**                 |
| Direct imports  | **Required**                   |

## Import Patterns

```typescript
// ✅ Required patterns
import { Button, Card } from '@repo/ui' // UI components
import { logger } from '@repo/logger' // Logging
import { UserSchema } from '@/schemas/user' // Direct file import

// ❌ Prohibited patterns
import { Button } from '@repo/ui/button' // Individual paths
import { components } from '@/components' // Barrel imports
console.log('...') // Console logging
```

## Related Documentation

- **Coding Standards**: `/docs/architecture/coding-standards.md` - Full coding standards
- **Source Tree**: `/docs/architecture/source-tree.md` - Directory structure
- **Monorepo Guide**: `/CLAUDE.md` - AI assistant instructions

---

**Last Updated**: 2025-11-29
**Version**: 1.1
