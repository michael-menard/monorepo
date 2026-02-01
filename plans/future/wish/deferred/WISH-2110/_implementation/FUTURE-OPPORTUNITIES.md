# Future Opportunities - WISH-2110

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Error message length validation | Low | Low | Add automated tests to ensure all error messages are under 60 characters (mobile-friendly). Currently documented as guideline but not enforced. |
| 2 | Inconsistent error message patterns | Low | Low | Some schemas use "Title is required" while others might use "Field is required" - consider standardizing pattern (e.g., always include field name vs. use generic "required"). |
| 3 | Missing accessibility guidance | Medium | Low | Story mentions "screen reader clarity" (line 32) but doesn't specify ARIA best practices for error announcements. Future: add guidance on `aria-describedby` and live regions. |
| 4 | No error message style guide | Low | Medium | Story doesn't provide writing guidelines (tone, voice, punctuation). Future: create error message style guide to ensure consistency across all features. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Dynamic enum value listing | Medium | Medium | Instead of hardcoding "Priority must be low, medium, or high", generate message from enum values automatically. Example: Use Zod's `errorMap` to access enum values and build message dynamically. |
| 2 | Context-aware error messages | Medium | High | Error messages could include current value for better debugging. Example: "Title must be 200 characters or less (currently 245)". Requires custom Zod error map with value access. |
| 3 | Internationalization framework | High | High | Deferred as Non-goal (line 42), but high impact for global users. Future: integrate i18n library (e.g., `react-i18next`) with Zod error messages. Zod supports custom error maps that can call translation functions. |
| 4 | Field-level error message testing | Medium | Low | Current test plan validates error messages appear, but doesn't test that they appear on the CORRECT field in multi-field validation failures. Future: add tests for multi-field validation with field-specific assertion. |
| 5 | Error message analytics | Low | Medium | Track which validation errors users encounter most frequently to identify UX friction points. Future: add telemetry to form validation failures. |
| 6 | Suggested corrections | High | High | Advanced error messages could suggest fixes. Example: "Priority must be low, medium, or high. Did you mean 'medium'?" (for typos). Requires fuzzy matching logic. |
| 7 | Batch validation feedback | Medium | Medium | When multiple fields fail validation, provide summary message like "3 fields need attention" before individual messages. Improves cognitive load. |
| 8 | Error message preview tool | Low | Medium | Developer tool to preview all possible error messages for a schema. Helps ensure consistency during development. Could be CLI command or Storybook integration. |
| 9 | Localized number formatting | Medium | High | Price/pieceCount error messages use English number formats. Future: format numbers based on user locale (e.g., "1.000,50" vs "1,000.50"). |
| 10 | Smart URL validation messages | Low | Low | Current URL validation says "Invalid URL format". Future: detect common mistakes (missing protocol, spaces) and provide specific guidance. |

## Categories

### Edge Cases
- **Gap #1**: Error message length validation
- **Gap #2**: Inconsistent error message patterns
- **Enhancement #4**: Field-level error message testing
- **Enhancement #10**: Smart URL validation messages

### UX Polish
- **Enhancement #2**: Context-aware error messages (show current value)
- **Enhancement #6**: Suggested corrections for typos
- **Enhancement #7**: Batch validation feedback summary
- **Enhancement #8**: Error message preview tool

### Accessibility
- **Gap #3**: Missing accessibility guidance for screen readers
- **Enhancement #7**: Batch validation feedback (cognitive load reduction)

### Performance
- No performance opportunities identified (error message customization is negligible overhead)

### Observability
- **Enhancement #5**: Error message analytics to track validation failures

### Integrations
- **Enhancement #3**: Internationalization framework integration
- **Enhancement #9**: Localized number formatting

### Developer Experience
- **Gap #4**: Error message style guide
- **Enhancement #1**: Dynamic enum value listing
- **Enhancement #8**: Error message preview tool

---

## Priority Recommendations

### Quick Wins (Low Effort, Medium+ Impact)
1. **Gap #3**: Add accessibility guidance to story/docs (1-2 hours)
2. **Enhancement #1**: Dynamic enum value listing (use Zod helpers, 2-4 hours)
3. **Enhancement #4**: Field-level error testing (add 5-10 tests, 2-3 hours)

### High Impact (Worth Planning)
1. **Enhancement #3**: i18n framework integration (critical for global launch)
2. **Enhancement #6**: Suggested corrections (significant UX improvement for typos)

### Future-Proofing (Address Before Scale)
1. **Gap #4**: Error message style guide (prevents inconsistency debt)
2. **Enhancement #5**: Error message analytics (informs UX improvements)

---

## Notes

- This story is a **foundation for user-facing validation UX**. Many opportunities above build on this foundation.
- The decision to hardcode English messages (Non-goal: i18n) is appropriate for MVP but will require refactoring for international markets.
- Error message quality directly impacts form completion rates - consider prioritizing UX enhancements (context-aware messages, suggestions) in next iteration.
- Accessibility gaps (#3) should be addressed BEFORE frontend integration testing (AC10) to ensure screen reader testing is comprehensive.
