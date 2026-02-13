# Elaboration Analysis - REPA-003

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. Migrates useUploadManager and useUploaderSession to @repo/upload/hooks. No extra features or infrastructure. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and Acceptance Criteria are fully aligned. No contradictions detected. |
| 3 | Reuse-First | PASS | — | Story correctly identifies and reuses @repo/upload-types, @repo/logger, @repo/app-component-library. Upload client dependency explicitly tracked via REPA-002. |
| 4 | Ports & Adapters | N/A | — | No API endpoints. Story only migrates React hooks (frontend business logic). Hooks are transport-agnostic by nature. |
| 5 | Local Testability | PASS | — | AC-9 through AC-12 define comprehensive unit tests for both hooks. Test migration strategy clearly documented. Baseline test coverage: 859 lines for useUploadManager (34 tests), 269 lines for useUploaderSession (8 tests). |
| 6 | Decision Completeness | PASS | — | Dependency injection approach for auth state is fully specified. Session key migration strategy documented. No blocking TBDs. Open Questions section not present (implies all resolved). |
| 7 | Risk Disclosure | PASS | — | Breaking changes in useUploaderSession API clearly disclosed. Dependency chain blocking (REPA-001, REPA-002) explicitly documented. Test migration complexity acknowledged. Session migration edge cases identified. |
| 8 | Story Sizing | PASS | — | 5 SP is reasonable. 2 hooks to migrate, ~1100 lines total implementation, ~1100 lines tests to migrate. 4 files to update, 4 files to delete. Clear 4-phase implementation sequence (10 hours estimated). Not oversized. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Upload client import path divergence | High | Story must clarify that main-app uses `@/services/api/uploadClient` while app-instructions-gallery uses `@repo/upload-client`. After consolidation, both must import from `@repo/upload/client` (requires REPA-002 completion). This is correctly identified as a blocking dependency but needs explicit migration instruction. |
| 2 | Session storage key format mismatch | High | CRITICAL: Current implementation in @repo/upload-types/src/session.ts uses `uploader:{route}:{userId\|anon}` format (line 78). Story documentation (AC-4, AC-10, Architecture Notes) specifies `uploader-session:{userId}` and `uploader-session-anon:{sessionId}` format. This is a breaking change that will invalidate all existing user sessions. Must either: (a) Update story to use existing format, OR (b) Implement localStorage key migration to preserve user sessions during upgrade. |
| 3 | useToast import path inconsistency | Low | main-app imports from `@repo/app-component-library/hooks/useToast`, app-instructions-gallery imports from `@repo/app-component-library`. Story should standardize import path (likely the latter per CLAUDE.md barrel export rule). |

## Split Recommendation

**Not Applicable** - Story passes sizing check.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

The story is well-elaborated with comprehensive PM artifacts, clear acceptance criteria, and thorough test planning. However, three implementation-level gaps require clarification before dev work begins:

1. **Import path migration instructions** for upload client (main-app has app-local import, gallery uses shared package)
2. **Storage key format verification** to ensure localStorage backward compatibility
3. **useToast import standardization** across both apps

These are addressable within the current story scope. No split required.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Upload client import path migration not explicitly documented | Core migration flow | Add explicit AC or implementation note: "Update main-app import from `@/services/api/uploadClient` to `@repo/upload/client` (verify REPA-002 provides this path)". Document that main-app currently has app-local uploadClient.ts file that must be deleted. Verified: main-app uses `@/services/api/uploadClient`, gallery uses `@repo/upload-client`. |
| 3 | Story references non-existent migrateSession(oldKey, newKey) utility | Session migration (AC-7) | Story Architecture Notes line 283 references `migrateSession(oldAnonKey, newUserKey)` for localStorage key migration. This utility does NOT exist in @repo/upload-types. The exported `migrateSession` is for schema version migration only. Must either: (a) implement this utility in REPA-006, or (b) inline the localStorage key migration logic in useUploaderSession. |
| 2 | Storage key format mismatch will break existing sessions | Session restoration (core feature) | VERIFIED MISMATCH: @repo/upload-types/src/session.ts line 78 uses `uploader:{route}:{userId}` format. Story specifies `uploader-session:{userId}` format (no route). This breaks existing user sessions. REQUIRED FIX: Either (a) update AC-4, AC-10, and Architecture Notes to use `uploader:{route}:{userId}` format, OR (b) add migrateSession utility call in useUploaderSession initialization to migrate from old keys to new keys. Recommendation: Use existing format (option a) to avoid migration complexity. |

**Explanation:**
- **Gap #1** blocks implementation because main-app's upload client import is different from gallery app. The consolidated hook cannot import from two different paths.
- **Gap #2** blocks session restoration which is a core feature (AC-6). If key format changes, existing users with in-progress sessions will lose their work.

**Additional Context:**
- Story mentions `migrateSession(oldKey, newKey)` utility (Architecture Notes line 283) but this utility does not exist in @repo/upload-types. Only schema version migration exists. This is tracked as non-blocking because session migration can be implemented inline in the hook if needed.

---

## Worker Token Summary

- Input: ~55,000 tokens (story file, PM artifacts, hook implementations, package structure, consuming components)
- Output: ~3,000 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
