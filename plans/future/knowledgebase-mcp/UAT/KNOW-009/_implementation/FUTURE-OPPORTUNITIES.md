# Future Opportunities - KNOW-009

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Role hierarchy not supported (e.g., pm inheriting dev permissions) | Low | Medium | Defer - hardcoded matrix is simpler and sufficient for current use case. If role complexity grows, consider implementing role hierarchy in KNOW-024 or later. |
| 2 | Per-entry access control not supported (authorization is tool-level only) | Low | High | Defer - tool-level authorization is sufficient for current security model. Per-entry ACLs would require significant schema and logic changes. Consider only if multi-tenancy is required. |
| 3 | Role changes mid-session not handled | Low | Low | Document as limitation. Current model assumes role is fixed per MCP server instance. If required, future story could add per-request role context from MCP protocol. |
| 4 | Dynamic role permissions not supported (roles hardcoded in matrix) | Low | Medium | Defer - hardcoded matrix provides auditability and simplicity. If dynamic permissions needed, consider configuration-based approach in future story. |
| 5 | No audit logging for authorization failures | Medium | Low | **Already planned in KNOW-018** - Authorization failures will be logged by audit system. Current story logs denials at debug level; full audit trail deferred to KNOW-018. |
| 6 | No rate limiting for authorization failures | Low | Medium | **Already planned in KNOW-010** - Rate limiting will add per-role quotas and protection against brute force. Out of scope for authorization logic. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Authorization decision caching | Medium | Medium | **Deferred to KNOW-021** - Result caching story will implement role-aware caching. Authorization overhead target is <1ms, so caching may not be needed unless performance testing reveals issues. |
| 2 | Authorization metrics/monitoring | Medium | Low | Add CloudWatch metrics for authorization denials by role and tool. Enables operational visibility into authorization patterns and potential security incidents. Consider after KNOW-016 (monitoring) is complete. |
| 3 | Role management UI | Low | High | **Out of scope for local MCP server** - Roles are assigned via environment variable per instance. UI would only be valuable in multi-user/multi-instance deployment model. Defer until production deployment architecture is defined. |
| 4 | Authorization decision audit trail | Medium | Low | Beyond KNOW-018 scope - Consider adding structured audit events for all authorization checks (allowed and denied) with correlation IDs for forensic analysis. Useful for security compliance. |
| 5 | Multi-instance per-request role context | Low | Medium | Current design assumes one MCP server instance per agent session. If deployment model changes to support multiple agents per instance, would need to extract role from MCP request context instead of environment variable. Architecture change required. |
| 6 | Authorization bypass detection | Medium | Medium | Add integration test or static analysis to verify ALL tool handlers call checkAccess() before business logic. Prevents accidental authorization bypass during future code changes. Consider as code quality improvement. |
| 7 | Role validation middleware | Low | Low | Instead of role validation in each handler, add middleware/decorator to enforce authorization check runs first. Reduces duplication and prevents bypasses. Consider as refactoring opportunity post-implementation. |

## Categories

### Edge Cases
- **Invalid role handling**: Already covered in AC8 (validation error with fail-safe default to 'all')
- **Missing role handling**: Already covered in AC9 (warning log with fail-safe default to 'all')
- **Case sensitivity**: Already covered in AC (case-insensitive normalization)
- **Concurrent access**: Already covered in AC11 (thread-safety test with 10+ parallel calls)

### UX Polish
- **Error message clarity**: Already covered in AC7 (sanitized, actionable error messages)
- **Developer experience**: Environment variable approach is simple and well-documented

### Performance
- **Authorization overhead**: Already covered in AC10 (performance benchmark <1ms p95)
- **Caching**: Deferred to KNOW-021 (result caching with role awareness)

### Observability
- **Authorization logging**: Covered at debug level in current story; full audit trail in KNOW-018
- **Authorization metrics**: Enhancement opportunity #2 above

### Integrations
- **Rate limiting integration**: Planned in KNOW-010 (per-role quotas)
- **Audit logging integration**: Planned in KNOW-018 (comprehensive audit trails)
- **Result caching integration**: Planned in KNOW-021 (role-aware cache invalidation)

### Security
- **Multi-factor authorization**: Out of scope - current model is single-factor (role-based)
- **Time-based access control**: Out of scope - roles are static, not time-limited
- **IP-based restrictions**: Out of scope - MCP server is local, not network-accessible

## Notes

1. **Well-scoped story**: KNOW-009 has clear boundaries with explicit non-goals. Most future opportunities are already planned in follow-up stories (KNOW-010, KNOW-018, KNOW-021).

2. **Security-first approach**: Story prioritizes fail-safe defaults (missing/invalid role → 'all' role blocks admin tools), error sanitization (no information leakage), and comprehensive testing.

3. **Integration readiness**: Authorization design is compatible with planned follow-up stories (rate limiting, audit logging, result caching).

4. **Performance-conscious**: <1ms overhead target ensures authorization doesn't impact search performance. Caching can be added later if needed.

5. **Production readiness**: Story addresses SEC-001 security finding from epic elaboration. Implements P0 requirement before production deployment.
