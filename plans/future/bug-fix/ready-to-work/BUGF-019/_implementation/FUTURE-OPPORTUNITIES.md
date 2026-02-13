# Future Opportunities - BUGF-019

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | RateLimitBanner lacks custom message/title props | Low | Low | Add optional `message` and `title` props to RateLimitBanner schema to support custom messaging for different contexts (upload vs auth). Recommended in BUGF-027 guide section 4.3.1 but not required for MVP. |
| 2 | Password strength indicator debouncing not implemented | Low | Low | AC-4 mentions optional 200ms debounce for real-time updates. Improves performance for long passwords but not blocking. Consider if performance issues observed in UAT. |
| 3 | ResendCodeButton not integrated into ResetPasswordPage | Low | Medium | AC-3 wires up "resend code" button but ResetPasswordPage lines 199-227 show basic implementation without exponential backoff. Story should replace with ResendCodeButton component for consistency. |
| 4 | No visual distinction between temporary vs permanent errors | Low | Low | All errors shown as inline alerts. Rate limit errors (temporary) vs validation errors (permanent) have no visual distinction beyond messaging. Consider using RateLimitBanner for temporary errors, inline Alert for permanent. |
| 5 | SessionStorage keys lack TypeScript constants export | Low | Low | Keys defined inline in each page (e.g., FORGOT_PASSWORD_KEYS). Consider exporting from shared location (e.g., `@repo/auth-utils`) to prevent typos and enable reuse. |
| 6 | Countdown timer update frequency not configurable | Low | Low | Hardcoded 1-second timer tick. Some contexts may prefer slower updates (e.g., 5-second ticks for long cooldowns). Consider making interval configurable via prop. |
| 7 | No analytics tracking for rate limit events | Low | Low | Story tracks navigation events but not rate limit occurrences. Consider adding analytics for rate limit triggers (helps understand abuse patterns, threshold tuning). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Progress bar animation for countdown | Medium | Low | RateLimitBanner includes progress bar (lines 104-122 in guide). Adds visual feedback for cooldown duration. Enhances UX but not required for MVP. |
| 2 | Toast notification on cooldown expiry | Medium | Low | When cooldown expires, show toast notification ("You can now retry") instead of silently re-enabling button. Improves discoverability. |
| 3 | Persistent attempt count across sessions | Medium | High | Current implementation uses sessionStorage (ephemeral). Consider persisting attempt count to localStorage for cross-session tracking. Security trade-off: prevents users from circumventing cooldown by closing tab. Requires careful design to avoid permanent lockout. |
| 4 | Server-side rate limiting for Cognito operations | High | High | Current client-side cooldown is UX feedback only. Backend proxy for Cognito operations would enable server-enforced rate limiting with Retry-After header. Violates ADR-004 (Cognito as Authoritative Auth Service). Consider only if Cognito rate limits prove insufficient. |
| 5 | Configurable exponential backoff formula | Low | Medium | Hardcoded 60s base, 600s max. Some contexts may prefer different progression (e.g., aggressive 30s → 60s → 120s for high-security flows). Consider making base and max configurable via props or environment variables. |
| 6 | Visual countdown in RateLimitBanner banner title | Medium | Low | Currently countdown shown in button text and banner body. Add countdown to banner title (e.g., "Rate Limit Exceeded (2:30 remaining)") for prominence. |
| 7 | Copy to clipboard for verification code | Medium | Low | ResetPasswordPage code input (OTPInput component) could include "paste" button for clipboard access. Improves UX for users switching between email and app. |
| 8 | Resend code success feedback via banner | Medium | Low | AC-3 shows success message but uses inline alert. Consider using success variant of RateLimitBanner for consistency with error feedback. |
| 9 | Password strength recommendations | Low | Medium | PasswordStrengthIndicator shows strength bars but no specific recommendations (e.g., "Add a special character to reach 'Strong'"). Helps users understand how to improve password. |
| 10 | Cooldown state sync across tabs | Medium | High | SessionStorage is per-tab. Users can bypass cooldown by opening new tab. Consider using localStorage + storage event listener to sync cooldown state across tabs. Security enhancement but adds complexity. |
| 11 | Adaptive cooldown based on user behavior | High | High | Current exponential backoff is fixed. Adaptive approach could reduce cooldown for trusted users (e.g., verified email, no prior abuse) or increase for suspicious IPs. Requires backend integration and behavioral analytics. Out of scope for frontend-only story. |
| 12 | Email verification reminder in cooldown message | Low | Low | RateLimitBanner message could include reminder: "Check your email for the verification code while you wait." Helps users make productive use of cooldown time. |
| 13 | Dark mode support for password strength colors | Low | Low | Password strength colors (red, orange, yellow, lime, green) are hardcoded. Should respect theme (light/dark mode) for accessibility. Consider using theme-aware color tokens. |
| 14 | Keyboard shortcut to retry after cooldown | Low | Low | When cooldown expires, allow Enter key to retry instead of requiring click. Improves keyboard navigation UX. |
| 15 | A/B test different cooldown formulas | Medium | High | Exponential backoff formula not validated against user behavior. Consider A/B testing different formulas (linear, quadratic, exponential) to optimize balance between security and UX. Requires analytics integration and backend coordination. |

## Categories

### Edge Cases
- **Gap #3**: ResendCodeButton not integrated (medium effort to replace basic implementation)
- **Gap #4**: No visual distinction for error types (low effort to add RateLimitBanner variant logic)
- **Enhancement #7**: Copy to clipboard for verification code (medium impact on UX)
- **Enhancement #14**: Keyboard shortcut for retry (low effort, improves accessibility)

### UX Polish
- **Enhancement #1**: Progress bar animation (medium impact, low effort)
- **Enhancement #2**: Toast notification on cooldown expiry (medium impact, low effort)
- **Enhancement #6**: Visual countdown in banner title (medium impact, low effort)
- **Enhancement #9**: Password strength recommendations (low impact, medium effort)
- **Enhancement #12**: Email verification reminder (low impact, low effort)

### Performance
- **Gap #2**: Password strength debouncing (low impact, low effort)
- **Gap #6**: Configurable timer update frequency (low impact, low effort)
- **Enhancement #5**: Configurable exponential backoff (low impact, medium effort)

### Observability
- **Gap #7**: Analytics tracking for rate limit events (low impact, low effort - add event tracking)
- **Enhancement #15**: A/B test different cooldown formulas (high effort, requires infrastructure)

### Integrations
- **Enhancement #3**: Persistent attempt count across sessions (medium impact, high effort - localStorage)
- **Enhancement #4**: Server-side rate limiting for Cognito (high impact, high effort - violates ADR-004)
- **Enhancement #10**: Cooldown state sync across tabs (medium impact, high effort - localStorage + events)
- **Enhancement #11**: Adaptive cooldown based on behavior (high impact, high effort - backend integration)

### Code Quality
- **Gap #5**: SessionStorage keys lack TypeScript constants export (low impact, low effort - extract to shared package)
- **Enhancement #13**: Dark mode support for password strength colors (low impact, low effort - theme tokens)

---

## Prioritization Guidance

### High-Value, Low-Effort (Quick Wins)
1. **Enhancement #1**: Progress bar animation - Already implemented in RateLimitBanner, just needs integration
2. **Enhancement #2**: Toast notification on cooldown expiry - Improves discoverability, easy to add
3. **Gap #1**: RateLimitBanner custom message/title props - Recommended in BUGF-027, future-proofs component

### Medium-Value, Medium-Effort (Next Iteration)
4. **Gap #3**: Integrate ResendCodeButton into ResetPasswordPage - Improves consistency, moderate refactor
5. **Enhancement #8**: Resend code success feedback via banner - Consistency with error feedback
6. **Enhancement #6**: Visual countdown in banner title - Prominent feedback, minor template change

### High-Value, High-Effort (Future Backlog)
7. **Enhancement #4**: Server-side rate limiting - Requires ADR review, violates ADR-004
8. **Enhancement #10**: Cooldown state sync across tabs - Security enhancement, complex implementation
9. **Enhancement #11**: Adaptive cooldown - Requires backend, behavioral analytics

### Low Priority (Nice-to-Have)
10. **Gap #2**: Password strength debouncing - Performance optimization, minimal impact
11. **Gap #7**: Analytics tracking - Observability enhancement, not user-facing
12. **Enhancement #9**: Password strength recommendations - Informational, moderate effort
13. **Enhancement #13**: Dark mode support - Accessibility polish, low effort

---

## Related Stories

| Opportunity | Related Story | Notes |
|-------------|---------------|-------|
| Enhancement #4 (Server-side rate limiting) | BUGF-027 | Would require updating implementation guide, ADR-004 review |
| Gap #5 (SessionStorage constants) | BUGF-005 (Shared Auth Hooks) | Could be bundled with auth hook consolidation |
| Enhancement #3 (Persistent attempt count) | BUGF-026 (Auth Token Refresh Security) | Security review overlap - token vs cooldown persistence |
| Enhancement #7 (Copy to clipboard) | BUGF-020 (Accessibility) | Keyboard navigation, WCAG compliance |
| Enhancement #15 (A/B testing) | Future telemetry epic | Requires analytics infrastructure |

---

## Implementation Notes

### For Gap #1 (RateLimitBanner custom props)
```typescript
// Enhanced schema (recommended for next iteration)
export const RateLimitBannerPropsSchema = z.object({
  visible: z.boolean(),
  retryAfterSeconds: z.number(),
  onRetry: z.any(),
  onDismiss: z.any().optional(),
  message: z.string().optional(), // NEW
  title: z.string().optional().default('Rate Limit Exceeded'), // NEW
})
```

**Effort**: ~30 minutes (update schema, update component, update tests)

### For Gap #3 (ResendCodeButton integration)
**Current** (ResetPasswordPage lines 199-227):
```typescript
const handleResendCode = async () => {
  const result = await forgotPassword(watchedEmail)
  // Basic success/error handling, no cooldown
}
```

**Target**:
```typescript
import { ResendCodeButton } from '@/components/Auth/ResendCodeButton'

<ResendCodeButton
  onResend={async () => {
    const result = await forgotPassword(watchedEmail)
    return { success: result.success, error: result.error }
  }}
  onSuccess={() => setResendSuccess(true)}
  onError={(error) => setError(error)}
/>
```

**Effort**: ~1 hour (replace implementation, update tests)

### For Enhancement #2 (Toast notification)
**Implementation Pattern**:
```typescript
useEffect(() => {
  if (cooldownSeconds > 0) return

  // Cooldown just expired
  if (previousCooldown > 0) {
    toast.success('Rate limit expired. You can now retry.')
  }
}, [cooldownSeconds])
```

**Effort**: ~30 minutes (add toast library if not present, add effect, test)

**Dependencies**: Requires toast component (shadcn Sonner or similar)

---

## Summary

Total Opportunities: 22 (7 gaps + 15 enhancements)

**By Impact**:
- High: 3
- Medium: 9
- Low: 10

**By Effort**:
- Low: 12
- Medium: 6
- High: 4

**Quick Wins** (High/Medium Impact, Low Effort): 3 opportunities
**Future Backlog** (High Effort): 4 opportunities
**Low Priority**: 10 opportunities

**Recommendation**: BUGF-019 MVP scope is appropriate. All 22 opportunities are genuine enhancements (not blockers). Prioritize quick wins (#1, #2, Gap #1) for iteration immediately following MVP release. Defer high-effort items (server-side rate limiting, adaptive cooldown, cross-tab sync) until user feedback validates need.
