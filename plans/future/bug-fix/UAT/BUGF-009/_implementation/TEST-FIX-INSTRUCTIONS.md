# Test Fixing Instructions - BUGF-009

## Current Task: Fix LoginPage.test.tsx (Step 3)

### Objective
Remove `.skip` from LoginPage test suite and fix all 17 failing tests.

### File
`apps/web/main-app/src/routes/pages/__tests__/LoginPage.test.tsx`

### Known Issues (from investigation)
- Line 141: `describe.skip('LoginPage', ()` needs to become `describe('LoginPage', ()`
- When .skip removed: 21/38 tests pass, 17 fail
- Main failures: Mock issues with Button components (multiple elements matching 'sign in' role)

### Approach
1. Remove .skip from line 141
2. Run tests: `pnpm --filter @repo/main-app test -- LoginPage.test.tsx --run`
3. Fix failures one by one:
   - Update Button role/query selectors
   - Update RTK Query mutation mocks
   - Update form validation mocks
   - Ensure userEvent interactions working
4. Re-run tests until all 38 pass
5. Document fixes in FRONTEND-LOG.md

### Success Criteria
- All 38 LoginPage tests passing
- No console errors
- All assertions valid

### Output
Update: `plans/future/bug-fix/in-progress/BUGF-009/_implementation/FRONTEND-LOG.md`

Signal: "LoginPage COMPLETE" or "LoginPage BLOCKED: reason"
