# Future Risks: BUGF-006

## Non-MVP Risks

### Risk 1: Test File Console Usage
**Impact (if not addressed post-MVP)**:
- 6 test files still use console for test output
- Inconsistency between source and test file logging
- ESLint warnings visible in test files (though allowed by config)

**Recommended timeline**:
- Phase 3 or later (after main source files are clean)
- Consider if test console output should remain for test runner visibility
- May be intentional - test files have different logging needs

**Scope tightening suggestion**:
- Keep test files out of this story (already planned)
- Create follow-up story if test file logging needs standardization

### Risk 2: MSW Handler Debug Logging
**Impact (if not addressed post-MVP)**:
- MSW mock handlers still use console.log for debugging
- Minor inconsistency in development tooling
- Not visible in production (MSW is dev-only)

**Recommended timeline**:
- Low priority - MSW is development infrastructure
- Decision needed: is console appropriate for mock debugging?
- May be intentional for easier MSW debugging

**Scope tightening suggestion**:
- OUT OF SCOPE for this story
- Document as intentional exception if keeping console
- Or create minor follow-up to standardize MSW logging

### Risk 3: CI Workflow Console Usage
**Impact (if not addressed post-MVP)**:
- GitHub Actions workflows use console for CI output
- Not a code quality issue - this is correct for CI/CD
- No actual impact

**Recommended timeline**:
- N/A - do not modify CI workflows
- Console is appropriate for GitHub Actions output

**Scope tightening suggestion**:
- Explicitly OUT OF SCOPE
- Document in story non-goals

### Risk 4: Logger Configuration Optimization
**Impact (if not addressed post-MVP)**:
- Logger works but may not be optimized for all environments
- Log levels might need per-environment tuning
- Log transport configuration may need refinement

**Recommended timeline**:
- Post-MVP observability improvements
- Monitor logger output in production after deployment
- Tune based on actual usage patterns

**Scope tightening suggestion**:
- OUT OF SCOPE for this story
- This story only replaces console with logger
- Future story: "Optimize logger configuration per environment"

## Scope Tightening Suggestions

### Clarification 1: MSW Handler Decision
**Ambiguity**: Story seed suggests MSW handler decision is "pending"

**Recommendation**:
- Make explicit decision in story:
  - Option A: Keep console for MSW handlers (document as dev tooling exception)
  - Option B: Replace with logger for full consistency
- Suggested: Option A (keep console for MSW debugging)

**Rationale**:
- MSW handlers are development infrastructure, not application code
- Console output may be clearer for mock debugging
- Aligns with test file exclusion principle

### Clarification 2: Backend File Exclusion
**Current scope**: "Do NOT modify backend files"

**Recommendation**:
- Explicitly list backend paths to exclude in implementation
- Backend console usage is allowed per ESLint config line 269
- No action needed, just document clearly

**Scope statement**:
- "Backend files in `apps/api/**` are excluded (console allowed per ESLint config)"

### Clarification 3: Post-Implementation Verification
**Add to acceptance criteria**:
- Verify logger output is readable and useful in development
- Ensure no developer workflow disruption
- Confirm log messages still appear in browser console during dev

**Rationale**:
- Logger should be transparent to developers
- Dev experience should not degrade
- Console readability is important for debugging

## Future Requirements

### Nice-to-Have 1: Logger Output Formatting
- Investigate if logger output formatting can be customized per environment
- Production: minimal JSON logs
- Development: human-readable formatted logs
- Not blocking MVP - current logger format is acceptable

### Nice-to-Have 2: Log Aggregation
- Future: send logs to centralized logging service (e.g., Datadog, CloudWatch)
- Current: logs to browser console (sufficient for MVP)
- Requires infrastructure work beyond this story

### Nice-to-Have 3: Test File Logging Standardization
- Future story: evaluate if test files should use logger or keep console
- Decision may depend on test runner output requirements
- Not urgent - test files work fine with console

### Nice-to-Have 4: ESLint Rule Enforcement
- Consider upgrading no-console from 'warn' to 'error' after cleanup
- Would prevent future console usage in source files
- Requires team discussion and buy-in

## Polish and Edge Case Handling

### Polish 1: Developer Documentation
**Post-MVP enhancement**:
- Add logger usage examples to developer docs
- Document when to use each log level (info, warn, error, debug)
- Provide troubleshooting guide for logger issues

### Polish 2: Logger API Examples
**Post-MVP enhancement**:
- Create code snippets for common logging patterns
- Document how to log structured data
- Show how to include error stack traces

### Polish 3: Performance Monitoring
**Post-MVP enhancement**:
- Monitor logger performance impact (should be negligible)
- Measure bundle size change after logger adoption
- Verify no console polyfill issues in older browsers

## Summary

This story has **zero blocking risks** and is highly implementable as specified. Future risks are minor and relate to:
1. Consistent logging across test files (defer to future story)
2. MSW handler decision (recommend explicit choice in story)
3. Logger configuration optimization (post-MVP observability work)

All future risks can be addressed post-MVP without impacting core functionality.
