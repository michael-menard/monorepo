# Future Opportunities - REPA-0520

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No TypeScript type exports for SessionProvider props | Low | Low | Story documents Zod schemas but doesn't explicitly require exporting the inferred types. Consider adding explicit type exports to package index for better developer experience. |
| 2 | No error handling for invalid auth prop combinations | Low | Low | Story mentions "Invalid auth props (e.g., isAuthenticated=true but no userId) handled gracefully" in test plan but doesn't specify how. Consider adding Zod refinement to enforce: if isAuthenticated=true, userId must be provided. |
| 3 | No logging for auth state changes | Low | Low | useUploaderSession may log session state, but SessionProvider doesn't log when auth props change (e.g., user logs in/out mid-session). Could add logger calls for observability. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Storybook documentation deferred | Medium | Medium | Story explicitly defers Storybook docs. Consider adding interactive Storybook stories showing both auth modes (authenticated vs anonymous) for better developer onboarding. |
| 2 | Session recovery UI polish | Low | Medium | Story focuses on basic session management but doesn't address UX for session recovery (e.g., loading indicators, error states when session restore fails). Current implementation may handle this via useUploaderSession, but explicit AC would clarify. |
| 3 | Multi-route session coordination | Low | High | Current design uses `route` prop as session key. Future enhancement: coordinate sessions across multiple routes (e.g., user starts upload on /instructions/new, navigates to /sets/new, then back - should they see the same session state?). Out of scope for MVP. |
| 4 | Session analytics | Low | Medium | Track session lifecycle events (created, restored, expired, abandoned) for product analytics. Would require integration with analytics package (not in current scope). |
| 5 | Session persistence configuration | Low | Low | Hard-coded to use useUploaderSession's localStorage strategy. Future: make storage strategy configurable (localStorage vs sessionStorage vs in-memory). |

## Categories

### Edge Cases
- Gap #2: Invalid auth prop combinations
- Enhancement #3: Multi-route session coordination
- Enhancement #5: Session persistence configuration

### UX Polish
- Enhancement #1: Storybook documentation
- Enhancement #2: Session recovery UI polish
- Enhancement #4: Session analytics

### Performance
None identified - SessionProvider is a lightweight context provider with minimal performance impact.

### Observability
- Gap #3: Logging for auth state changes
- Enhancement #4: Session analytics

### Integrations
- Enhancement #4: Session analytics (future analytics package integration)

---

## Notes

- Most opportunities are genuine enhancements, not gaps in the story
- Story is appropriately scoped for MVP (3 SP, single component migration)
- Auth injection pattern is well-defined and testable
- No critical gaps that would block implementation or MVP launch
