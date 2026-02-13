# Future Risks: REPA-018

## Non-MVP Risks

### Risk 1: Session Service Not Used by Other Apps Yet
**Impact (if not addressed post-MVP):**
- Package created but only main-app uses it
- Other apps (dashboard, sets-gallery, etc.) still implement their own auth patterns
- Missed opportunity for code reuse and consistency

**Recommended Timeline:**
- Post-MVP: Audit other apps for auth needs
- If other apps need Cognito auth, migrate them to use `@repo/auth-services` in follow-up stories
- Priority: Medium (depends on whether other apps adopt Cognito)

---

### Risk 2: No Refresh Token Rotation Logic
**Impact (if not addressed post-MVP):**
- Session service only handles ID token sync (sets httpOnly cookie)
- Refresh token rotation and expiry handling is in AuthProvider
- If multiple apps use session service, they each need to implement refresh logic separately

**Recommended Timeline:**
- Post-MVP: Extract refresh token logic to `@repo/auth-hooks` (REPA-012)
- Story idea: "Create useTokenRefresh hook for shared refresh logic"
- Priority: Low (AuthProvider pattern works fine for single app)

---

### Risk 3: No Session Timeout Handling
**Impact (if not addressed post-MVP):**
- Session service doesn't handle automatic session expiry detection
- Apps must implement their own timeout logic
- Inconsistent user experience if different apps handle timeouts differently

**Recommended Timeline:**
- Post-MVP: Add session timeout utilities to `@repo/auth-services`
- Story idea: "Add session timeout detection and auto-logout helper"
- Priority: Low (not required for basic auth flow)

---

### Risk 4: No Built-in Retry Logic for Network Failures
**Impact (if not addressed post-MVP):**
- Network failures during session operations throw immediately
- Apps must implement retry logic themselves
- Poor user experience on flaky networks

**Recommended Timeline:**
- Post-MVP: Add optional retry config to session functions
- Story idea: "Add exponential backoff retry to auth-services"
- Priority: Medium (improves reliability)

---

### Risk 5: No Metrics/Observability
**Impact (if not addressed post-MVP):**
- No visibility into session operation success rates
- Hard to debug auth issues in production
- No tracking of session lifecycle metrics

**Recommended Timeline:**
- Post-MVP: Integrate with observability service (if one exists)
- Add metrics: session create rate, failure rate, avg duration
- Priority: Low (logger provides basic visibility for now)

---

### Risk 6: TypeScript "any" Type in Error Handling
**Impact (if not addressed post-MVP):**
- Current sessionService uses `any` in catch blocks (per CLAUDE.md: `noImplicitAny: false`)
- Zod migration is opportunity to strengthen error types
- If not addressed, error handling remains loosely typed

**Recommended Timeline:**
- During MVP: Convert error types to Zod schemas for stronger validation
- Already planned in AC-2 (Zod conversion includes SessionErrorSchema)
- Priority: High (part of MVP Zod conversion)

---

### Risk 7: No Multi-Region Support
**Impact (if not addressed post-MVP):**
- Session service uses single `VITE_SERVERLESS_API_BASE_URL`
- If backend deploys to multiple regions, no region-aware routing
- Latency issues for users far from single region

**Recommended Timeline:**
- Post-MVP: Add region detection and multi-region base URL config
- Depends on backend multi-region strategy
- Priority: Low (single-region sufficient for MVP)

---

## Scope Tightening Suggestions

### Suggestion 1: Defer Integration Tests to UAT Phase
**Rationale:**
- Integration tests require real backend (ADR-005) and test Cognito pool (ADR-004)
- Setup overhead may delay story completion
- Existing AuthProvider integration tests already cover session flow end-to-end

**Proposed Scope Reduction:**
- AC-4 (Integration Tests) becomes: "Create integration test stubs with `test.skip()` and setup docs"
- Full integration test validation deferred to UAT phase
- Unit tests provide sufficient coverage (80%+) for package logic

**Trade-off:**
- Lower confidence in real backend behavior
- **Recommendation:** Keep integration tests in MVP if backend setup is trivial, otherwise defer

---

### Suggestion 2: Defer README Usage Examples
**Rationale:**
- AuthProvider is only consumer for MVP
- No external developers need usage docs yet
- API surface is simple (4 functions)

**Proposed Scope Reduction:**
- AC-6 becomes: "Add JSDoc comments to all functions" (inline docs)
- Comprehensive README with usage examples deferred to post-MVP
- Add README only when second app adopts package

**Trade-off:**
- Harder for future developers to discover package
- **Recommendation:** Keep minimal README in MVP (installation + env vars), defer examples

---

### Suggestion 3: Ship Without Backend Environment Variable Fallback
**Rationale:**
- `VITE_SERVERLESS_API_BASE_URL` is required in all environments
- No reasonable default (local vs staging vs prod URLs differ)
- Failing fast on missing env var is safer than guessing

**Proposed Scope:**
- No fallback logic needed
- Throw immediately if env var missing (current behavior)
- Document requirement clearly in README

**Trade-off:**
- None (env var is required anyway)
- **Recommendation:** Keep current behavior (fail fast)

---

## Future Requirements

### Future Requirement 1: Session Persistence Across Tabs
**Description:**
- Current session service doesn't sync session state across browser tabs
- If user signs out in one tab, other tabs still show as authenticated until refresh

**Implementation Ideas:**
- Use BroadcastChannel API to sync auth events
- Or store session state in localStorage and poll/listen for changes
- Or use service worker for cross-tab communication

**Priority:** Medium (nice UX improvement)

---

### Future Requirement 2: Session Debugging Tools
**Description:**
- No built-in tools for debugging session issues
- Hard to inspect httpOnly cookies from frontend

**Implementation Ideas:**
- Add `getSessionDebugInfo()` function (dev mode only) that calls backend debug endpoint
- Show session expiry time, token metadata, cookie flags
- Integrate with browser devtools extension

**Priority:** Low (developer convenience)

---

### Future Requirement 3: Session Pre-warming
**Description:**
- No way to check session status on app load without API call
- Initial render may show unauthenticated briefly before session status loads

**Implementation Ideas:**
- Add optimistic session check based on cookie presence (before API call)
- Use server-side rendering to embed initial session state
- Cache session status with revalidation strategy

**Priority:** Medium (improves perceived performance)

---

### Future Requirement 4: Custom Session Metadata
**Description:**
- Session service only stores backend-controlled session
- No way for frontend to attach custom metadata (e.g., analytics ID, feature flags)

**Implementation Ideas:**
- Add optional metadata parameter to `setAuthSession(idToken, metadata?)`
- Backend stores metadata in session
- Return metadata in `getSessionStatus()`

**Priority:** Low (can be added later without breaking changes)

---

### Future Requirement 5: Granular Session Scopes
**Description:**
- Current session is all-or-nothing (authenticated or not)
- No support for partial auth states (e.g., MFA pending, email unverified)

**Implementation Ideas:**
- Extend SessionResponse Zod schema with `authState` enum: `full | partial | mfa_pending | email_unverified`
- Return scopes array: `['read:profile', 'write:posts']`
- Apps can gate features based on scopes

**Priority:** Medium (depends on auth requirements growth)

---

## Notes

**Risk Management Philosophy:**
- MVP risks focus only on core auth flow blockers
- Future risks tracked for post-MVP iterations
- Session service is intentionally simple (4 functions, ~161 lines)
- Future enhancements should be separate stories to avoid scope creep

**When to Revisit:**
- After REPA-018 completes: Review Future Risks list
- After second app adopts auth-services: Reprioritize based on real usage patterns
- After 3 months: Check if any non-MVP risks became critical

**Story Candidate Ideas:**
- `REPA-018-A`: Add session timeout utilities
- `REPA-018-B`: Add retry logic with exponential backoff
- `REPA-018-C`: Integrate observability metrics
- `REPA-018-D`: Cross-tab session sync with BroadcastChannel
