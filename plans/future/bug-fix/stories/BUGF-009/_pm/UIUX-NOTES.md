# UI/UX Notes: BUGF-009

**Generated:** 2026-02-11
**Story:** Fix and Enable Skipped Test Suites in Main App
**Phase:** 3 (Test Coverage & Quality)

---

## Verdict

**SKIPPED** - This story does not touch user-facing UI.

**Justification:**
This is a test infrastructure story focused on enabling and fixing skipped test suites. No UI components are being created or modified. The story involves:
- Un-skipping existing test files
- Updating test mocks to match current implementation
- Removing obsolete tests
- Validating test coverage

While the tests themselves validate user-facing components (LoginPage, SignupPage, Navigation, etc.), this story does not change the user experience or visual presentation.

---

## Developer Experience Considerations

While not user-facing, this story impacts **developer experience** significantly:

### DX Priority Matrix

**High Priority (Critical Path Testing):**
- Auth flow tests → Validate critical user journeys (login, signup, session)
- Navigation tests → Ensure core app navigation works
- Router tests → Validate foundational routing infrastructure

**Medium Priority (Important but Not Blocking):**
- Module loading tests → Validate lazy loading optimization
- App integration tests → Provider stack validation

**Low Priority (Nice to Have):**
- Performance tests → May be obsolete, defer if needed
- Cache tests → Blocked by missing package, consider removing

### Test-Driven Development Impact

Enabling these tests will:
1. **Increase confidence** in auth refactoring work
2. **Prevent regressions** in navigation and routing
3. **Document expected behavior** for future developers
4. **Enable safer refactoring** of critical components

### Accessibility Testing Notes

The tests being enabled validate important accessibility requirements:

**From LoginPage/SignupPage tests:**
- Form validation errors use `aria-invalid` attributes
- Error messages linked via `aria-describedby`
- Form inputs have proper `aria-label` attributes
- Submit buttons have accessible states (disabled, loading)

**From Navigation tests:**
- Keyboard navigation support (arrow keys, tab, enter)
- Screen reader announcements for route changes
- Focus management on navigation
- ARIA landmarks for navigation regions

**Recommendation:** When enabling tests, verify they still test these a11y requirements. If tests don't validate accessibility, consider adding a11y assertions.

---

## Design System Compliance (Test Validation)

While this story doesn't modify UI, tests should validate design system compliance:

### Token-Only Colors
Tests should verify components use Tailwind theme tokens, not hardcoded colors.

**Example assertion pattern:**
```typescript
// Good - validates theme token usage
const button = screen.getByRole('button')
expect(button).toHaveClass('bg-primary') // theme token
expect(button).not.toHaveClass('bg-blue-500') // hardcoded color
```

### _primitives Pattern
Tests should import shadcn components from `_primitives`:

**Example:**
```typescript
// Test should verify component uses Button from _primitives
import { Button } from '@repo/ui/button' // ❌ Wrong
import { Button } from '@repo/ui/_primitives/button' // ✅ Correct
```

**Recommendation:** If tests are updated to match current implementation, verify they follow current design system patterns.

---

## No MVP Component Architecture Required

This story does not create or modify components.

---

## No MVP Accessibility Requirements

This story validates existing accessibility implementation through tests, but does not add new accessibility features.

---

## No MVP Playwright Evidence Required

This story focuses on Vitest unit/integration tests. Playwright E2E tests are out of scope per ADR-005 and ADR-006.

---

**UI/UX Notes Complete (SKIPPED)**
