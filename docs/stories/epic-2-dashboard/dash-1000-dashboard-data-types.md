# Story 7.1: Dashboard Data Types & Zod Schemas

## Status

Draft

## Story

**As a** developer,
**I want** shared TypeScript types and Zod schemas for all dashboard data structures,
**so that** both backend and frontend have a single source of truth for dashboard data validation and type safety.

## Acceptance Criteria

1. ✅ `DashboardView` Zod schema defined with all nested types
2. ✅ `DashboardSummary` schema with `totalMocs`, `totalWishlistItems`, `mocsByBuildStatus`, `mocsByCoverageStatus`
3. ✅ `ThemeStats` schema with `theme`, `mocCount`, `setCount`
4. ✅ `RecentMoc` schema with `id`, `title`, `theme`, `buildStatus`, `coverImageUrl`, `createdAt`
5. ✅ `PartialPartsMoc` schema with `id`, `title`, `theme`, `buildStatus`, `coveragePercentage`, `lastUpdatedAt`
6. ✅ `BuildStatus` enum: `ADDED`, `IN_PROGRESS`, `BUILT`
7. ✅ `PartsCoverageStatus` enum: `FULL_INVENTORY`, `PARTIAL_ORDERED`, `NONE`
8. ✅ `DashboardEvent` envelope schema for WebSocket events
9. ✅ All types exported and usable in both `apps/api` and `apps/web/main-app`
10. ✅ Unit tests for all schema validations

## Tasks / Subtasks

- [ ] **Task 1: Create Shared Types Package Location** (AC: 9)
  - [ ] Create `packages/core/dashboard-types/` package structure
  - [ ] Create `package.json` with name `@repo/dashboard-types`
  - [ ] Configure TypeScript for the package
  - [ ] Add to pnpm workspace

- [ ] **Task 2: Define Enum Schemas** (AC: 6, 7)
  - [ ] Create `src/enums.ts`
  - [ ] Define `BuildStatusSchema` with Zod enum
  - [ ] Define `PartsCoverageStatusSchema` with Zod enum
  - [ ] Export inferred TypeScript types

- [ ] **Task 3: Define Core Data Schemas** (AC: 2, 3, 4, 5)
  - [ ] Create `src/schemas.ts`
  - [ ] Define `DashboardSummarySchema` with:
    - `totalMocs: z.number().int().min(0)`
    - `totalWishlistItems: z.number().int().min(0)`
    - `mocsByBuildStatus: z.record(BuildStatusSchema, z.number())`
    - `mocsByCoverageStatus: z.record(PartsCoverageStatusSchema, z.number())`
  - [ ] Define `ThemeStatsSchema` with:
    - `theme: z.string().min(1)`
    - `mocCount: z.number().int().min(0)`
    - `setCount: z.number().int().min(0)`
  - [ ] Define `RecentMocSchema` with:
    - `id: z.string().uuid()`
    - `title: z.string().min(1).max(200)`
    - `theme: z.string()`
    - `buildStatus: BuildStatusSchema`
    - `coverImageUrl: z.string().url().nullable()`
    - `createdAt: z.string().datetime()`
  - [ ] Define `PartialPartsMocSchema` with:
    - `id: z.string().uuid()`
    - `title: z.string().min(1).max(200)`
    - `theme: z.string()`
    - `buildStatus: BuildStatusSchema`
    - `coveragePercentage: z.number().min(0).max(100)`
    - `lastUpdatedAt: z.string().datetime()`

- [ ] **Task 4: Define Dashboard View Schema** (AC: 1)
  - [ ] Define `DashboardViewSchema` combining:
    - `summary: DashboardSummarySchema`
    - `themeBreakdown: z.array(ThemeStatsSchema)`
    - `recentMocs: z.array(RecentMocSchema)`
    - `partialPartsMocs: z.array(PartialPartsMocSchema)`

- [ ] **Task 5: Define WebSocket Event Schemas** (AC: 8)
  - [ ] Create `src/events.ts`
  - [ ] Define `DashboardEventSchema` envelope:
    - `eventId: z.string().uuid()`
    - `type: z.string()`
    - `timestamp: z.string().datetime()`
    - `payload: z.unknown()`
  - [ ] Define specific event payload schemas:
    - `SummaryUpdatedEventSchema`
    - `RecentMocAddedEventSchema`
    - `PartialPartsUpdatedEventSchema`
    - `ThemeBreakdownUpdatedEventSchema`
    - `DashboardErrorEventSchema`

- [ ] **Task 6: Create Package Exports** (AC: 9)
  - [ ] Create `src/index.ts` with all exports
  - [ ] Export all schemas
  - [ ] Export all inferred types
  - [ ] Verify package builds successfully

- [ ] **Task 7: Write Unit Tests** (AC: 10)
  - [ ] Create `src/__tests__/schemas.test.ts`
  - [ ] Test valid data passes validation
  - [ ] Test invalid data fails with appropriate errors
  - [ ] Test edge cases (empty arrays, null values, boundary numbers)
  - [ ] Test enum validation rejects invalid values

## Dev Notes

### Source Tree Location
[Source: architecture/source-tree.md#shared-packages]

```
packages/core/dashboard-types/
├── src/
│   ├── enums.ts           # BuildStatus, PartsCoverageStatus
│   ├── schemas.ts         # All Zod schemas
│   ├── events.ts          # WebSocket event schemas
│   ├── index.ts           # Package exports
│   └── __tests__/
│       └── schemas.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Zod Schema Pattern
[Source: architecture/coding-standards.md#zod-schemas--inferred-types]

```typescript
// ✅ REQUIRED - Single source of truth
import { z } from 'zod'

export const BuildStatusSchema = z.enum(['ADDED', 'IN_PROGRESS', 'BUILT'])
export type BuildStatus = z.infer<typeof BuildStatusSchema>

export const DashboardSummarySchema = z.object({
  totalMocs: z.number().int().min(0),
  totalWishlistItems: z.number().int().min(0),
  mocsByBuildStatus: z.record(BuildStatusSchema, z.number().int().min(0)),
  mocsByCoverageStatus: z.record(PartsCoverageStatusSchema, z.number().int().min(0)),
})
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>
```

### PRD Type Definitions Reference
[Source: docs/prd/dashboard-realtime-prd.md#8-rest-api-requirements]

```typescript
// D-API-2: DashboardView
type DashboardView = {
  summary: DashboardSummary
  themeBreakdown: ThemeStats[]
  recentMocs: RecentMoc[]
  partialPartsMocs: PartialPartsMoc[]
}

// D-API-3: DashboardSummary
type DashboardSummary = {
  totalMocs: number
  totalWishlistItems: number
  mocsByBuildStatus: Record<'ADDED' | 'IN_PROGRESS' | 'BUILT', number>
  mocsByCoverageStatus: Record<'FULL_INVENTORY' | 'PARTIAL_ORDERED' | 'NONE', number>
}

// D-WS-5: Event envelope
type DashboardEvent<T = unknown> = {
  eventId: string
  type: string
  timestamp: string
  payload: T
}
```

### Package.json Template

```json
{
  "name": "@repo/dashboard-types",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^3.0.5"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Import Pattern for Consumers

```typescript
// In apps/api or apps/web/main-app
import {
  DashboardViewSchema,
  DashboardSummarySchema,
  BuildStatusSchema,
  type DashboardView,
  type DashboardSummary,
  type BuildStatus,
} from '@repo/dashboard-types'

// Validate API response
const validated = DashboardViewSchema.parse(apiResponse)
```

## Testing

### Test File Location
`packages/core/dashboard-types/src/__tests__/schemas.test.ts`

### Test Standards
[Source: architecture/testing-strategy.md#unit-tests]

- Unit tests with Vitest
- Test valid and invalid data scenarios
- Use descriptive test names
- AAA pattern (Arrange-Act-Assert)

### Example Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { BuildStatusSchema, DashboardSummarySchema } from '../schemas'

describe('BuildStatusSchema', () => {
  it('should accept valid build status values', () => {
    expect(BuildStatusSchema.parse('ADDED')).toBe('ADDED')
    expect(BuildStatusSchema.parse('IN_PROGRESS')).toBe('IN_PROGRESS')
    expect(BuildStatusSchema.parse('BUILT')).toBe('BUILT')
  })

  it('should reject invalid build status values', () => {
    expect(() => BuildStatusSchema.parse('INVALID')).toThrow()
    expect(() => BuildStatusSchema.parse('')).toThrow()
  })
})

describe('DashboardSummarySchema', () => {
  it('should validate a complete summary object', () => {
    const validSummary = {
      totalMocs: 42,
      totalWishlistItems: 10,
      mocsByBuildStatus: { ADDED: 10, IN_PROGRESS: 20, BUILT: 12 },
      mocsByCoverageStatus: { FULL_INVENTORY: 5, PARTIAL_ORDERED: 15, NONE: 22 },
    }

    expect(() => DashboardSummarySchema.parse(validSummary)).not.toThrow()
  })

  it('should reject negative counts', () => {
    const invalidSummary = {
      totalMocs: -1,
      totalWishlistItems: 10,
      mocsByBuildStatus: { ADDED: 10, IN_PROGRESS: 20, BUILT: 12 },
      mocsByCoverageStatus: { FULL_INVENTORY: 5, PARTIAL_ORDERED: 15, NONE: 22 },
    }

    expect(() => DashboardSummarySchema.parse(invalidSummary)).toThrow()
  })
})
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-30 | 0.1 | Initial draft | SM Agent (Bob) |
