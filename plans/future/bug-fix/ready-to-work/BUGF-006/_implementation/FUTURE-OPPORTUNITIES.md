# Future Opportunities - BUGF-006

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | app-sets-gallery and app-wishlist-gallery not included | Low | Low (1-2 hours) | Audit remaining frontend apps for console usage; app-sets-gallery and app-wishlist-gallery were not mentioned in story scope but may have console statements |
| 2 | Test file console usage not audited | Low | Medium | Review test files to identify patterns where logger might be more appropriate than console (test lifecycle logging, custom test reporters) |
| 3 | No automated prevention mechanism | Medium | Medium | Add pre-commit hook or ESLint auto-fix to prevent new console statements in source files (current ESLint only warns) |
| 4 | Logger context/correlation not utilized | Low | Medium | Consider adding context objects to logger calls for better debugging (e.g., `logger.info('Action completed', { userId, actionType })`) |
| 5 | Error objects may lose stack traces | Low | Low | Verify error logging includes full stack traces; some console.error calls pass error as second arg - ensure logger.error preserves this |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Structured logging not fully leveraged | Medium | Medium | Replace simple string messages with structured context objects: `logger.info('Album action', { action: 'add', albumIds })` instead of `logger.info('Add to albums:', albumIds)` |
| 2 | Log levels could be more semantic | Low | Low | Review TODO placeholder logs - some may be better as `logger.debug()` for development-only output vs `logger.info()` for user actions |
| 3 | MSW handler exception not enforced | Low | Low | Add ESLint comment to MSW handlers documenting intentional console usage: `/* eslint-disable no-console -- MSW dev tooling exception */` |
| 4 | No log aggregation or filtering strategy | Medium | High | Define log level strategy per environment (dev: debug+, staging: info+, prod: warn+); currently logger outputs everything |
| 5 | Performance logging not utilized | Low | Medium | Consider using `PerformanceLogger` from @repo/logger for timing TODO placeholder operations (when implemented) |
| 6 | Logger configuration not customized per app | Low | Medium | Each app uses default logger config; could customize with app-specific context (e.g., `logger = createLogger({ context: 'inspiration-gallery' })`) |

## Categories

### Edge Cases
- **Gap #2**: Test file console usage not audited - some tests may benefit from structured logging but not MVP-critical
- **Gap #5**: Error object handling in logger.error - verify stack trace preservation

### UX Polish
- **Enhancement #2**: More semantic log levels - better developer experience when debugging
- **Enhancement #4**: Environment-specific log filtering - cleaner production logs

### Performance
- **Enhancement #5**: Use PerformanceLogger for timing operations - helpful for diagnosing slow features

### Observability
- **Enhancement #1**: Structured logging with context objects - better searchability in log aggregation systems
- **Enhancement #4**: Log level strategy - prepares for future log aggregation/monitoring tools

### Code Quality
- **Gap #3**: Automated prevention of console usage - enforce standards proactively
- **Enhancement #3**: Document MSW exception with ESLint comment - clearer intent
- **Enhancement #6**: App-specific logger context - easier to identify log source in aggregated logs

### Future Scope
- **Gap #1**: Audit remaining apps (app-sets-gallery, app-wishlist-gallery, app-dashboard, user-settings) - expand console cleanup to full monorepo
- **Gap #4**: Logger context/correlation - foundation for distributed tracing in future

---

## Implementation Notes for Future Stories

### Next Story Ideas

**BUGF-006-B: Complete Frontend Console Cleanup**
- Scope: app-sets-gallery, app-wishlist-gallery, app-dashboard, user-settings
- Points: 2-3 (depends on console usage count)
- Dependencies: BUGF-006 (learn from patterns)

**BUGF-00X: Enforce Logger Standards**
- Scope: Add ESLint rule to error (not warn) on console usage in source files
- Add pre-commit hook to auto-fix console → logger
- Update CLAUDE.md with enforcement strategy
- Points: 1

**INFRA-XXX: Structured Logging Enhancement**
- Scope: Establish structured logging patterns and context objects
- Create logger factory with app-specific context
- Define log level strategy per environment
- Update all logger calls to use structured context
- Points: 5

**INFRA-XXX: Log Aggregation & Monitoring**
- Scope: Integrate logger with CloudWatch/Datadog/similar
- Set up log filtering and alerting
- Create log analysis dashboards
- Points: 8

### Pattern Recommendations

**When creating similar stories**:
1. Verify existing package status before planning (don't assume packages need creation)
2. Explicitly document exclusions (test files, CI/CD, backend) upfront
3. Provide line-by-line inventory for search-and-replace tasks
4. Include evidence requirements in ACs (git diff, lint output, screenshots)
5. Document exceptions (like MSW handlers) with clear rationale

**Logger usage best practices** (for future standardization):
```typescript
// Good: Structured context
logger.info('User action completed', {
  userId,
  action: 'delete',
  resourceId,
  timestamp: Date.now()
})

// Good: Error with context
logger.error('Failed to load data', error, {
  endpoint: '/api/v2/users',
  userId,
  retryCount: 3
})

// Avoid: String concatenation
logger.info('User ' + userId + ' deleted resource')

// Avoid: Losing error stack trace
logger.error('Failed: ' + error.message)
```

---

## Research Questions for Future Iterations

1. **Log Retention**: How long should frontend logs be retained? (Consider GDPR/privacy)
2. **PII in Logs**: Are there user IDs or other PII in console/logger statements that need redaction?
3. **Error Tracking Integration**: Should logger.error integrate with Sentry or similar error tracking?
4. **Performance Impact**: What's the performance overhead of logger vs console in browser?
5. **Backend Parity**: Should backend move from console to structured logger for consistency?

---

## Known Limitations (Current Story)

1. **No CI enforcement**: Story changes ESLint warnings to pass but doesn't elevate no-console to error
2. **Manual verification only**: No automated test to prevent regression (new console statements)
3. **Dev-only validation**: Story requires browser console verification but no production log validation
4. **Single review cycle assumption**: Predictions assume 1 review cycle; complex apps may need 2
5. **No telemetry**: Story doesn't add telemetry to track logger adoption success

---

## Lessons to Capture in Knowledge Base

*(If KB were available, these would be stored as reusable patterns)*

### Pattern: Console-to-Logger Migration

**Context**: Migrating from console statements to structured logger
**Approach**:
1. Audit codebase with grep (exclude tests, CI/CD, backend)
2. Document line-by-line inventory with context
3. Verify logger package availability and import pattern
4. Create replacement map (console.log → logger.info, etc.)
5. Explicitly document exceptions (test files, dev tooling)
6. Require evidence-based acceptance criteria (lint output, git diff)

**Gotchas**:
- Test files legitimately use console - exclude by design
- MSW/mock handlers may need console for dev debugging
- Error objects must preserve stack traces in logger
- Import pattern must match existing usage (avoid breaking changes)

**Time estimate**: 2 hours for 10-15 replacements across 3-5 files

### Pattern: Tech Debt Story Sizing

**Indicators of appropriate sizing** (from BUGF-006):
- ✅ Single type of change (console → logger)
- ✅ Clear inventory (4 files, 10 occurrences)
- ✅ Established pattern (34+ existing examples)
- ✅ No new infrastructure needed
- ✅ <2 hour implementation estimate
- ✅ Junior-developer friendly

**Indicators of oversizing** (NOT present in BUGF-006, but watch for):
- ❌ >8 files affected
- ❌ Multiple change types bundled (e.g., logger + linter config + test updates)
- ❌ New packages/infrastructure required
- ❌ >3 hour implementation estimate
- ❌ Requires senior developer expertise

---

## Stakeholder Communication

**For PM**:
- Story is ready to implement with no MVP-critical gaps
- Consider follow-up story for remaining apps (sets, wishlist, dashboard, user-settings)
- Consider story to enforce logger standards with ESLint auto-fix

**For Tech Lead**:
- Logger package is production-ready; no infrastructure work needed
- 34+ files already use logger successfully; low risk change
- Recommend future story to add structured logging context (not MVP-blocking)
- Consider log aggregation strategy before production launch

**For Developer**:
- Straight search-and-replace with clear examples
- Watch for eslint-disable comments to remove
- Verify error objects preserve stack traces in logger.error calls
- MSW handlers intentionally excluded - don't modify

**For QA**:
- No functional changes expected; logger is transparent in dev mode
- Verify browser console still shows logs during manual testing
- Confirm no test file modifications (git diff check)
- Lint and type-check must pass (automated validation)
