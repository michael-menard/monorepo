# Test Plan: BUGF-006

## Scope Summary
- **Endpoints touched**: None (frontend logging infrastructure only)
- **UI touched**: No (internal logging changes only)
- **Data/storage touched**: No
- **Apps affected**: app-inspiration-gallery, app-instructions-gallery, main-app
- **Files modified**: 4 source files (excludes test files and CI workflows)

## Happy Path Tests

### Test 1: Logger Import and Basic Usage
**Setup**:
- Open browser devtools console
- Start one of the affected apps in dev mode

**Action**:
- Trigger code path that uses newly replaced logger calls (e.g., open inspiration gallery main page)

**Expected outcome**:
- Log messages appear in browser console with structured format
- Logger output includes timestamp, level indicator, and message
- No console errors or warnings about missing logger

**Evidence**:
- Screenshot of browser console showing logger output
- Verify log format matches @repo/logger standard format

### Test 2: Error Logging with Stack Traces
**Setup**:
- Navigate to admin user detail page in main-app
- Trigger an error condition (e.g., invalid user ID)

**Action**:
- Observe error logging in browser console

**Expected outcome**:
- Errors logged via logger.error() include:
  - Error message
  - Stack trace
  - Error object details
- No raw console.error calls visible

**Evidence**:
- Browser console screenshot showing structured error with stack trace
- Verify error object properties are logged

### Test 3: Different Log Levels
**Setup**:
- Review modified files to identify different log levels used

**Action**:
- Trigger code paths using logger.info(), logger.error(), logger.warn()

**Expected outcome**:
- Each log level appears with appropriate formatting in console
- Log levels are distinguishable (color, prefix, or icon)

**Evidence**:
- Console screenshots showing different log levels
- Verify all levels render correctly

## Error Cases

### Error 1: Logger Import Failure
**Setup**:
- Temporarily break @repo/logger package.json export

**Action**:
- Attempt to load affected app

**Expected outcome**:
- Build error or import error clearly identifies missing logger
- Error message is actionable

**Evidence**:
- Build error message text
- TypeScript/bundler error output

### Error 2: Invalid Logger Method Call
**Setup**:
- Code review to ensure no typos in logger method calls

**Action**:
- Static analysis and type checking

**Expected outcome**:
- TypeScript compilation succeeds
- No runtime errors during normal operation

**Evidence**:
- `pnpm check-types` output shows no errors
- Application starts successfully

## Edge Cases (Reasonable)

### Edge 1: Logger with Multiple Arguments
**Setup**:
- Review code using logger with multiple args (e.g., `logger.info('message', data)`)

**Action**:
- Trigger code path with multi-arg logger calls

**Expected outcome**:
- All arguments logged correctly
- Structured data appears formatted (not [Object object])

**Evidence**:
- Console output showing structured data
- Verify objects are properly serialized

### Edge 2: Logger in Development vs Production
**Setup**:
- Build app in production mode

**Action**:
- Check logger behavior in production build

**Expected outcome**:
- Logger respects production environment settings
- No development-only debug logs in production

**Evidence**:
- Production build console output
- Verify log level filtering works

### Edge 3: ESLint Validation After Changes
**Setup**:
- All console statements replaced
- All eslint-disable comments removed

**Action**:
- Run `pnpm lint` on modified files

**Expected outcome**:
- No "no-console" warnings in modified source files
- ESLint passes for all affected files

**Evidence**:
- ESLint output showing 0 warnings/errors
- CI lint check passes

## Required Tooling Evidence

### Frontend Testing
**Playwright runs required**:
- Not required - no UI behavior changes
- Manual verification in browser console sufficient

**Visual regression**:
- Not applicable - logging is transparent to UI

**Accessibility**:
- Not applicable - no user-facing changes

### Linting and Type Checking
**Required checks**:
1. `pnpm lint` - verify no console-related warnings
2. `pnpm check-types` - verify TypeScript compilation
3. `pnpm test` - ensure existing tests still pass

**Assertions**:
- Zero ESLint "no-console" warnings in modified files
- Zero TypeScript errors
- All existing tests pass unchanged

### Manual Verification
**Per-app smoke test**:
1. **app-inspiration-gallery**:
   - Load main page
   - Check console for logger output where console.log was removed
   - Verify 5 replacements work correctly

2. **app-instructions-gallery**:
   - Navigate to detail page
   - Trigger edit/favorite actions
   - Verify logger calls instead of console

3. **main-app**:
   - Navigate to admin user detail page
   - Trigger error conditions
   - Verify error logging works

**Evidence required**:
- Browser console screenshots from each app
- Confirmation that logs appear with proper formatting

## Risks to Call Out

### Risk 1: MSW Handler Decision Pending
- **Issue**: `main-app/src/mocks/handlers.ts` has 1 console.log for debugging
- **Decision needed**: Should MSW handlers use logger or keep console for local dev debugging?
- **Impact**: Low - MSW only runs in development
- **Recommendation**: Keep console for MSW handlers, explicitly document as exception

### Risk 2: Test File Exclusion Verification
- **Issue**: Must ensure test files are NOT modified (6 files with console usage)
- **Mitigation**: Explicit file list in implementation, skip test files
- **Impact**: Medium if test files accidentally modified
- **Evidence**: Git diff showing ONLY source files modified, not test files

### Risk 3: Logger Output Format Changes
- **Issue**: Developers accustomed to plain console.log format
- **Mitigation**: Verify logger output is readable and informative in dev mode
- **Impact**: Low - logger should be transparent
- **Evidence**: Developer feedback on console readability

## Test Execution Checklist

- [ ] Run `pnpm lint` on all modified files
- [ ] Run `pnpm check-types` on all modified files
- [ ] Run `pnpm test` to ensure existing tests pass
- [ ] Manual verification: app-inspiration-gallery console output
- [ ] Manual verification: app-instructions-gallery console output
- [ ] Manual verification: main-app console output
- [ ] Manual verification: main-app error logging
- [ ] Verify no eslint-disable comments remain in modified files
- [ ] Verify test files were NOT modified
- [ ] Verify CI workflows were NOT modified
- [ ] Document MSW handler decision
- [ ] Screenshot evidence of logger output in browser console
