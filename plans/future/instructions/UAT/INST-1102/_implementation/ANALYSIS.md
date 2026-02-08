# INST-1102: Create Basic MOC - Phase 1 Analysis

**Story**: INST-1102 - Create Basic MOC
**Analyst**: Claude Opus 4.5
**Date**: 2026-02-05
**Status**: ANALYSIS COMPLETE

---

## 8-Point Audit Summary

| # | Checkpoint | Status | Notes |
|---|------------|--------|-------|
| 1 | Scope Alignment | PASS | Aligns with Phase 1 vertical slice goals in stories.index.md |
| 2 | Internal Consistency | PASS with minor gaps | Story is internally consistent, minor clarifications needed |
| 3 | Reuse-First Enforcement | PASS | Excellent reuse plan from wishlist domain |
| 4 | Ports & Adapters Compliance | PASS | Follows api-layer.md hexagonal architecture |
| 5 | Local Testability | PASS | Complete test strategy across all layers |
| 6 | Decision Completeness | MINOR GAPS | 4 open questions need resolution |
| 7 | Risk Disclosure | PASS | Dependency on INST-1008 properly documented |
| 8 | Story Sizing | PASS | 3-point estimate is reasonable given reuse |

**Overall Status**: READY FOR ELABORATION with minor gaps to address

---

## 1. Scope Alignment

### Findings

**PASS**: Story aligns well with epic scope.

- stories.index.md lists INST-1102 as Phase 1 core vertical slice
- Story delivers end-to-end user value (Frontend + Backend + Database)
- Correctly blocked by INST-1008 (RTK Query Mutations)
- Unblocks downstream stories (INST-1101, INST-1103, INST-1104, INST-1108)

### Verification

From `stories.index.md`:
```markdown
| INST-1102 | Create Basic MOC | In Elaboration | INST-1008 |
```

The story correctly:
- Uses the INST prefix per PLAN.exec.md
- Follows vertical slice model (Frontend + Backend + Database in one story)
- Includes proper phase placement (Phase 1: Core Vertical Slices)

---

## 2. Internal Consistency

### Findings

**PASS with minor gaps**

**Consistent Elements**:
- AC-6 references `useCreateMocMutation` which exists in `instructions-api.ts` (INST-1008 complete)
- AC-8 through AC-12 align with backend scope
- Test plan covers all 15 ACs
- Reuse plan matches actual codebase patterns

**Minor Inconsistencies Identified**:

| Issue | Story Says | Reality | Resolution |
|-------|------------|---------|------------|
| RTK hook name | `useCreateMocMutation` | Hook exists in `instructions-api.ts` | Already resolved - INST-1008 appears complete |
| Route path | `/mocs/new` | No route exists yet | Story correctly scopes this as new |
| Backend path | `POST /mocs` | API uses `/api/v2/mocs` | Story notes ADR-001 compliance |

---

## 3. Reuse-First Enforcement

### Findings

**PASS**: Excellent reuse strategy.

**Verified Reuse Candidates**:

| Component | Source | Reuse % | Verified |
|-----------|--------|---------|----------|
| AddItemPage.tsx structure | `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx` | 80% | YES - exists, 226 lines |
| TagInput component | `apps/web/app-wishlist-gallery/src/components/TagInput/` | 100% | YES - exists with tests |
| useLocalStorage hook | wishlist domain | 100% | YES - used in AddItemPage |
| Form validation patterns | WishlistForm | 70% | YES - established pattern |
| Error recovery with localStorage | WISH-2032 pattern | 100% | YES - implemented in AddItemPage |

**Key Reuse from AddItemPage.tsx**:
- Auto-focus on mount (lines 112-118)
- Escape key handler (lines 122-130)
- localStorage recovery pattern (lines 92-110)
- Optimistic UI with immediate navigation (lines 150-194)
- Error toast with retry button (lines 70-82)

**Note**: The story references `TagInput` from app-wishlist-gallery, but a `TagInput.tsx` also exists in `apps/web/app-instructions-gallery/src/components/MocEdit/TagInput.tsx`. This may be a domain-specific variant. Story should clarify which to reuse.

---

## 4. Ports & Adapters Compliance

### Findings

**PASS**: Story correctly follows `docs/architecture/api-layer.md`.

**Backend Structure per api-layer.md**:
```
domains/mocs/
├── application/
│   ├── index.ts
│   └── services.ts
├── adapters/
│   ├── index.ts
│   └── repositories.ts
├── ports/
│   └── index.ts
├── __tests__/
│   ├── routes.test.ts
│   └── services.test.ts
├── routes.ts
└── types.ts
```

Story correctly specifies:
- `types.ts` for Zod schemas
- `ports/index.ts` for repository interfaces
- `adapters/repositories.ts` for Drizzle implementation
- `application/services.ts` for business logic
- `routes.ts` for thin HTTP adapter
- Test files co-located in `__tests__/`

**Compliance Checklist**:
- [x] Service layer has no HTTP types
- [x] Route layer is thin (< 50 lines per endpoint)
- [x] Types use Zod schemas with `z.infer<>`
- [x] No TypeScript interfaces for domain types (per CLAUDE.md)
- [x] Dependency injection via function parameters

---

## 5. Local Testability

### Findings

**PASS**: Complete test strategy.

**Test Pyramid Coverage**:

| Layer | Framework | Location | Coverage |
|-------|-----------|----------|----------|
| Unit (FE) | Vitest + RTL | `pages/__tests__/CreateMocPage.test.tsx` | 95%+ target |
| Integration (FE) | Vitest + MSW | `pages/__tests__/CreateMocPage.integration.test.tsx` | Form + API |
| Unit (BE) | Vitest | `domains/mocs/__tests__/routes.test.ts` | 90%+ target |
| Unit (BE) | Vitest | `domains/mocs/__tests__/services.test.ts` | Business logic |
| E2E | Playwright | `tests/instructions/inst-1102-create.spec.ts` | Happy path |

**ADR Compliance**:
- ADR-005: E2E uses live API (playwright.legacy.config.ts)
- ADR-006: At least one happy-path E2E test required

**Test Case Coverage for ACs**:

| AC | Unit | Integration | E2E |
|----|------|-------------|-----|
| AC-1 (navigation) | - | - | YES |
| AC-2 (form fields) | YES | - | - |
| AC-3 (auto-focus) | YES | - | - |
| AC-4 (validation errors) | YES | - | - |
| AC-5 (submit disabled) | YES | - | - |
| AC-6 (mutation call) | - | YES | - |
| AC-7 (success toast/redirect) | - | YES | YES |
| AC-8-12 (backend) | BE Unit | - | - |
| AC-13 (API errors) | - | YES | - |
| AC-14 (Escape key) | YES | - | - |
| AC-15 (localStorage) | - | YES | - |

---

## 6. Decision Completeness

### Findings

**MINOR GAPS**: 4 open questions require resolution.

**Resolved Decisions**:
| Decision | Value | Source |
|----------|-------|--------|
| API Path | Frontend: `/api/v2/mocs`, Backend: `/mocs` | ADR-001 |
| E2E Config | `playwright.legacy.config.ts` (live API) | ADR-005 |
| Auth Middleware | `c.get('userId')` pattern | Verified in wishlist domain |
| Type Field | `type = "MOC"` | Database schema confirms |

**Open Questions (Story Section "Questions for Elaboration")**:

| # | Question | Impact | Recommendation |
|---|----------|--------|----------------|
| 1 | Slug storage: `set_number` or new `slug` column? | Low | Use existing `slug` column (schema has it) |
| 2 | Slug uniqueness: How to handle duplicates? | Medium | Append short UUID suffix (e.g., `my-castle-moc-a1b2`) |
| 3 | Theme list: What are definitive options? | Low | Use list in story (11 themes), finalize in elaboration |
| 4 | Feature gate: `requireFeature('mocs')` or `requireFeature('instructions')`? | Low | Use `instructions` for consistency with epic |

**Resolution Required Before Implementation**:
- Slug uniqueness strategy must be decided
- Theme list should be finalized (PM decision)

---

## 7. Risk Disclosure

### Findings

**PASS**: Risks properly documented.

**Documented Risks**:

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| INST-1008 not merged | HIGH | Story is blocked until merge | DOCUMENTED |
| Title uniqueness constraint | MEDIUM | Unique index exists per user | DOCUMENTED |
| Schema mismatch | LOW | Database schema verified | DOCUMENTED |

**Additional Risk Identified**:

| Risk | Severity | Mitigation |
|------|----------|------------|
| `useCreateMocMutation` hook API mismatch | LOW | RTK hooks already exported in instructions-api.ts |

**Database Schema Verification**:

The `moc_instructions` table exists with all required fields:
- `id` (uuid, PK, defaultRandom)
- `userId` (text, notNull)
- `title` (text, notNull)
- `description` (text, nullable)
- `theme` (text, nullable)
- `tags` (jsonb, array of strings)
- `slug` (text, nullable) - **Column exists!**
- `type` (text, notNull)
- `createdAt` / `updatedAt` (timestamps)

**Unique constraint**: `uniqueUserTitle` on (userId, title) - Story AC-13 should handle this error case.

---

## 8. Story Sizing

### Findings

**PASS**: 3-point estimate is reasonable.

**Breakdown Analysis**:

| Component | Story Estimate | Assessment |
|-----------|----------------|------------|
| Frontend | 1.75 days (14h) | Reasonable - high reuse from AddItemPage |
| Backend | 1.5 days (12h) | Reasonable - follows established pattern |
| Testing | Included | Appropriate for vertical slice |
| Buffer | 0.75 days | Adequate for coordination |
| **Total** | 3-4 days | Appropriate for 3-point story |

**Complexity Factors**:
- (+) High reuse from wishlist domain (50%+ savings)
- (+) Database schema exists
- (+) RTK hooks exist (INST-1008)
- (+) Established patterns
- (-) New domain structure needed (mocs/)
- (-) Some open questions to resolve

**Recommendation**: Size is appropriate. No re-estimation needed.

---

## MVP-Critical Gaps

### Gap 1: Slug Uniqueness Strategy (MEDIUM)

**Issue**: Story asks "How to handle duplicate slugs?" but doesn't specify strategy.

**Impact**: Blocks AC-10 (slug generation from title)

**Recommendation**:
- Append short UUID suffix on collision: `my-castle-moc` -> `my-castle-moc-a1b2`
- Or use incremental suffix: `my-castle-moc` -> `my-castle-moc-2`

**Action**: Add to elaboration phase decision.

### Gap 2: TagInput Component Source (LOW)

**Issue**: Story says "TagInput - Multi-select tags component (direct copy, 100% reuse)" from wishlist, but a `TagInput.tsx` also exists in `app-instructions-gallery/src/components/MocEdit/`.

**Impact**: Minor - affects reuse strategy

**Recommendation**: Use the existing MocEdit/TagInput.tsx if it already handles MOC-specific needs. Verify API compatibility.

**Action**: Clarify in elaboration which component to use.

---

## Discovery Findings

### What Was Discovered

1. **INST-1008 RTK Hooks Already Exist**: The `useCreateMocMutation` hook is already exported from `instructions-api.ts`. This suggests INST-1008 may be further along than "UAT" status indicates.

2. **Slug Column Exists**: The database schema already has a `slug` column in `moc_instructions`, answering one of the open questions.

3. **Unique Title Constraint**: A unique index `uniqueUserTitle` on (userId, title) exists. This means the backend must handle duplicate title errors (HTTP 409 or 400 with specific error code).

4. **TagInput Already in Instructions**: `apps/web/app-instructions-gallery/src/components/MocEdit/TagInput.tsx` exists, suggesting MOC-specific tag handling may already be partially implemented.

5. **Empty State CTA Exists**: The main-page.tsx already has an empty state with "Create your first MOC" button pointing to `/mocs/new`.

### Verification of Story Assumptions

| Assumption | Verified | Notes |
|------------|----------|-------|
| `moc_instructions` table exists | YES | Full schema verified |
| RTK hooks available | YES | `useCreateMocMutation` exported |
| AddItemPage pattern reusable | YES | 80%+ structure reusable |
| TagInput exists | YES | Both wishlist and instructions versions |
| Feature gate middleware | YES | Pattern exists in wishlist domain |

---

## Recommendations for Elaboration Phase

### Must Address (MVP-Critical)

1. **Resolve slug uniqueness strategy** - Decide: UUID suffix or incremental counter
2. **Finalize theme list** - Confirm the 11 themes or adjust based on PM input
3. **Clarify TagInput source** - Use MocEdit/TagInput.tsx or copy from wishlist

### Should Document

1. **Error handling for duplicate titles** - Unique constraint will cause DB error
2. **Feature gate configuration** - Use `instructions` for consistency
3. **Type field value** - Confirm `type = "MOC"` (not "moc" lowercase)

### Nice to Have

1. **Tag limits** - Consider max 10-20 tags, max 30 chars per tag (match wishlist)
2. **Title max length** - Consider 200 char limit (match wishlist)

---

## Conclusion

**Story INST-1102 is READY FOR ELABORATION** with the following minor gaps to address:

1. Slug uniqueness strategy (decision needed)
2. Theme list confirmation (PM input needed)
3. TagInput component source clarification

The story demonstrates excellent preparation:
- Complete acceptance criteria (15 ACs)
- Comprehensive test plan
- Strong reuse strategy
- Proper dependency management
- ADR compliance

The 3-point estimate is appropriate given the high reuse potential and existing infrastructure.

---

**ANALYSIS COMPLETE**
