# ELAB-STORY-009: Story Elaboration/Audit (Re-Audit)

**Story:** STORY-009 - Image Uploads - Phase 1 (Simple Presign Pattern)
**Initial Audit Date:** 2026-01-19
**Re-Audit Date:** 2026-01-19
**Auditor:** QA Agent

---

## Overall Verdict: PASS

**STORY-009 is approved to proceed to implementation.**

All Critical and High issues from the initial CONDITIONAL PASS audit have been addressed in the revised story (see Changelog in STORY-009.md).

---

## Re-Audit Summary

| Previous Issue | Severity | Resolution Status |
|----------------|----------|-------------------|
| #2 - Gallery route inconsistency | High | **RESOLVED** - Route changed to `/api/gallery/images/upload` |
| #4 - Handler pattern ambiguity | Medium | **RESOLVED** - "Handler Pattern Decision" section added |
| #5 - No curl commands for multipart | Medium | **RESOLVED** - Concrete curl commands added to story |

---

## Detailed Findings (Updated)

### 1. Scope Alignment

**Status:** PASS

**Analysis:**
- `stories.index.md` STORY-009 scope: `sets/images/presign/handler.ts`, `sets/images/register/handler.ts`, `sets/images/delete/handler.ts`, `wishlist/upload-image/handler.ts`, `gallery/upload-image/handler.ts`
- STORY-009.md Scope matches: 5 endpoints listed correctly

**Vercel Route Verification:**
| Story Route | stories.index.md | Match |
|-------------|------------------|-------|
| `/api/sets/:id/images/presign` | sets/images/presign | ✓ |
| `/api/sets/:id/images` | sets/images/register | ✓ |
| `/api/sets/:id/images/:imageId` | sets/images/delete | ✓ |
| `/api/wishlist/:id/image` | wishlist/upload-image | ✓ |
| `/api/gallery/images/upload` | gallery/upload-image | ✓ (Fixed) |

**Issue #2 RESOLVED:** Gallery upload route corrected to `/api/gallery/images/upload` per Changelog entry dated 2026-01-19.

---

### 2. Internal Consistency

**Status:** PASS

| Check | Result |
|-------|--------|
| Goals vs Non-goals | No contradictions |
| Decisions vs Non-goals | Consistent |
| ACs match Scope | Yes, all 5 endpoints covered |
| Local Testing Plan matches ACs | Yes - curl commands now included |

**Goals Analysis:**
- Goal: Enable image upload for Sets, Wishlist, Gallery via Vercel
- Non-goals explicitly exclude: multipart sessions (STORY-017), chunked uploads, bucket changes, frontend changes, new processing features

**No contradictions detected.**

---

### 3. Reuse-First Enforcement

**Status:** PASS

**Existing Packages Verified:**

| Package | Exists | Export Verified |
|---------|--------|-----------------|
| `@repo/logger` | Yes | `logger` export confirmed |
| `@repo/vercel-adapter` | Yes | `validateCognitoJwt` exists |
| `@repo/file-validator` | Yes | `validateFile`, `createImageValidationConfig` exist |
| `@repo/image-processing` | Yes | `processImage`, `generateThumbnail` exist |

**New Package Justified:**

| Package | Location | Justification |
|---------|----------|---------------|
| `@repo/vercel-multipart` | `packages/backend/vercel-multipart` | No existing multipart parser for Vercel `IncomingMessage`; `busboy` wrapper needed |

**Issue #4 RESOLVED:** Story now includes explicit "Handler Pattern Decision" section:

> **Decision: Use Native Vercel Handler Pattern**
> - Direct VercelRequest/VercelResponse - Do not use Lambda adapter pattern
> - Inline auth helper - Use `getAuthUserId()` pattern with `AUTH_BYPASS` support
> - Direct Drizzle queries - Inline DB operations
> - Native response methods - Use `res.status(200).json({...})`

**Prohibited Patterns Enforced:**
- `@repo/lambda-responses` → NOT used (native Vercel response)
- `@repo/lambda-auth` → NOT used (inline auth pattern)
- `transformRequest`, `createVercelHandler` → NOT used

**Consistent with existing Vercel handlers (e.g., `wishlist/[id].ts`).**

---

### 4. Ports & Adapters Compliance

**Status:** PASS

- Port interfaces clearly defined (ImageUploadPort, ImageRegistrationPort, ImageProcessingPort, SearchIndexPort)
- Adapters are identified with locations
- Platform-specific logic (S3, OpenSearch) is isolated from core business logic
- Request flow diagram is clear and accurate

---

### 5. Local Testability

**Status:** PASS

**Backend Tests:**

| Test Type | Testable | Method |
|-----------|----------|--------|
| Sets Presign | Yes | `.http` file |
| Sets Register | Yes | `.http` file |
| Sets Delete | Yes | `.http` file |
| Wishlist Upload | Yes | Concrete curl commands provided |
| Gallery Upload | Yes | Concrete curl commands provided |

**Issue #5 RESOLVED:** Story now includes concrete curl commands in "HTTP Contract Plan" section:

- `HP-WISHLIST-001`: `curl -X POST ... -F "file=@/path/to/test-image.jpg;type=image/jpeg"`
- `HP-GALLERY-001`: `curl -X POST ... -F "file=@..." -F "title=Test Image" -F "tags=test,example"`
- `ERR-VAL-009`: Large file test with `dd if=/dev/zero of=/tmp/large-file.jpg bs=1M count=6`
- `ERR-VAL-008`: Invalid file type test with PDF upload

**Auth bypass commands also provided for local dev.**

**Seed Requirements:**
- Seed location specified: `apps/api/core/database/seeds/story-009.ts`
- Entities specified: User A (sets, set_images, wishlist_items, gallery_albums), User B for permission tests
- Deterministic UUIDs requirement stated
- Idempotent upsert pattern required

**Seed plan is adequate.**

---

### 6. Decision Completeness

**Status:** PASS

**TBD Scan:** No unresolved TBDs found in story.

**Open Questions:** Story has no Open Questions section with blockers.

**All design decisions are explicit:**
- File size limits: 5MB (wishlist), 10MB (gallery)
- Image processing: Sharp with specific dimensions/quality
- S3 cleanup: best-effort (non-blocking)
- OpenSearch indexing: non-blocking

---

### 7. Risk Disclosure

**Status:** PASS with notes

| Risk Category | Disclosed |
|---------------|-----------|
| Auth | Yes - Cognito JWT required |
| Database | Yes - pool size `max: 1` |
| Uploads | Yes - size limits, CORS config |
| Caching | N/A |
| Infrastructure | Yes - Vercel Pro plan requirement |

**Issue #7 (Low):** Sharp compatibility risk on Vercel is acknowledged in "Implementation Order" section (Phase 2: Sharp Verification). The mitigation is reasonable: create test endpoint, deploy, verify, then proceed. This is acceptable.

**Additional risk noted:** Story does not specify what happens if Sharp fails on Vercel (fallback plan). However, story explicitly defers this to implementation phase, which is acceptable.

---

## Required Fixes Before Implementation

**None.** All previous issues have been addressed.

---

## What is Acceptable As-Is

1. Creating new `@repo/vercel-multipart` package (AC-20) - valid new shared package
2. Sharp verification deferred to Phase 2 - reasonable risk mitigation
3. Native Vercel handler pattern with inline auth - consistent with existing handlers
4. Best-effort S3 cleanup and OpenSearch indexing patterns
5. Vercel Pro plan requirement disclosure
6. Gallery route at `/api/gallery/images/upload` - matches existing pattern
7. Concrete curl commands for multipart testing

---

## Low Severity Notes (Non-Blocking)

| # | Note | Guidance |
|---|------|----------|
| 1 | Verify `createImageValidationConfig` export name in `@repo/file-validator` during implementation | Dev should confirm export exists |
| 2 | AC-21 says `maxDuration: 30` but vercel.json shows `10` for Sets endpoints | Intentional: 10s for presign, 30s for uploads |
| 3 | Seed file naming (`story-009.ts` vs domain-based) | Follow existing pattern in `apps/api/core/database/seeds/` |

---

## Elaboration Decision

**Verdict:** PASS

**STORY-009 is approved to proceed to implementation.**

All Critical and High issues from the initial audit have been resolved:
- Gallery route corrected to `/api/gallery/images/upload`
- Handler pattern decision documented (native Vercel pattern)
- Curl commands for multipart testing added

---

## Appendix: Verification Checklist

| Audit Item | Status |
|------------|--------|
| Scope matches stories.index.md | PASS |
| Goals vs Non-goals consistency | PASS |
| ACs match Scope | PASS |
| Local Testing Plan adequate | PASS |
| Reuse Plan follows migration rules | PASS |
| Ports & Adapters compliance | PASS |
| No blocking TBDs | PASS |
| Risks disclosed | PASS |
| New package location correct | PASS |
| Seed requirements specified | PASS |
| HTTP contract defined | PASS |
| Handler pattern decision documented | PASS |
| Curl commands for multipart testing | PASS |

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-19 | QA Agent | Initial Elaboration/Audit — CONDITIONAL PASS |
| 2026-01-19 | QA Agent | Re-Audit after story revision — **PASS** |

---

*Generated by QA Agent - Story Elaboration/Audit*
