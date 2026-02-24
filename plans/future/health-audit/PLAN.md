# Epic: Monorepo Health Audit Fixes

**Prefix:** HLTH
**Date:** 2026-02-22
**Source:** AUDIT-REPORT.md / FIX-PLAN.md (generated 2026-02-22)

## Overview

Full-repo quality gate audit revealed build failures, type errors, test failures, and lint errors across 20 packages. This epic addresses all findings in priority order so that the CI pipeline reaches green.

**Baseline (2026-02-22):**
| Check | Packages | Passed | Failed |
|-------|----------|--------|--------|
| Build | 58 | 57 | 1 |
| Type Check | 25 | 13 | 12 |
| Lint | 34 | 25 | 9 |
| Test | 82 | 68 | 14 |

**Target:** 0 build failures · 0 type errors · 0 lint failures · ≥95% test pass rate

---

## Work Streams

### Stream 1 — P1: Build Blocker

| Story | Title | Effort |
|-------|-------|--------|
| HLTH-1001 | Fix `@repo/knowledge-base` build failures | S |

### Stream 2 — P2: Shared Type Root Causes (high blast radius)

| Story | Title | Effort |
|-------|-------|--------|
| HLTH-1002 | Deduplicate `react-hook-form` version across workspace | XS |
| HLTH-1003 | Fix `import.meta.env` type errors in `@repo/api-client` | XS |
| HLTH-1004 | Restore Zod exports in `QuotaIndicator.tsx` | S |
| HLTH-1005 | Prefix unused RTK callback variables in `@repo/api-client` | XS |
| HLTH-1006 | Add missing peer deps to `@repo/cache` | XS |
| HLTH-1007 | Register missing TanStack Router routes in `@repo/main-app` | M |
| HLTH-1008 | Resolve missing `@repo/upload-client` module | M |
| HLTH-1009 | Add missing upload mutation exports to `@repo/api-client` | S |

### Stream 3 — P3: Test Infrastructure

| Story | Title | Effort |
|-------|-------|--------|
| HLTH-1010 | Add `VITE_SERVERLESS_API_BASE_URL` to Vitest env config | XS |
| HLTH-1011 | Install `msw` dev dep in `@repo/api-client` | XS |
| HLTH-1012 | Fix `vi.mock` factories missing `useUpdateItemPurchaseMutation` | S |
| HLTH-1013 | Fix `@repo/app-dashboard` logger mock + QuickActions test | XS |
| HLTH-1014 | Fix `@repo/app-instructions-gallery` test infrastructure | M |
| HLTH-1015 | Fix minor single-package test issues (db, kbar-sync, main-app, upload) | S |

### Stream 4 — P3: Test Selector Fixes (shadcn upgrade data-testid breakage)

| Story | Title | Effort |
|-------|-------|--------|
| HLTH-1016 | Update `@repo/gallery` tests after shadcn `data-testid` → `data-slot` | L |
| HLTH-1017 | Update wishlist/dashboard/sets-gallery tests for selector changes | M |
| HLTH-1018 | Fix `@repo/knowledge-base` test DB schema issues | M |

### Stream 5 — P4: Lint Cleanup

| Story | Title | Effort |
|-------|-------|--------|
| HLTH-1019 | Fix `@repo/accessibility-testing` ESLint env config | XS |
| HLTH-1020 | Auto-fix remaining lint errors across 8 packages | S |

---

## Execution Order

```
Week 1 — Blockers + shared root causes (unlocks 80+ errors):
  HLTH-1001 → HLTH-1002 → HLTH-1003 → HLTH-1004 → HLTH-1005 → HLTH-1006

Week 1–2 — Remaining type issues + test infrastructure:
  HLTH-1007 → HLTH-1008 → HLTH-1009 → HLTH-1010 → HLTH-1011 → HLTH-1012

Week 2 — Test selector fixes:
  HLTH-1016 → HLTH-1017 → HLTH-1013 → HLTH-1014

Week 2–3 — DB schema + remaining:
  HLTH-1018 → HLTH-1015

Week 3 — Lint cleanup:
  HLTH-1019 → HLTH-1020
```

---

## Dependency Graph

```
HLTH-1001 (build)
  └── (unblocks all subsequent type checks)

HLTH-1003 (api-client env types)
  └── HLTH-1004 (QuotaIndicator Zod)
        └── HLTH-1005 (RTK unused vars)
              └── clears type errors in all 9 app packages

HLTH-1008 (upload-client module) ──► HLTH-1009 (upload mutations)
  └── HLTH-1014 (app-instructions-gallery tests)

HLTH-1010 (vitest env)
HLTH-1011 (msw install) ──► unblocks api-client tests

HLTH-1016 ──► HLTH-1017  (shadcn data-testid fixes)
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Build failures | 0 |
| Type errors | 0 |
| Lint errors | 0 |
| Test pass rate | ≥ 95% |
| Packages with all-green CI | ≥ 50/58 |

---

## Change Log

| Date | Description |
|------|-------------|
| 2026-02-22 | Initial plan generated from full-repo health audit |
