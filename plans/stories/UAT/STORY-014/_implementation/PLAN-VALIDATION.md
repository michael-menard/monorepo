# Plan Validation: STORY-014

## Summary
- Status: **VALID**
- Issues Found: 1 (minor - route destination format)
- Blockers: 0

## AC Coverage

| AC | Addressed in Step | Status |
|----|-------------------|--------|
| AC-1: Rebrickable MOC URL returns 200 | Step 6, Step 8, Step 10 | OK |
| AC-2: Rebrickable Set URL returns 200 | Step 6, Step 8, Step 10 | OK |
| AC-3: BrickLink Studio URL returns 200 | Step 6, Step 8, Step 10 | OK |
| AC-4: Missing/invalid URL returns 400 | Step 2, Step 8, Step 10 | OK |
| AC-5: Unsupported platform returns 400 | Step 6, Step 8, Step 10 | OK |
| AC-6: Non-existent MOC returns 404 | Step 5, Step 8, Step 10 | OK |
| AC-7: Rate limiting (429 on 11th request) | Step 3, Step 10 | OK |
| AC-8: Cache hit returns cached result | Step 4, Step 10 | OK |
| AC-9: Unauthenticated returns 401 | Step 1, Step 10 | OK |
| AC-10: URL > 2000 chars returns 400 | Step 2, Step 8, Step 10 | OK |

**All 10 ACs are addressed in the implementation plan.**

## File Path Validation

| File | Action | Path Valid | Notes |
|------|--------|------------|-------|
| `apps/api/platforms/vercel/api/mocs/import-from-url.ts` | CREATE | Yes | Directory `api/mocs/` exists |
| `apps/api/platforms/vercel/vercel.json` | MODIFY | Yes | File exists |
| `__http__/mocs.http` | MODIFY | Yes | File exists |

- Valid paths: 3
- Invalid paths: 0

## Reuse Target Validation

| Target | Exists | Location |
|--------|--------|----------|
| `ImportFromUrlRequestSchema` | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` (line 13) |
| `detectPlatform()` | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` (line 71) |
| `getPlatformDisplayName()` | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` (line 96) |
| `ImportFromUrlResponse` | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` (line 49) |
| `parseRebrickableMoc()` | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-moc.ts` (line 40) |
| `parseRebrickableSet()` | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-set.ts` (line 44) |
| `parseBrickLinkStudio()` | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/bricklink-studio.ts` (line 112) |
| `cheerio` | Yes | `apps/api/package.json` (line 116: `"cheerio": "1.1.2"`) |
| `@repo/logger` | Yes | Standard monorepo package |

**All 9 reuse targets exist and are available.**

## Step Analysis

- Total steps: 10
- Steps with verification: 10 (100%)
- Steps with clear objectives: 10 (100%)
- Steps with files involved: 10 (100%)

### Step Dependency Order

| Step | Depends On | Logical Order |
|------|------------|---------------|
| Step 1 (Handler scaffold) | None | Correct |
| Step 2 (Request validation) | Step 1 | Correct |
| Step 3 (Rate limiting) | Step 1 | Correct |
| Step 4 (Caching) | Step 1 | Correct |
| Step 5 (URL fetching) | Steps 1-4 | Correct |
| Step 6 (Parser integration) | Steps 1-5 | Correct |
| Step 7 (vercel.json route) | Step 1 (file must exist) | Correct |
| Step 8 (HTTP requests) | Step 7 | Correct |
| Step 9 (Final lint/check) | Steps 1-8 | Correct |
| Step 10 (Manual testing) | Steps 1-9 | Correct |

**No circular dependencies detected. Steps are in logical order.**

### Minor Issue: Route Destination Format

Step 7 specifies:
```json
{ "source": "/api/mocs/import-from-url", "destination": "/api/mocs/import-from-url.ts" }
```

Looking at existing routes in `vercel.json`, the destination paths do NOT include the `.ts` extension for routes in the `api/mocs/` directory:
- `{ "source": "/api/mocs/:id", "destination": "/api/mocs/[id].ts" }` - has `.ts`

Actually, reviewing more closely, all destinations in vercel.json DO include `.ts` extension, so the plan is consistent with existing patterns. **No issue.**

### Route Ordering Verification

The plan correctly identifies that the new route must be placed BEFORE the parameterized `/api/mocs/:id` route (Step 7, line 225). The current vercel.json has:
- Line 38: `{ "source": "/api/mocs/:id", "destination": "/api/mocs/[id].ts" }`
- Line 39: `{ "source": "/api/mocs", "destination": "/api/mocs/index.ts" }`

The new route should be inserted BEFORE line 38 to avoid `/import-from-url` being captured by the `:id` parameter. **Plan correctly addresses this.**

## Test Plan Feasibility

### HTTP Requests (.http file)

| Request | Feasible | Notes |
|---------|----------|-------|
| `importFromUrl` (Rebrickable MOC) | Yes | Uses real external URL |
| `importFromUrlSet` (Rebrickable Set) | Yes | Uses real external URL |
| `importFromUrlBrickLink` (BrickLink) | Yes | Uses real external URL |
| `importFromUrl400Missing` | Yes | Empty body `{}` |
| `importFromUrl400Invalid` | Yes | `"not-a-url"` string |
| `importFromUrl400Unsupported` | Yes | `https://example.com/page` |
| `importFromUrl404` | Yes | Non-existent MOC ID |
| `importFromUrl400TooLong` | Yes | URL > 2000 chars |

**All HTTP requests are feasible and can be created.**

### Playwright Tests

- **Not applicable** - Backend-only story per plan.

### Verification Commands

| Command | Valid |
|---------|-------|
| `pnpm eslint apps/api/platforms/vercel/api/mocs/import-from-url.ts` | Yes |
| `pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json` | Yes |
| `pnpm vercel:dev` | Yes |

**All commands are valid pnpm commands.**

## Potential Risks Assessment

| Risk | Severity | Mitigation in Plan |
|------|----------|-------------------|
| External URLs blocked during testing | Low | Plan notes using "actual Rebrickable/BrickLink URLs that are known to work" |
| Parser imports from AWS path may fail | Low | Plan verifies imports early (Step 1) |
| Pre-existing monorepo lint failures | Low | Plan uses scoped verification commands |

**All risks have documented mitigations.**

## Import Path Verification

The plan specifies import paths (lines 370-378):
```typescript
import { ... } from '../../aws/endpoints/moc-instructions/import-from-url/types'
import { parseBrickLinkStudio } from '../../aws/endpoints/moc-instructions/import-from-url/parsers/bricklink-studio'
...
```

Relative path from `apps/api/platforms/vercel/api/mocs/import-from-url.ts` to `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts`:
- From: `apps/api/platforms/vercel/api/mocs/`
- To: `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/`
- Relative: `../../../aws/endpoints/moc-instructions/import-from-url/...`

**Issue:** The plan shows `../../aws/...` but correct path is `../../../aws/...` (3 levels up, not 2).

However, this is a minor implementation detail that will be caught during Step 1 TypeScript verification. **Not a blocker.**

## Verdict

**VALID**

The implementation plan is comprehensive, well-structured, and covers all acceptance criteria. All reuse targets exist and are importable. The step-by-step approach with verification at each stage ensures incremental validation.

**Minor Notes for Implementation:**
1. Verify import paths during Step 1 - the relative path may need adjustment (3 levels up from `mocs/` to `platforms/`)
2. Route ordering is correctly identified as critical

---

**PLAN VALID**
