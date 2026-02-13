# Future Opportunities - BUGF-026

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Token expiration buffer (5 min) not configurable per environment | Low | Low | Make tokenExpirationBuffer environment-configurable for production vs. development (e.g., 5 min prod, 1 min dev for faster testing) |
| 2 | Circuit breaker threshold (3 failures) is hardcoded | Low | Low | Make circuit breaker threshold configurable per CognitoTokenManagerConfig for different failure tolerance profiles |
| 3 | No explicit documentation of Hub.listen race condition mitigation | Low | Medium | Document how concurrent Hub.listen events are handled and what guarantees are provided for event ordering |
| 4 | Backend session sync error handling could be more granular | Medium | Medium | Distinguish between recoverable errors (network timeout) vs. unrecoverable errors (invalid token) in refreshAuthSession for smarter retry strategies |
| 5 | No monitoring/alerting on circuit breaker opens | Medium | Medium | Add observability for when circuit breaker opens in production to detect widespread auth issues early |
| 6 | Token metrics tracking not exposed to UI/dashboard | Low | Medium | Consider exposing getAuthMetrics() data to admin dashboard for debugging auth issues |
| 7 | No explicit session replay attack protection documented | Medium | High | Security review should document session replay attack surface and mitigations (e.g., token binding, device fingerprinting) |
| 8 | Refresh token rotation strategy not documented | Medium | Medium | AWS Cognito supports refresh token rotation - document whether this is enabled and how it affects token lifecycle |
| 9 | No explicit documentation of CSRF protection for session sync endpoints | High | Low | Security review should confirm CSRF protection for POST /auth/session, POST /auth/refresh, POST /auth/logout endpoints (likely handled by httpOnly cookies + SameSite) |
| 10 | Edge case: Network failure during token refresh in progress | Low | Medium | Document expected behavior when network fails while refreshPromise is pending - does retry logic handle this? |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Automated security testing in CI/CD | High | High | Add SAST tools (Snyk, Semgrep) to CI pipeline to catch auth vulnerabilities in code review stage |
| 2 | Security testing framework for token refresh flows | Medium | High | Create integration test suite specifically for security scenarios: token expiry races, concurrent refresh attempts, circuit breaker behavior under attack |
| 3 | Token refresh observability dashboard | Medium | Medium | Build admin dashboard showing token refresh metrics (success rate, circuit breaker status, average refresh time) for production monitoring |
| 4 | Security incident response playbook | Medium | Medium | Create runbook for handling auth security incidents: token leak, session hijacking, circuit breaker mass failure |
| 5 | Proactive token refresh optimization | Low | High | Implement predictive token refresh based on user activity patterns to reduce mid-request auth failures |
| 6 | Token refresh simulation testing | Medium | Medium | Build test harness to simulate various token refresh failure modes for QA validation |
| 7 | Auth hook contract Zod schema | High | Low | Define auth hook contract as Zod schemas (not just TypeScript interfaces) for runtime validation and type safety per CLAUDE.md guidelines |
| 8 | Security review automation | Medium | High | Create automated security checklist tool that validates new auth code against security review findings |
| 9 | Token lifecycle visualization | Low | Medium | Create architecture diagram showing complete token lifecycle from sign-in through refresh to expiry for documentation |
| 10 | Cross-tab session sync documentation | Medium | Low | Document how auth state synchronizes across browser tabs (currently via Hub.listen broadcast) and edge cases (e.g., sign-out in one tab) |

## Categories

### Edge Cases
- Finding #10 (Gaps): Network failure during token refresh
- Finding #3 (Gaps): Hub.listen race condition documentation

### Security Hardening
- Finding #7 (Gaps): Session replay attack protection
- Finding #9 (Gaps): CSRF protection documentation
- Opportunity #1: Automated SAST in CI/CD
- Opportunity #2: Security testing framework
- Opportunity #4: Security incident response playbook

### Performance
- Opportunity #5: Proactive token refresh optimization
- Finding #1 (Gaps): Configurable expiration buffer

### Observability
- Finding #5 (Gaps): Circuit breaker monitoring
- Finding #6 (Gaps): Token metrics UI exposure
- Opportunity #3: Token refresh observability dashboard
- Opportunity #9: Token lifecycle visualization

### Code Quality
- Opportunity #7: Auth hook contract Zod schemas (per CLAUDE.md guidelines)
- Finding #8 (Gaps): Refresh token rotation documentation

### Testing
- Opportunity #6: Token refresh simulation testing
- Opportunity #8: Security review automation
- Finding #4 (Gaps): Granular error handling

### Documentation
- Finding #3 (Gaps): Race condition documentation
- Finding #8 (Gaps): Refresh token rotation strategy
- Opportunity #10: Cross-tab session sync documentation

---

## Notes

**High-Priority Future Work:**

1. **Opportunity #7** (Auth hook contract Zod schemas): BUGF-005 implementation SHOULD use Zod schemas for auth hook contract per CLAUDE.md "Zod-First Types" requirement. This is a code quality requirement that should be part of BUGF-005 implementation, not BUGF-026 documentation.

2. **Finding #9** (CSRF protection): Security review should confirm CSRF protection exists for session sync endpoints. This is critical for production security but likely already handled by httpOnly cookies with SameSite=Strict/Lax attribute.

3. **Opportunity #1** (SAST in CI/CD): Adding automated security scanning would catch auth vulnerabilities before they reach production. This is separate from BUGF-026 but would be valuable Phase 4 work.

**Dependency on BUGF-005:**

Several findings relate to auth hook consolidation (BUGF-005):
- Opportunity #7: Zod schemas for auth hook contract
- Opportunity #10: Cross-tab session sync documentation
- Finding #4: Granular error handling

These should be considered during BUGF-005 implementation using the security guidance from BUGF-026's SECURITY-REVIEW.md deliverable.
