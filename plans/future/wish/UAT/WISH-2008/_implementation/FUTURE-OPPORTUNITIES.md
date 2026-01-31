# Future Opportunities - WISH-2008

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

**Note**: Gaps #3, #4, and #5 from original analysis were incorporated into story as AC21, AC22, and AC23 respectively during QA elaboration.

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Audit logging for unauthorized access (AC 14) is warn-level but could be structured CloudWatch metric for dashboard | Low | Low | Create CloudWatch custom metric for 403/404 events to enable alerting and trend analysis (Phase 5) |
| 2 | Integration tests verify authorization logic but no load testing for concurrent cross-user access attempts | Low | Medium | Add JMeter/k6 load tests simulating 1000 concurrent users attempting cross-user access (Phase 5) |
| ~~3~~ | ~~Story assumes single-user ownership model but wishlist_items schema has createdBy/updatedBy audit fields that aren't used for authorization~~ | ~~Low~~ | ~~Low~~ | **INCORPORATED AS AC21** - Document that createdBy/updatedBy are for audit trail only, not authorization decisions |
| ~~4~~ | ~~AC 7-8 test expired/invalid JWT tokens but don't test malformed Authorization headers (e.g., missing "Bearer" prefix, extra whitespace)~~ | ~~Low~~ | ~~Low~~ | **INCORPORATED AS AC22** - Add 2 edge case tests for malformed headers to AC 17 unit test suite |
| ~~5~~ | ~~AC 13 verifies S3 path includes userId but doesn't verify presigned URL expiration (15-minute TTL per AC)~~ | ~~Medium~~ | ~~Low~~ | **INCORPORATED AS AC23** - Add integration test verifying presigned URL returns 403 after expiration window |

## Enhancement Opportunities

**Note**: Enhancement #1 from original analysis was incorporated into story as AC24 during QA elaboration.

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| ~~1~~ | ~~Rate limiting for repeated authorization failures (brute-force detection)~~ | ~~Medium~~ | ~~Medium~~ | **INCORPORATED AS AC24** - Implement rate limiting middleware for 401/403 responses (10 failures per 5 minutes per IP) |
| 2 | Authorization audit log viewer UI for security team | Low | High | Create admin dashboard showing unauthorized access attempts with filtering by userId, itemId, endpoint, date range - defer to Phase 5 |
| 3 | CloudWatch alarms for spike in authorization failures | Medium | Low | Create alarm triggering when 403/404 count exceeds 100/hour - defer to Phase 5 monitoring story |
| 4 | Historical audit log retention policy and archiving | Medium | Medium | Define retention policy (e.g., 90 days hot, 1 year archive) and implement S3 archiving for CloudWatch logs - defer to Phase 5 |
| 5 | Penetration testing for authorization bypass attempts | High | High | Engage security firm for penetration testing before production launch - defer to pre-production phase |
| 6 | JWT token refresh mechanism (long-lived sessions) | Medium | Medium | Implement refresh token flow for users to avoid re-authentication every hour - defer to Phase 4 auth improvements |
| 7 | Multi-factor authentication (MFA) requirement for sensitive operations | High | High | Require MFA step-up for delete operations or bulk actions - defer to Phase 4 security enhancements |
| 8 | Authorization policy as code (OPA/Cedar) for complex RBAC rules | Low | High | Replace hard-coded authorization logic with declarative policy engine - defer to Phase 6 (future-proofing) |
| 9 | IP address logging and geolocation tracking for unauthorized access attempts | Medium | Medium | Log IP address and country for 403/404 events to detect suspicious access patterns - defer to Phase 5 |
| 10 | S3 bucket versioning for accidental image deletion recovery | Medium | Low | Enable S3 versioning on wishlist bucket to allow recovery of accidentally deleted images - defer to infrastructure story |

## Categories

### Edge Cases
- ~~Malformed Authorization headers (Finding #4)~~ - **INCORPORATED AS AC22**
- ~~Presigned URL expiration testing (Finding #5)~~ - **INCORPORATED AS AC23**
- Concurrent cross-user access load testing (Finding #2)

### UX Polish
- Authorization audit log viewer UI (Enhancement #2)
- CloudWatch dashboards for authorization metrics (Enhancement #3)

### Performance
- ~~Rate limiting for brute-force detection (Enhancement #1)~~ - **INCORPORATED AS AC24**

### Observability
- CloudWatch custom metrics for 403/404 events (Finding #1)
- CloudWatch alarms for authorization failures (Enhancement #3)
- IP address and geolocation logging (Enhancement #9)

### Integrations
- Penetration testing engagement (Enhancement #5)
- JWT refresh token flow (Enhancement #6)
- Authorization policy as code (OPA/Cedar) (Enhancement #8)

### Security Enhancements
- Multi-factor authentication for sensitive operations (Enhancement #7)
- Historical audit log retention and archiving (Enhancement #4)
- S3 bucket versioning (Enhancement #10)

---

## Notes

**Story Character:**
WISH-2008 is a **verification and hardening story** focused on confirming existing authorization implementation rather than building new features. The story was enhanced during QA elaboration with 4 additional acceptance criteria (AC21-24) addressing gaps and enhancements initially identified as future work. The remaining gaps and enhancements above are primarily observability, monitoring, and defense-in-depth improvements that add value but aren't required for MVP launch.

**Incorporated Into Story (AC21-24):**
- AC21: Audit trail field documentation (originally Gap #3)
- AC22: Malformed Authorization header testing (originally Gap #4)
- AC23: Presigned URL expiration testing (originally Gap #5)
- AC24: Rate limiting for authorization failures (originally Enhancement #1)

**Recommended Sequencing:**
1. **Phase 3 (MVP)**: Complete WISH-2008 as specified (verification + docs + AC21-24)
2. **Phase 4 (Post-MVP)**: JWT refresh (Enhancement #6)
3. **Phase 5 (Monitoring)**: CloudWatch metrics/alarms (Finding #1, Enhancement #3), audit log viewer (Enhancement #2), retention policy (Enhancement #4), IP geolocation (Enhancement #9)
4. **Phase 6 (Pre-Production)**: Penetration testing (Enhancement #5), MFA (Enhancement #7), load testing (Finding #2)
5. **Future**: Authorization policy as code (Enhancement #8), S3 versioning (Enhancement #10)

**Key Insight:**
The existing authorization implementation appears solid based on code review. The story's primary value is in creating a **test safety net** and **security documentation** that will catch regressions and guide future developers. The addition of AC21-24 during elaboration brings important security hardening (rate limiting) and edge case coverage into MVP scope. The remaining future opportunities focus on **operational excellence** (monitoring, alerting, incident response) rather than fixing fundamental security gaps.
