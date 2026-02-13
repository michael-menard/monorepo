# Future Opportunities - BUGF-027

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No backend rate limiting documentation for other auth operations | Low | Low | Extend guide to cover sign-in, sign-up, and MFA rate limiting patterns when those flows require UX improvements |
| 2 | No monitoring/alerting guidance for rate limit abuse patterns | Low | Medium | Add section on CloudWatch metrics for tracking Cognito LimitExceededException frequency and patterns |
| 3 | No fallback behavior documented for sessionStorage failure | Low | Low | Add guidance for handling sessionStorage quota exceeded or disabled scenarios |
| 4 | No guidance on rate limiting for "Resend code" functionality beyond password reset | Low | Low | Document pattern for email verification code resend rate limiting (similar to ResendCodeButton) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Interactive code examples could be runnable | Medium | Medium | Consider creating a StackBlitz or CodeSandbox demo with working rate limit countdown timer |
| 2 | Diagram visual for cooldown calculation algorithm | Medium | Low | Add mermaid or ASCII diagram showing exponential backoff progression (60s → 120s → 240s → 480s → 600s) |
| 3 | Comparison table: Cognito vs backend rate limiting | Medium | Low | Add side-by-side table comparing Cognito-managed (forgotPassword) vs backend middleware (API endpoints) rate limiting |
| 4 | Progressive enhancement for countdown timer | Low | Medium | Document how to enhance countdown with client-side prediction when Cognito doesn't provide Retry-After header |
| 5 | Internationalization considerations for countdown messages | Low | Medium | Add guidance on i18n-friendly countdown message formats and pluralization |
| 6 | Dark mode considerations for RateLimitBanner styling | Low | Low | Document Tailwind dark mode classes for RateLimitBanner when moved to app-component-library |
| 7 | Animation guidance for prefers-reduced-motion | Low | Low | Expand on accessibility section with specific Framer Motion configuration examples |
| 8 | Rate limit banner placement patterns | Medium | Low | Document where RateLimitBanner should be positioned (above form vs below vs modal) for different use cases |

## Categories

### Documentation Polish
- Interactive examples (#1)
- Visual diagrams (#2)
- Comparison tables (#3)

### Accessibility Enhancements
- Animation guidance (#7)
- Internationalization (#5)

### Observability
- Monitoring/alerting for abuse patterns (#2 in Gaps)

### Edge Cases
- sessionStorage failure handling (#3 in Gaps)
- Dark mode styling (#6)

### Future Scope Expansion
- Other auth operations rate limiting (#1 in Gaps, #4 in Gaps)
- Rate limit banner placement patterns (#8)
- Progressive enhancement for countdown (#4)
