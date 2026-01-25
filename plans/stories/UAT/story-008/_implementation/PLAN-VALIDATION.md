# Plan Validation: STORY-008

## Summary
- Status: **VALID**
- Issues Found: 0
- Blockers: 0

---

## AC Coverage

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-1 | Update Image Endpoint (PATCH) | Step 2, 8 | OK |
| AC-2 | Update Field Validation | Step 1, 2 | OK |
| AC-3 | Album Validation on Update | Step 2 | OK |
| AC-4 | Empty Body Handling | Step 2, 3 | OK |
| AC-5 | Delete Image Endpoint (DELETE) | Step 4, 9 | OK |
| AC-6 | Delete Cascade Behavior | Step 4, 5 | OK |
| AC-7 | S3 Cleanup Behavior | Step 9 | OK |
| AC-8 | Extend gallery-core Package | Step 1, 2, 3, 4, 5, 6 | OK |
| AC-9 | Seed Data | Step 7 | OK |
| AC-10 | HTTP Contract Verification | Step 10 | OK |

All 10 ACs from the story are covered in the implementation plan.

---

## File Path Validation

### Files to Create (5 files)
| File Path | Valid Pattern | Status |
|-----------|---------------|--------|
| `packages/backend/gallery-core/src/update-image.ts` | Yes | OK |
| `packages/backend/gallery-core/src/delete-image.ts` | Yes | OK |
| `packages/backend/gallery-core/src/__tests__/update-image.test.ts` | Yes | OK |
| `packages/backend/gallery-core/src/__tests__/delete-image.test.ts` | Yes | OK |
| (No new test files in Vercel handler - uses .http verification) | N/A | OK |

### Files to Modify (4 files)
| File Path | Exists | Status |
|-----------|--------|--------|
| `packages/backend/gallery-core/src/__types__/index.ts` | Yes | OK |
| `packages/backend/gallery-core/src/index.ts` | Yes | OK |
| `apps/api/platforms/vercel/api/gallery/images/[id].ts` | Yes | OK |
| `apps/api/core/database/seeds/gallery.ts` | Yes | OK |
| `__http__/gallery.http` | Yes | OK |

**Valid paths:** 9
**Invalid paths:** 0

All file paths follow the expected directory structure:
- `packages/backend/**` for core logic
- `apps/api/platforms/vercel/**` for Vercel handlers
- `apps/api/core/database/seeds/**` for seed data

---

## Reuse Target Validation

| Target | Exists | Location |
|--------|--------|----------|
| `packages/backend/gallery-core` | Yes | `/packages/backend/gallery-core/` |
| `@repo/logger` | Yes | `/packages/core/logger/` |
| `@aws-sdk/client-s3` | Yes | Declared in `apps/api/package.json` |
| `packages/backend/db` | Yes | `/packages/backend/db/` |

### Pattern Sources (for following established patterns)
| Source | Exists | Location |
|--------|--------|----------|
| `update-album.ts` | Yes | `/packages/backend/gallery-core/src/update-album.ts` |
| `delete-album.ts` | Yes | `/packages/backend/gallery-core/src/delete-album.ts` |
| `gallery/albums/[id].ts` | Yes | `/apps/api/platforms/vercel/api/gallery/albums/[id].ts` |
| `gallery.ts` seed | Yes | `/apps/api/core/database/seeds/gallery.ts` |

All reuse targets exist and are available.

---

## Step Analysis

- **Total steps:** 12
- **Steps with verification:** 12 (100%)
- **Issues:** None

### Step Verification Commands
| Step | Objective | Verification | Valid |
|------|-----------|--------------|-------|
| 1 | Add UpdateImageInputSchema | `pnpm check-types --filter gallery-core` | Yes |
| 2 | Create update-image.ts | `pnpm check-types --filter gallery-core` | Yes |
| 3 | Create update-image.test.ts | `pnpm test --filter gallery-core` | Yes |
| 4 | Create delete-image.ts | `pnpm check-types --filter gallery-core` | Yes |
| 5 | Create delete-image.test.ts | `pnpm test --filter gallery-core` | Yes |
| 6 | Export new functions | `pnpm check-types --filter gallery-core` | Yes |
| 7 | Add seed data | `pnpm seed` | Yes |
| 8 | Extend [id].ts with PATCH | `pnpm check-types` | Yes |
| 9 | Extend [id].ts with DELETE | `pnpm check-types` | Yes |
| 10 | Add HTTP contract requests | Manual verification | Yes |
| 11 | Run full lint/test | `pnpm lint && pnpm check-types && pnpm test` | Yes |
| 12 | Integration verification | `vercel dev` + .http execution | Yes |

### Dependency Order Analysis
Steps are correctly ordered:
1. Schema first (Step 1) - no dependencies
2. Core functions (Steps 2, 4) - depend on schema
3. Tests (Steps 3, 5) - depend on core functions
4. Exports (Step 6) - depends on core functions
5. Seed data (Step 7) - independent, can run parallel
6. Handler modifications (Steps 8, 9) - depend on core functions
7. HTTP contracts (Step 10) - depends on handlers
8. Full verification (Steps 11, 12) - final validation

No circular dependencies detected.

---

## Test Plan Feasibility

### .http File Verification
- **Base file exists:** Yes (`__http__/gallery.http`)
- **Can add new requests:** Yes
- **Existing pattern:** STORY-007 already added image endpoints to this file

### Playwright Tests
- **Not applicable:** This is a backend-only story (no UI changes)
- **Plan correctly states:** "NOT APPLICABLE - Backend-only story, no UI changes"

### Unit Test Commands
All test commands are valid pnpm commands:
```bash
pnpm test --filter gallery-core
pnpm test --filter gallery-core -- update-image.test.ts
pnpm test --filter gallery-core -- delete-image.test.ts
```

### Type Check Commands
All type check commands are valid:
```bash
pnpm check-types --filter gallery-core
pnpm check-types
```

### Lint Commands
All lint commands are valid:
```bash
pnpm lint --filter gallery-core
pnpm lint
```

---

## Architecture Compliance

### Ports & Adapters Pattern
The plan correctly separates:
- **Core (Port):** `update-image.ts`, `delete-image.ts` in `packages/backend/gallery-core/`
- **Adapter:** Handler modifications in `apps/api/platforms/vercel/api/gallery/images/[id].ts`

### S3 Cleanup Location
The plan correctly places S3 cleanup in the **handler** (adapter), not in core:
> "**Note**: S3 cleanup belongs in the **handler** (adapter), not core, because it requires AWS SDK configuration"

This aligns with the ports & adapters architecture where infrastructure concerns stay in adapters.

### DI Pattern
The plan follows established DI patterns from `update-album.ts` and `delete-album.ts`:
- `UpdateImageDbClient` interface for testability
- `DeleteImageDbClient` interface for testability

---

## Seed Data Validation

### Required Entities (from story)
| Entity | ID Pattern | Purpose | In Plan |
|--------|------------|---------|---------|
| Image | `66666666-6666-6666-6666-666666666666` | Update test | Yes |
| Image | `77777777-7777-7777-7777-777777777777` | Delete test | Yes |
| Image | `88888888-8888-8888-8888-888888888888` | Album cover cascade | Yes |
| Image | `99999999-9999-9999-9999-999999999998` | Flagged delete test | Yes |
| Album | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | Cover test album | Yes |
| Flag | `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee` | Cascade delete test | Yes |

All required seed entities are documented in the plan.

### Idempotency
The existing seed uses upsert pattern (`ON CONFLICT DO UPDATE`), which the plan should follow.

---

## Open Questions / Blockers

None. The story explicitly resolves all decisions:
- Soft vs Hard Delete: **Hard delete**
- S3 Deletion: **Best-effort, DB-first**
- Album Cover Handling: **Clear coverImageId before delete**
- Empty Body PATCH: **200 with updated lastUpdatedAt**

---

## Verdict

**VALID**

The implementation plan is complete and accurate:
1. All 10 ACs are mapped to specific steps
2. All file paths are valid and follow project conventions
3. All reuse targets exist and are available
4. All 12 steps have verification actions
5. Steps are in correct dependency order
6. Test plan is feasible (unit tests + .http verification)
7. Architecture correctly separates concerns (S3 cleanup in handler, not core)
8. Seed data requirements are fully documented

The plan can proceed to implementation.

---

**PLAN VALID**
