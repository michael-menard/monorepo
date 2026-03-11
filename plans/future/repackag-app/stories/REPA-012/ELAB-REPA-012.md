# Elaboration Report - REPA-012

**Date**: 2026-02-10
**Verdict**: CONDITIONAL PASS

## Summary

REPA-012 (Create @repo/auth-hooks Package) is well-scoped, internally consistent, and ready for implementation with one medium-severity design decision documented. The story consolidates ~800 lines of auth hook code from main-app and 6 gallery app stubs into a single, well-tested shared package. All quality gates are defined, test migration strategy preserves 451 lines of existing tests, and one implementation note addresses circular dependency mitigation (use @repo/logger instead of useToast).

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index entry exactly: Create @repo/auth-hooks, implement useModuleAuth, move usePermissions/useTokenRefresh, delete 6 stubs |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, AC all align. No contradictions found |
| 3 | Reuse-First | PASS | — | Moves existing code from main-app, references @repo/upload structure, imports from @repo/api-client |
| 4 | Ports & Adapters | PASS | — | Frontend-only package, no API endpoints. Hooks read from Redux (adapter pattern). No business logic violations |
| 5 | Local Testability | PASS | — | Comprehensive test migration plan. 451 LOC of existing tests to migrate + new useModuleAuth tests. Vitest + RTL specified |
| 6 | Decision Completeness | CONDITIONAL | Medium | One unresolved design question: circular dependency mitigation for useTokenRefresh → useToast |
| 7 | Risk Disclosure | PASS | — | All risks disclosed: RTK Query dependency, Redux store dependency, test migration fragility, circular dependency |
| 8 | Story Sizing | PASS | — | 5 SP appropriate: 3 migrations (2.5 SP) + 1 new implementation (1.5 SP) + cleanup (0.5 SP). No split needed |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Circular dependency risk: @repo/auth-hooks → @repo/app-component-library (useToast) → @repo/auth-hooks (usePermissions) | Medium | Mitigation strategy required: Either extract toast to separate package, use @repo/logger instead, or accept circular import with careful packaging | RESOLVED: Use @repo/logger in useTokenRefresh (simplest MVP approach) |
| 2 | TypeScript interface in stub files needs Zod conversion | Low | Convert `interface UseModuleAuthReturn` to Zod schema in AC-2 (already planned) | COVERED: AC-2 explicitly requires Zod schema conversion |
| 3 | Story uses term "delete" for stub files but doesn't specify git tracking cleanup | Low | Clarify in AC-5: "Delete 6 stub files and remove from git" | CLARIFIED: Deletion automatically removes from git (standard behavior) |

## Split Recommendation

**Not Required**

Story is appropriately sized at 5 SP:
- Clear boundaries: 3 migrations + 1 implementation + cleanup
- Each AC independently testable
- No bundled features
- Single package creation (not multiple systems)

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Circular dependency risk: @repo/auth-hooks → @repo/app-component-library (useToast) → @repo/auth-hooks (usePermissions) | Implementation Note | Medium severity but not MVP-blocking. Resolution: Replace useToast with @repo/logger in useTokenRefresh. Functionality preserved (users still see notifications via logger). Future enhancement tracked: create @repo/notifications package |
| 2 | TypeScript interface in stub files needs Zod conversion | Already Covered | Low severity. Already addressed in AC-2. No additional AC needed |
| 3 | Story uses term "delete" for stub files but doesn't specify git tracking cleanup | Clarify AC | Low severity. Deletion automatically removes from git when committed (standard git behavior) |

### Enhancement Opportunities

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | **Circular Dependency Resolution** - Extract toast notifications to separate package | KB-logged | HIGH PRIORITY future enhancement. Create @repo/notifications package to eliminate circular dependency between @repo/auth-hooks and @repo/app-component-library. Recommend as next story: REPA-022 |
| 2 | **Composable Auth Hook** - Create useAuth() that combines all auth functionality | KB-logged | Developer experience enhancement. Single hook API combining useModuleAuth, usePermissions, useTokenRefresh. Consider for REPA-023 |
| 3 | **Token Refresh Customization** - Hardcoded toast notification | KB-logged | Accept notification renderer as optional prop: useTokenRefresh({ onRefreshError?: (error) => void }). Track for REPA-018 or REPA-023 |
| 4 | **Permission Caching Strategy** - No client-side cache invalidation strategy documented | KB-logged | Documentation gap. Document when apps should call invalidatePermissionsMutation (after tier upgrade, resource creation, etc.) |
| 5 | **Quota Polling** - No real-time quota updates | KB-logged | Performance enhancement. Add optional polling to usePermissions: usePermissions({ pollInterval?: number }) for apps needing real-time quota display |
| 6 | **Admin Override Hook** - No dedicated hook for admin checks with bypass logic | KB-logged | Future enhancement. Create useAdminGuard(feature) hook that bypasses feature gates for admins |
| 7 | **Permission Preloading** - No prefetch strategy for permissions on app load | KB-logged | Performance enhancement. Add prefetchPermissions() utility for apps to call during auth initialization |
| 8 | **Offline Permissions** - No fallback when permissions API fails | KB-logged | Edge case handling. Add localStorage caching of last known permissions for offline/degraded mode |
| 9 | **Permission Change Notifications** - No way to detect when permissions change | KB-logged | Integration opportunity. Add WebSocket integration or polling to notify users when permissions change server-side |
| 10 | **Type-Safe Feature Checks** - hasFeature accepts any string, no autocomplete | KB-logged | UX polish. Enhance TypeScript types to provide autocomplete for Feature enum values |

### Follow-up Stories Suggested

- [ ] Not applicable in autonomous mode

### Items Marked Out-of-Scope

- Not applicable in autonomous mode

### KB Entries Created (Autonomous Mode Only)

15 knowledge base entries created for non-blocking findings and future enhancements:
- Circular dependency resolution (HIGH PRIORITY)
- Composable auth hook
- Token refresh customization
- Permission caching strategy
- Quota polling
- Admin override hook
- Permission preloading
- Offline permissions
- Permission change notifications
- Type-safe feature checks
- Context-based auth alternative (REPA-018)
- E2E tests for useModuleAuth
- RTK Query runtime validation
- JSDoc examples for helper hooks
- README badges for package health

## Proceed to Implementation?

**YES - story may proceed**

CONDITIONAL PASS verdict supports implementation with clear design decision documented:
- Implementer should follow AC-4 note: "Check for circular dependency: If useTokenRefresh imports from @repo/app-component-library, refactor to use @repo/logger instead"
- All MVP-critical requirements are addressed in acceptance criteria
- Test migration strategy (451 LOC of existing tests) is comprehensive
- All non-blocking findings tracked for future enhancement
- No blocking issues detected

---

## Implementation Notes for Developers

### Circular Dependency Mitigation (AC-4)
When migrating useTokenRefresh, if it currently imports `useToast` from @repo/app-component-library:
1. Replace useToast import with @repo/logger
2. Change notification logic to use logger-based notifications
3. Functionality preserved: users still see notifications (via logger toast utilities)
4. Future enhancement tracked: Extract toast to separate @repo/notifications package (REPA-022)

### Quality Gates Before Completion
Verify before marking story complete:
- All acceptance criteria met
- Package builds: `pnpm build packages/core/auth-hooks`
- All tests pass: `pnpm test:all`
- Coverage minimum 45%: `pnpm test packages/core/auth-hooks --coverage`
- Linting passes: `pnpm lint:all`
- Type checking passes: `pnpm check-types:all`
- Formatting applied: `pnpm format packages/core/auth-hooks`
- No console.log statements (use @repo/logger)
- All imports use direct paths (no barrel files)
- All types defined via Zod schemas (no bare TypeScript interfaces)
- QuotaIndicator and FeatureGate components still work correctly
- All 6 gallery apps build and run without errors
- Toast notifications still display on token refresh failure
- No circular dependency errors in build logs

---

## Historical Notes

**Elaboration Phases:**
- Phase 1 (Discovery): Completed 2026-02-10 - Story scoping, codebase scanning, risk identification
- Phase 2 (Analysis): Completed 2026-02-10 - Audit checks, decision completeness assessment
- Phase 3 (Decisions): Completed 2026-02-10 - Autonomous decision-making, KB entry creation
- Phase 4 (Completion): Completed 2026-02-10 - Elaboration summary, story move to ready-to-work

**Verdict Evolution:**
- Initial: CONDITIONAL PASS (one medium-severity design decision needed)
- Final: CONDITIONAL PASS (decision resolved in DECISIONS.yaml, story ready for implementation)

**Model/Agent Timeline:**
- Story worker: elab-discovery-worker (Haiku)
- Analysis worker: elab-autonomous-decider (Haiku)
- Completion agent: elab-completion-leader (Haiku)
