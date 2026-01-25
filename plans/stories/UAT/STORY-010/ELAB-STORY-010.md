# STORY ELABORATION: STORY-010 — MOC Parts Lists Management

**Elaboration Date:** 2026-01-19
**Auditor:** QA Agent
**Story Version:** `STORY-010.md` (status: backlog)

---

## Overall Verdict: CONDITIONAL PASS

STORY-010 may proceed to implementation after addressing **2 Medium-severity issues**.

---

## Audit Summary

| Category | Status |
|----------|--------|
| Scope Alignment | PASS (with notes) |
| Internal Consistency | PASS |
| Reuse-First Enforcement | PASS |
| Ports & Adapters Compliance | PASS |
| Local Testability | PASS |
| Decision Completeness | PASS |
| Risk Disclosure | CONDITIONAL (2 Medium issues) |

---

## 1) Scope Alignment

**Index Entry (stories.index.md):**
- Status: generated
- Feature: MOC Parts Lists Management
- Endpoints: `moc-parts-lists/create`, `get`, `get-user-summary`, `update`, `update-status`, `delete`, `parse`
- Infrastructure: 7 serverless functions, Cognito auth, PostgreSQL, CSV/XML parsing

**Story Scope:**
- 7 endpoints defined:
  - `POST /api/moc-instructions/{mocId}/parts-lists` (create)
  - `GET /api/moc-instructions/{mocId}/parts-lists` (list)
  - `PUT /api/moc-instructions/{mocId}/parts-lists/{id}` (update)
  - `PATCH /api/moc-instructions/{mocId}/parts-lists/{id}/status` (status update)
  - `DELETE /api/moc-instructions/{mocId}/parts-lists/{id}` (delete)
  - `POST /api/moc-instructions/{mocId}/parts-lists/{id}/parse` (CSV parse)
  - `GET /api/user/parts-lists/summary` (user summary)

**Deviation Analysis:**
1. Index mentions "CSV/XML parsing" but story Non-Goals explicitly states "XML parsing (CSV only for this story)"
   - This is an acceptable scope **reduction**, properly documented
2. Handler naming in index uses format `moc-parts-lists/create/handler.ts` but story routes under `moc-instructions/{mocId}/parts-lists/`
   - Story URL structure is RESTful and correct (parts-lists are nested under moc-instructions)
   - Index handler names are conceptual, not path-literal

**VERDICT: PASS** — No scope creep. XML deferral is explicitly documented.

---

## 2) Internal Consistency

### Goals vs Non-Goals
- Goal: "Enable full CRUD operations and CSV import for MOC parts lists"
- Non-Goals: Image uploads, OpenSearch, XML parsing, WebSocket, sharing, external DB integrations
- **No contradictions**

### Acceptance Criteria vs Scope
| AC | Scope Match |
|----|-------------|
| AC-1 to AC-5: Core CRUD | 5 endpoints covered |
| AC-6: Status updates | PATCH endpoint |
| AC-7 to AC-13: CSV Parsing | POST parse endpoint |
| AC-14: User Summary | GET summary endpoint |
| AC-15 to AC-17: Auth/Authz | Cross-cutting concern |
| AC-18 to AC-19: Error handling | Cross-cutting concern |

### Test Plan vs AC
- HP-1 to HP-8: Cover all 7 endpoint operations
- E-1 to E-8: Cover auth, not found, validation errors
- ED-1 to ED-7: Cover edge cases (empty arrays, concurrent updates, large CSV)

**VERDICT: PASS** — All sections internally consistent.

---

## 3) Reuse-First Enforcement

### Packages to Reuse (Verified)
| Package | Exists | Used Correctly |
|---------|--------|----------------|
| `@repo/logger` | YES | Story references |
| `@repo/vercel-adapter` | YES (verified at `packages/backend/vercel-adapter/`) | Story references for auth/request handling |
| `@repo/file-validator` | YES (verified at `packages/backend/file-validator/`) | Story references for CSV validation |
| `drizzle-orm` | YES | Story references |
| `zod` | YES | Story references |
| `csv-parser` | EXISTS in `apps/api/package.json` | Story correctly identifies as npm dependency |

### Existing Database Tables (Verified)
| Table | Status |
|-------|--------|
| `moc_parts_lists` | EXISTS in `packages/backend/db/src/schema.ts` (lines 373-402) |
| `moc_parts` | EXISTS in `packages/backend/db/src/schema.ts` (lines 405-422) |
| `moc_instructions` | EXISTS (foreign key target) |

Schema verification notes:
- `moc_parts_lists` has `mocId` FK to `moc_instructions` with `onDelete: 'cascade'` ✓
- `moc_parts` has `partsListId` FK to `moc_parts_lists` with `onDelete: 'cascade'` ✓
- Tables have proper indexes for `mocId`, `built`, `purchased`, `partsListId`
- Drizzle relations defined for lazy loading

### New Package to Create
- `@repo/moc-parts-lists-core` (under `packages/backend/moc-parts-lists-core/`)
- Pattern follows `@repo/gallery-core` — confirmed consistent

### Prohibited Patterns (Documented)
- NO copying logger initialization per endpoint ✓
- NO duplicating auth/ownership verification logic ✓
- NO inline CSV parsing in Vercel handlers ✓

**VERDICT: PASS** — Reuse-first is properly enforced. Database schema already exists.

---

## 4) Ports & Adapters Compliance

**Architecture Diagram (from story):**
```
Vercel Handler (Adapter) → Core Logic (Port) → Database (Infrastructure)
```

**Verified Structure:**
- Adapter: `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/`
- Core: `packages/backend/moc-parts-lists-core/src/`
- Infrastructure: `packages/backend/db` (Drizzle ORM)

**Transport Isolation:**
- Core functions receive `DbClient` interface via dependency injection
- Handlers handle HTTP request/response parsing
- No HTTP-specific code in core layer

**VERDICT: PASS** — Clear separation of concerns.

---

## 5) Local Testability

### Backend Tests
| Requirement | Status |
|-------------|--------|
| `.http` file specified | YES — `__http__/moc-parts-lists.http` |
| Required requests listed | YES — 12 requests documented |
| Evidence requirements | YES — Status codes + JSON responses |

### Required `.http` Requests (from story)
1. `createPartsList` — Title only
2. `createPartsListWithParts` — With initial parts array
3. `getPartsLists` — GET all for MOC
4. `updatePartsList` — PUT update metadata
5. `updatePartsListStatus` — PATCH update built/purchased
6. `deletePartsList` — DELETE with cascade
7. `parseCsv` — POST valid CSV
8. `parseCsvInvalid` — Invalid CSV (error)
9. `parseCsvOverLimit` — >10k rows (error)
10. `getUserSummary` — GET user stats
11. `createPartsListUnauth` — 401 test
12. `createPartsListNotFound` — 404 test

### Seed Requirements
- Story specifies: MOC owned by `DEV_USER_SUB`, existing parts list with parts
- Seed location: `apps/api/core/database/seeds/`
- Sample CSV: `apps/api/core/database/seeds/test-parts-list.csv`

### Frontend Tests
- Story has no UI changes — no Playwright required

**VERDICT: PASS** — Tests are concrete and executable.

---

## 6) Decision Completeness

### Open Questions
- Story does not include an "Open Questions" section
- No explicit TBDs found in the story content

### Design Decisions Made
| Decision | Documented |
|----------|------------|
| CSV-only (no XML) | YES — Non-Goals |
| 10,000 row limit | YES — AC-10 |
| 1,000 row batch inserts | YES — AC-13 |
| Transaction atomicity for parse | YES — AC-12 |
| Cascade delete | YES — AC-5 |

**VERDICT: PASS** — No blocking TBDs remain.

---

## 7) Risk Disclosure

### Environment Variables
| Variable | Documented | Risk Level |
|----------|------------|------------|
| `DATABASE_URL` | YES | Standard |
| `AUTH_BYPASS` | YES (dev only) | Dev-only |
| `DEV_USER_SUB` | YES (dev only) | Dev-only |
| `COGNITO_USER_POOL_ID` | YES | Standard |
| `COGNITO_CLIENT_ID` | YES | Standard |

### Performance Constraints (Documented)
- Vercel Pro tier recommended for 60s timeout
- Hobby tier has 10s limit (may be insufficient for large CSV)
- Batch inserts in 1,000 row chunks
- 10,000 row maximum

### Issues Found

**Issue #1: Vercel Tier Assumption (Medium Severity)**
- **Location:** Section "Performance Constraints"
- **Problem:** Story assumes Vercel Pro tier for 60s timeout but doesn't clarify:
  1. What is the current deployed tier?
  2. What happens if current tier is Hobby (10s limit)?
  3. Is there a degradation path or should parse be async?
- **Impact:** Large CSV imports (9,999 rows) may timeout on Hobby tier
- **Required Fix:** Story should document the deployed tier OR specify that parse endpoint requires Pro tier OR add async processing fallback

**Issue #2: `csv-parser` vs `file-validator` Overlap (Medium Severity)**
- **Location:** Reuse Plan
- **Problem:** Story lists both `@repo/file-validator` (for CSV validation) and `csv-parser` (npm, for parsing). The `file-validator` package already has `createLegoPartsListValidationConfig()` and `isDataFile()` which check CSV mime types.
- **Clarification needed:** How do these two work together?
  - Does `file-validator` validate the file metadata (size, mime type)?
  - Does `csv-parser` handle the actual content parsing?
- **Impact:** Potential confusion for Dev on which package handles what
- **Required Fix:** Add clarification in Reuse Plan specifying the boundary:
  - `file-validator` = file metadata validation (size, type, extension)
  - `csv-parser` = content parsing (columns, values, row iteration)

---

## Acceptable As-Is

The following aspects require no modification:

1. **7 endpoint specifications** — Correctly identified with paths, methods, handlers
2. **19 Acceptance Criteria** — Comprehensive coverage
3. **Database schema** — Tables already exist with correct structure and cascade deletes
4. **Architecture Notes** — Clear ports & adapters diagram
5. **Test Plan** — 8 happy paths, 8 error cases, 7 edge cases
6. **HTTP Contract Plan** — 12 required requests documented
7. **Seed Requirements** — Sample CSV and test data defined
8. **Vercel Configuration** — Route rewrites documented

---

## Issues Summary

| # | Issue | Severity | Category | Required Action |
|---|-------|----------|----------|-----------------|
| 1 | Vercel tier timeout assumption undocumented | Medium | Risk Disclosure | Document deployed tier OR add async fallback OR mark Pro-tier required |
| 2 | `file-validator` vs `csv-parser` boundary unclear | Medium | Reuse-First | Add clarification on which package handles what |

---

## Required Fixes Before Implementation

### For Issue #1 (Vercel Tier):
Add to "Performance Constraints" section one of:
- "This story assumes Vercel Pro tier deployment with 60s function timeout"
- OR "Parse endpoint should degrade gracefully with partial success on Hobby tier"
- OR "If Hobby tier, implement async job pattern for large files"

### For Issue #2 (Package Boundary):
Add to "Reuse Plan" section:
```
### Package Responsibilities
- `@repo/file-validator`: Pre-parse validation (file size, MIME type, extension)
- `csv-parser` (npm): Content parsing (column extraction, row iteration, value validation)
```

---

## Gate Decision

| Decision | Rationale |
|----------|-----------|
| **CONDITIONAL PASS** | Story is well-defined and internally consistent. 2 Medium-severity clarifications needed before Dev can proceed with full confidence. These do not require redesign, only documentation clarification. |

**STORY-010 may proceed to DEV implementation** once the PM adds the two clarifications above. Dev may begin work in parallel if they acknowledge these as assumptions.

---

## Elaboration Log

| Timestamp | Action |
|-----------|--------|
| 2026-01-19T12:00:00-07:00 | Elaboration initiated |
| 2026-01-19T12:00:00-07:00 | Read authoritative inputs (story, index, migration plans, QA agent) |
| 2026-01-19T12:00:00-07:00 | Verified `@repo/vercel-adapter` package exists |
| 2026-01-19T12:00:00-07:00 | Verified `@repo/file-validator` package exists with CSV support |
| 2026-01-19T12:00:00-07:00 | Verified `moc_parts_lists` and `moc_parts` tables exist in schema |
| 2026-01-19T12:00:00-07:00 | Verified `csv-parser` exists in apps/api/package.json |
| 2026-01-19T12:00:00-07:00 | 7 checklist items evaluated |
| 2026-01-19T12:00:00-07:00 | 2 Medium issues identified |
| 2026-01-19T12:00:00-07:00 | Elaboration complete — CONDITIONAL PASS |
