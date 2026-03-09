# Dev Feasibility Review: INST-1102 - Create Basic MOC

Generated: 2026-02-05
Story: INST-1102 - Create Basic MOC
Author: PM Dev Feasibility Reviewer

---

## Executive Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **Overall Feasibility** | ✅ FEASIBLE | Straightforward CRUD create operation with established patterns |
| **Complexity** | MEDIUM | 2-3 days with testing |
| **Blocking Issues** | ⚠️ 1 WARNING | INST-1008 (UAT) - RTK mutation may not be merged yet |
| **Database Changes** | ✅ NONE | Table `moc_instructions` already exists |
| **API Changes** | ✅ NEW ROUTE | Need new domain: `apps/api/lego-api/domains/mocs/` |
| **Frontend Changes** | ✅ NEW PAGE | Need new page: `apps/web/app-instructions-gallery/src/pages/CreateMocPage.tsx` |

---

## Feasibility Assessment

### Overall: FEASIBLE ✅

This story is **feasible and ready for implementation** with the following considerations:
- Database schema exists (no migration needed)
- Strong reuse patterns from wishlist domain
- Clear acceptance criteria
- Testing patterns well-established
- One dependency (INST-1008) in UAT - should be ready soon

**Recommendation**: APPROVED for implementation once INST-1008 merges.

---

## Technical Stack Review

### Frontend

| Technology | Status | Notes |
|------------|--------|-------|
| React 19 | ✅ Ready | All primitives available |
| TypeScript | ✅ Ready | Strict mode enabled |
| Tailwind CSS | ✅ Ready | Design system in place |
| TanStack Router | ✅ Ready | Routing configured |
| RTK Query | ⚠️ Depends | INST-1008 must provide `useCreateMocMutation` |
| Vitest + RTL | ✅ Ready | Test infrastructure in place |
| Playwright | ✅ Ready | E2E framework configured |

### Backend

| Technology | Status | Notes |
|------------|--------|-------|
| Hono | ✅ Ready | Framework in use |
| Drizzle ORM | ✅ Ready | Database table exists |
| Zod | ✅ Ready | Validation schemas pattern established |
| Auth Middleware | ✅ Ready | `auth`, `loadPermissions`, `requireFeature` available |
| @repo/logger | ✅ Ready | Logging utility in place |

### Database

| Aspect | Status | Notes |
|--------|--------|-------|
| Table exists | ✅ Ready | `moc_instructions` table in migration 0000 |
| Required columns | ✅ Present | `id`, `user_id`, `title`, `description`, `theme`, `tags` |
| Indexes | ⚠️ Review | May need index on `user_id` + `created_at` |

---

## Dependency Analysis

### Critical Dependencies

#### 1. INST-1008: Wire RTK Query Mutations (BLOCKER)

**Status**: UAT (2026-02-05)

**Required Output**:
```typescript
// packages/core/api-client/src/rtk/mocs-api.ts
export const mocsApi = createApi({
  // ...
  endpoints: (builder) => ({
    createMoc: builder.mutation<MocResponse, CreateMocInput>({
      query: (body) => ({
        url: '/api/v2/mocs',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Mocs']
    })
  })
})

export const { useCreateMocMutation } = mocsApi
```

**Risk**: Medium
**Mitigation**:
- Check INST-1008 UAT status before starting implementation
- If not merged, coordinate with that story's developer
- Worst case: implement the mutation as part of this story (scope expansion)

**Timeline Impact**: 0 days (likely merged soon) to +0.5 days (if need to create mutation ourselves)

---

### Secondary Dependencies

#### 2. INST-1100: View MOC Gallery (Created, not implemented)

**Status**: Created (2026-02-06)

**Impact**: Navigation target
- Create button on gallery page references this story
- Success redirect goes to `/mocs/:id` (detail page from INST-1101, also not implemented)

**Risk**: Low
**Mitigation**:
- Create page can exist independently
- Redirect to `/mocs/:id` will work once INST-1101 is done
- Interim: could redirect back to `/mocs` gallery (when implemented)

---

## Database Schema Review

### Existing Table: `moc_instructions`

From migration `0000_productive_puppet_master.sql`:

```sql
CREATE TABLE "moc_instructions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "type" text NOT NULL,
  "author" text,
  "parts_count" integer,
  "theme" text,
  "subtheme" text,
  "uploaded_date" timestamp,
  "brand" text,
  "set_number" text,
  "release_year" integer,
  "retired" boolean,
  "tags" jsonb,
  "thumbnail_url" text,
  "total_piece_count" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

### Fields Used by This Story

| Field | Usage | Notes |
|-------|-------|-------|
| `id` | Generated | UUID primary key |
| `user_id` | From auth | Cognito user ID |
| `title` | Required input | Min 3 chars |
| `description` | Optional input | Nullable |
| `theme` | Required input | From dropdown |
| `tags` | Optional input | JSONB array of strings |
| `created_at` | Auto | Timestamp |
| `updated_at` | Auto | Timestamp |

### Fields NOT Used (Set to Default/Null)

- `type` - **QUESTION**: What should this be? "MOC" or "custom"?
- `author` - Null for now (future: user's display name)
- `parts_count` - Null (not captured in create form)
- `subtheme` - Null (not in scope)
- `uploaded_date` - Null (or same as `created_at`?)
- `brand` - Null (or "LEGO" default?)
- `set_number` - Used for slug? Or null?
- `release_year` - Null
- `retired` - False or null
- `thumbnail_url` - Null (covered by INST-1103)
- `total_piece_count` - Null (duplicate of `parts_count`?)

### Questions for Elaboration

1. **`type` field**: What value should be used? "MOC"? This field is NOT NULL in schema.
2. **`set_number` field**: Story mentions "generate slug from title". Should slug be stored in `set_number`?
3. **Slug uniqueness**: If slug goes in `set_number`, should there be a unique constraint?
4. **Missing columns**: Do we need a `slug` column separate from `set_number`?

### Recommended Index

```sql
CREATE INDEX idx_moc_instructions_user_created
ON moc_instructions(user_id, created_at DESC);
```

**Rationale**: Optimizes query for listing user's MOCs sorted by creation date.

---

## API Route Design

### New Domain: `mocs`

Create new domain directory following wishlist pattern:

```
apps/api/lego-api/domains/mocs/
├── routes.ts                # Hono router with POST /mocs
├── types.ts                 # Zod schemas and types
├── application/
│   ├── index.ts            # Service factory
│   └── services.ts         # Business logic
├── adapters/
│   ├── index.ts            # Adapter factory
│   └── repositories.ts     # Database operations
├── ports/
│   └── index.ts            # Port interfaces
└── __tests__/
    ├── routes.test.ts      # Route tests
    └── services.test.ts    # Service tests
```

### POST /mocs Route

**File**: `apps/api/lego-api/domains/mocs/routes.ts`

```typescript
import { Hono } from 'hono'
import { auth } from '../../middleware/auth.js'
import { loadPermissions } from '../../middleware/load-permissions.js'
import { requireFeature } from '../../middleware/require-feature.js'
import { CreateMocInputSchema } from './types.js'
import { createMocsService } from './application/index.js'
import { db, schema } from '../../composition/index.js'

const mocs = new Hono()

// All routes require auth and mocs feature
mocs.use('*', auth)
mocs.use('*', loadPermissions)
mocs.use('*', requireFeature('mocs')) // Or 'instructions'?

const mocsService = createMocsService({ db, schema })

/**
 * POST / - Create new MOC
 */
mocs.post('/', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateMocInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      details: input.error.flatten()
    }, 400)
  }

  const result = await mocsService.createMoc(userId, input.data)

  if (!result.ok) {
    const status = result.error === 'DB_ERROR' ? 500 : 400
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

export default mocs
```

### Zod Schemas

**File**: `apps/api/lego-api/domains/mocs/types.ts`

```typescript
import { z } from 'zod'

/**
 * Input schema for creating a MOC
 */
export const CreateMocInputSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  theme: z.string().min(1, 'Theme is required'),
  tags: z.array(z.string()).default([])
})

export type CreateMocInput = z.infer<typeof CreateMocInputSchema>

/**
 * MOC response schema
 */
export const MocResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  theme: z.string().nullable(),
  tags: z.array(z.string()),
  slug: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export type MocResponse = z.infer<typeof MocResponseSchema>
```

### Service Layer

**File**: `apps/api/lego-api/domains/mocs/application/services.ts`

```typescript
import { logger } from '@repo/logger'
import type { Result } from '../../core/types/result.js'
import type { MocRepository } from '../ports/index.js'
import type { CreateMocInput, MocResponse } from '../types.js'

export function createMocsService(deps: {
  mocRepo: MocRepository
}) {
  const { mocRepo } = deps

  return {
    async createMoc(
      userId: string,
      input: CreateMocInput
    ): Promise<Result<MocResponse>> {
      try {
        // Generate slug from title
        const slug = generateSlug(input.title)

        // Insert into database
        const moc = await mocRepo.create({
          userId,
          title: input.title,
          description: input.description ?? null,
          theme: input.theme,
          tags: input.tags,
          slug,
          type: 'MOC' // QUESTION: Confirm this default value
        })

        logger.info('MOC created', { userId, mocId: moc.id })

        return { ok: true, data: moc }
      } catch (error) {
        logger.error('Failed to create MOC', { userId, error })
        return { ok: false, error: 'DB_ERROR' }
      }
    }
  }
}

/**
 * Generate URL-friendly slug from title
 * Example: "My Amazing Castle!" -> "my-amazing-castle"
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
}
```

---

## Frontend Implementation

### New Page: CreateMocPage

**File**: `apps/web/app-instructions-gallery/src/pages/CreateMocPage.tsx`

**Pattern**: Follow `AddItemPage.tsx` from wishlist-gallery

**Key Responsibilities**:
1. Render form with validation
2. Handle submission with `useCreateMocMutation`
3. Show loading state during submission
4. On success: show toast + navigate to `/mocs/:id`
5. On error: show error toast with retry
6. Save form data to localStorage on failure
7. Auto-focus title on mount
8. Handle Escape key to cancel

**Estimated Lines of Code**: ~200-250 (similar to AddItemPage)

### Reusable Components

| Component | Source | Usage |
|-----------|--------|-------|
| `Button` | `@repo/app-component-library` | Actions |
| `Input` | `@repo/app-component-library` | Title field |
| `Textarea` | `@repo/app-component-library` | Description |
| `Select` | `@repo/app-component-library` | Theme dropdown |
| `TagInput` | Copy from wishlist | Tags multi-select |

### Routing

**File**: `apps/web/app-instructions-gallery/src/routes.ts`

Add new route:
```typescript
{
  path: '/mocs/new',
  component: lazy(() => import('./pages/CreateMocPage')),
  meta: { requireAuth: true }
}
```

---

## Risk Assessment

### Risk 1: INST-1008 Not Merged (MEDIUM)

**Description**: `useCreateMocMutation` hook may not exist yet

**Impact**: Cannot compile/test frontend until hook available

**Mitigation**:
- Check INST-1008 status before starting
- Create temporary mock mutation for testing
- Coordinate with INST-1008 developer
- Worst case: implement mutation ourselves (+0.5 days)

**Probability**: Low (INST-1008 in UAT, likely merging soon)

---

### Risk 2: Type Field Unknown (LOW)

**Description**: `moc_instructions.type` is NOT NULL but story doesn't specify value

**Impact**: Backend INSERT will fail without type value

**Mitigation**:
- Clarify in elaboration phase
- Likely answer: "MOC" or "custom"
- Check existing data in database for pattern

**Probability**: Low (easy to resolve)

---

### Risk 3: Slug Collisions (LOW)

**Description**: Multiple MOCs with same title generate identical slugs

**Impact**: Potential UI confusion or routing issues

**Mitigation Options**:
1. Append unique ID to slug: `my-castle-abc123`
2. Append incrementing number: `my-castle-2`
3. Use ID as slug: `abc123-def456-...`
4. Don't enforce uniqueness (allow duplicates)

**Recommendation**: Append shortened UUID to slug for guaranteed uniqueness

**Probability**: Medium (users may create similar titles)

---

### Risk 4: Theme List Undefined (LOW)

**Description**: Story doesn't specify definitive theme options

**Impact**: Frontend/backend may use different lists

**Mitigation**:
- Define in elaboration phase
- Use enum on backend for validation
- Share enum with frontend via API or schema package

**Probability**: Low (easy to define)

---

## Complexity Estimate

### Frontend

| Task | Complexity | Time |
|------|------------|------|
| CreateMocPage component | Medium | 4h |
| Form validation logic | Low | 2h |
| TagInput integration | Low | 1h |
| Unit tests | Medium | 3h |
| Integration tests | Medium | 2h |
| E2E tests | Low | 2h |
| **Total** | | **14h (1.75 days)** |

### Backend

| Task | Complexity | Time |
|------|------------|------|
| Domain setup (routes, types) | Low | 2h |
| Service layer | Low | 2h |
| Repository layer | Low | 2h |
| Slug generation | Low | 1h |
| Unit tests | Medium | 3h |
| Integration tests | Low | 2h |
| **Total** | | **12h (1.5 days)** |

### Total Estimate

**Overall**: 26 hours = **3.25 days** (round to **3-4 days**)

**With Buffer**: 4-5 days accounting for:
- INST-1008 coordination
- Elaboration phase clarifications
- Code review iterations
- Deployment and verification

---

## Reuse Opportunities

### High Reuse Components

1. **AddItemPage.tsx** → CreateMocPage structure (80% reuse)
2. **WishlistForm** → Form validation pattern (70% reuse)
3. **TagInput** → Direct copy, no changes needed (100% reuse)
4. **useLocalStorage** → Form recovery (100% reuse)

### Pattern Reuse

1. **Wishlist routes.ts** → MOC routes structure (80% similarity)
2. **Wishlist service** → MOC service pattern (70% similarity)
3. **Wishlist repository** → MOC repository pattern (70% similarity)
4. **Optimistic UI** → From WISH-2032 learnings (90% applicable)

### Estimated Time Saved by Reuse

Without reuse: **6-7 days**
With reuse: **3-4 days**
**Time saved: ~50%**

---

## Integration Points

### With INST-1008 (RTK Query)

```typescript
// Frontend uses:
import { useCreateMocMutation } from '@repo/api-client/rtk/mocs-api'

const [createMoc, { isLoading }] = useCreateMocMutation()
```

### With INST-1100 (Gallery)

```typescript
// Gallery page shows "Create MOC" button:
<Button onClick={() => navigate({ to: '/mocs/new' })}>
  <Plus className="mr-2 h-4 w-4" />
  Create MOC
</Button>
```

### With INST-1101 (Detail Page)

```typescript
// Success redirect after creation:
navigate({ to: `/mocs/${createdMoc.id}` })
```

---

## Testing Strategy Feasibility

### Unit Tests

**Feasible**: ✅ Yes
- React Testing Library patterns established
- Vitest infrastructure in place
- Reuse test patterns from wishlist

### Integration Tests

**Feasible**: ✅ Yes
- MSW handlers easy to create
- RTK Query mocking well-documented
- Database test fixtures available

### E2E Tests

**Feasible**: ✅ Yes (ADR-006 required)
- Playwright configured with live API mode
- Auth fixtures available (`browserAuthFixture`)
- Test database cleanup scripts in place

---

## Deployment Considerations

### Frontend Deployment

- **Build Impact**: Single new page, minimal bundle size increase
- **Route Registration**: Add to existing router config
- **Feature Flag**: None required (behind auth + feature gate)

### Backend Deployment

- **API Changes**: New domain, new route
- **Database Migration**: None required (table exists)
- **Feature Gate**: Use `requireFeature('mocs')` or `requireFeature('instructions')`
- **Monitoring**: Add CloudWatch metrics for `POST /mocs` endpoint

---

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Page load | <2s | Static page, no data fetch |
| Form submission | <500ms | Optimistic UI, feels instant |
| API response | <200ms | Simple INSERT operation |

### Security

- ✅ Authentication required (auth middleware)
- ✅ Authorization via userId
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (Drizzle ORM)
- ✅ CSRF protection (handled by framework)

### Scalability

- ✅ Stateless API (horizontal scaling)
- ✅ Database index on `user_id` for query optimization
- ⚠️ Consider rate limiting (future: INST-1203)

---

## Questions for Elaboration Phase

1. **Type Field**: What value should `moc_instructions.type` be set to?
2. **Slug Storage**: Should slug be stored in `set_number` or new `slug` column?
3. **Slug Uniqueness**: How to handle duplicate slugs?
4. **Theme List**: What are the definitive theme options?
5. **Feature Gate**: Should route use `requireFeature('mocs')` or `requireFeature('instructions')`?
6. **Tag Limits**: Max tags per MOC? Max tag length?
7. **Title Uniqueness**: Should titles be unique per user?

---

## Recommendations

### Go/No-Go: ✅ GO

This story is **approved for implementation** with the following conditions:

1. **Wait for INST-1008**: Ensure RTK mutation is available before starting frontend work
2. **Clarify in Elaboration**: Resolve "type field" and "slug storage" questions
3. **Follow Patterns**: Reuse wishlist patterns for consistency
4. **E2E Required**: Implement at least one happy-path E2E test (ADR-006)

### Implementation Order

1. **Backend First** (can start immediately):
   - Domain setup
   - Routes and types
   - Service and repository
   - Tests
2. **Frontend** (wait for INST-1008 merge):
   - CreateMocPage component
   - Form validation
   - Tests
3. **E2E Tests** (after both complete):
   - Happy path flow
   - Validation edge cases

### Success Criteria

- All 15 acceptance criteria pass
- Test coverage ≥ 90%
- E2E happy path passes with live API
- Code review approved
- No regressions in existing features

---

## Conclusion

**FEASIBLE** - This story is ready for implementation with minor clarifications needed during elaboration. Strong reuse patterns from wishlist domain significantly reduce complexity and risk. Estimated 3-4 days with testing.
