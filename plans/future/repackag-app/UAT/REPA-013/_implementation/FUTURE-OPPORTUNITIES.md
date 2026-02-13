# Future Opportunities - REPA-013

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | JwtPayload schema optionality | Low | Low | Current Zod conversion example makes `sub`, `exp`, `iat` optional, but `isTokenExpired` (line 75-80) assumes `exp` is present. Consider making these required in schema: `z.object({ sub: z.string(), exp: z.number(), iat: z.number() }).passthrough()`. This provides better type safety. Non-blocking because existing code handles null checks. |
| 2 | Token validation at parse time | Low | Medium | JWT utilities currently decode without validation. Future: Add optional runtime validation using Zod schemas at decode time (e.g., `decodeToken<T>(token: string, schema?: ZodSchema<T>)`). This would catch malformed payloads earlier. Non-blocking - current error handling is sufficient. |
| 3 | Guard composition testing | Low | Low | Current tests cover individual guards and basic composition. Add tests for complex guard composition scenarios (5+ guards, mixed success/failure, performance benchmarks). Non-blocking - basic composition is well-tested. |
| 4 | Import automation | Low | Low | AC-6 requires manual grep + find/replace for imports. Future: Create codemod script to automate import updates for similar migrations. Non-blocking - 3-7 files is manageable manually. |
| 5 | Edge case: Token without 'sub' | Low | Low | `decodeToken` returns typed payload but doesn't validate required fields exist. Future: Add validation layer or document that consumers must check field existence. Non-blocking - production tokens always include standard claims. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Token refresh integration | Medium | High | Route guards detect expired tokens but don't trigger automatic refresh. Future: Integrate with useTokenRefresh hook (REPA-012) to automatically refresh tokens before redirecting. Requires coordination with REPA-012. |
| 2 | Guard telemetry | Low | Medium | Add optional telemetry to route guards for security monitoring (track unauthorized access attempts, expired token frequency). Useful for security audits. Requires telemetry infrastructure. |
| 3 | Guard testing utilities | Medium | Medium | Create test utilities for mocking auth state in route guard tests (e.g., `createMockAuthContext`, `expectRedirect`). Reduces boilerplate in consuming apps. Could be added in follow-up story. |
| 4 | JWT parsing performance | Low | Low | Current implementation uses `atob()` for base64 decoding. For high-frequency parsing, consider caching decoded tokens or using a faster parsing library. Optimization opportunity, not critical. |
| 5 | Type-safe route metadata | Medium | Medium | `ROUTE_METADATA_CONFIG` uses `as const` but could use Zod schema for runtime validation. Future: Create `RouteMetadataSchema` for consistent metadata validation across routes. Nice-to-have for type safety. |
| 6 | Guard composition helpers | Low | Medium | Add helper functions like `requireAny(guards)`, `requireAll(guards)` for more expressive guard composition. Makes guard creation more declarative. Syntactic sugar, not essential. |
| 7 | Custom redirect logic | Low | Medium | Route guards currently only support string redirectTo. Future: Support custom redirect logic (e.g., `redirectTo: (context) => path`). Useful for dynamic redirects based on context. Edge case improvement. |
| 8 | Permission caching | Low | Medium | `getTokenScopes` parses token on every call. Future: Add optional caching layer to avoid repeated parsing. Performance optimization, likely negligible impact. |
| 9 | Guard middleware types | Low | Low | `RouteGuard` type uses `any` for context and location. Future: Make generic `RouteGuard<TContext, TLocation>` for better type safety. Type system improvement, not blocking. |
| 10 | Subpath export documentation | Medium | Low | README should include examples for both root import (`@repo/auth-utils`) and subpath imports (`@repo/auth-utils/jwt`, `@repo/auth-utils/guards`). Helps developers choose appropriate import style. Documentation enhancement. |

## Categories

### Edge Cases
- **GAP-1**: JwtPayload schema optionality refinement
- **GAP-5**: Token validation for missing required fields
- **ENHANCE-4**: JWT parsing performance optimization

### UX Polish
- **ENHANCE-3**: Guard testing utilities for consuming apps
- **ENHANCE-6**: Guard composition helpers (requireAny, requireAll)
- **ENHANCE-10**: Subpath export documentation examples

### Performance
- **ENHANCE-4**: JWT parsing performance (atob caching)
- **ENHANCE-8**: Permission caching for repeated token parsing

### Observability
- **ENHANCE-2**: Guard telemetry for security monitoring
- **GAP-3**: Complex guard composition testing

### Integrations
- **ENHANCE-1**: Token refresh integration with useTokenRefresh (REPA-012 coordination)
- **ENHANCE-2**: Telemetry infrastructure integration

### Type Safety
- **ENHANCE-5**: Type-safe route metadata with Zod schema
- **ENHANCE-9**: Generic RouteGuard types for better type safety

### Developer Experience
- **GAP-4**: Import automation codemod for future migrations
- **ENHANCE-3**: Guard testing utilities
- **ENHANCE-10**: Comprehensive README examples

---

## High-Value Follow-Up Stories

Based on impact and effort analysis, these opportunities warrant dedicated stories:

### Story Candidate: Auth Testing Utilities (ENHANCE-3)
**Value**: Medium impact, Medium effort
**Description**: Create `@repo/auth-utils/testing` with helpers like `createMockAuthContext`, `expectRedirect`, `createMockTokens` to reduce boilerplate in consuming app tests.
**Benefit**: Every app using route guards or JWT utilities will benefit from standardized test helpers.
**Timing**: After REPA-013 is complete and consuming apps have migrated.

### Story Candidate: Token Refresh Integration (ENHANCE-1)
**Value**: Medium impact, High effort
**Description**: Coordinate REPA-012 (auth-hooks) and REPA-013 (auth-utils) to enable automatic token refresh in route guards when tokens are near expiration.
**Benefit**: Better UX - users don't get logged out if refresh is possible.
**Timing**: After both REPA-012 and REPA-013 are complete.
**Note**: Requires design decision on refresh trigger timing (e.g., refresh if token expires in < 5 minutes).

### Story Candidate: Route Metadata Standardization (ENHANCE-5)
**Value**: Medium impact, Medium effort
**Description**: Create Zod schemas for route metadata and integrate with TanStack Router for type-safe route configuration.
**Benefit**: Consistent metadata structure across all routes, runtime validation.
**Timing**: After REPA-013, when route patterns are stabilized.

---

## Notes

**GAP vs ENHANCE**:
- **GAP** = Something missing or incorrect, but non-blocking
- **ENHANCE** = New capability or improvement beyond original scope

**Priority Guidance**:
- **Impact**: How much value does this provide to users/developers?
- **Effort**: How much work is required to implement?
- **High impact + Low/Medium effort** = Strong candidate for follow-up story
- **Low impact + High effort** = Likely not worth pursuing

**Cross-Story Dependencies**:
- ENHANCE-1 (Token Refresh Integration) depends on REPA-012 (auth-hooks)
- ENHANCE-3 (Auth Testing Utilities) should wait until consuming apps migrate to @repo/auth-utils
- ENHANCE-2 (Guard Telemetry) requires telemetry infrastructure (not yet in monorepo)

**Documentation Opportunities**:
Most ENHANCE items (3, 6, 7, 10) are documentation or helper utilities that could be added incrementally based on developer feedback. Consider adding these to a "Community Contributions" backlog if the package is open-sourced.
