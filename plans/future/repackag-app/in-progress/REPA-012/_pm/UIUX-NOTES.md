# UI/UX Notes: REPA-012 - Create @repo/auth-hooks Package

## Verdict

**PASS-WITH-NOTES**

This is primarily an infrastructure story (creating a shared package), but there are indirect UX impacts that must be preserved:
- Toast notifications on token refresh failure (useTokenRefresh)
- Feature gates and quota indicators (usePermissions)
- No UI changes should be visible to users

---

## MVP Component Architecture

### Components Required for Core Journey
- **No new components** - this story consolidates existing hooks only

### Affected Components (Must Preserve Behavior)
- `QuotaIndicator` (packages/core/app-component-library/src/indicators/QuotaIndicator.tsx)
  - Currently imports usePermissions from main-app
  - Must update import to `@repo/auth-hooks`
  - **Critical:** Behavior must remain identical (shows quota bars, percentage)
- `FeatureGate` (packages/core/app-component-library/src/gates/FeatureGate.tsx)
  - Currently imports usePermissions from main-app
  - Must update import to `@repo/auth-hooks`
  - **Critical:** Behavior must remain identical (shows/hides features based on permissions)
- Gallery apps (6 apps: dashboard, inspiration, instructions, sets, wishlist, user-settings)
  - Currently have useModuleAuth stubs (not actively used)
  - Must update imports to `@repo/auth-hooks` after stubs deleted
  - **Critical:** No visual changes to apps

### Reuse Targets
- **None** - this story creates the reuse target (`@repo/auth-hooks`)

### shadcn Primitives
- **Not applicable** - no UI components created

---

## MVP Accessibility (Blocking Only)

### Requirements That Prevent Core Journey Usage
- **None** - no new UI elements created

### Accessibility Preservation Requirements
- **Toast notifications (useTokenRefresh):**
  - Must remain accessible (aria-live region)
  - Screen reader announcement: "Token refresh failed. Please log in again."
  - Keyboard focus: Toast dismissible with Enter/Space (if dismissible)
  - **Test:** Verify toast still announces to screen readers after migration
- **FeatureGate (usePermissions):**
  - Must preserve existing aria-hidden behavior when feature is gated
  - No focus trap on hidden features
  - **Test:** Verify keyboard navigation skips gated features
- **QuotaIndicator (usePermissions):**
  - Must preserve existing aria-label on quota bars
  - Screen reader announcement: "X of Y sets used"
  - **Test:** Verify aria-label still correct after migration

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)
- **Not applicable** - no UI components created

### `_primitives` Import Requirement
- **Not applicable** - no UI components created

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps
1. **Token Refresh Flow (if Playwright tests exist for main-app):**
   - User authenticated in app
   - Token approaching expiry (mock time)
   - Refresh triggered automatically
   - User session continues without interruption
   - **Evidence:** Video showing no UI disruption during refresh

2. **Feature Gate Behavior (if Playwright tests exist for FeatureGate):**
   - User without premium feature
   - Feature gate hides premium content
   - User upgrades tier
   - Feature gate shows premium content
   - **Evidence:** Screenshots showing before/after gate behavior

3. **Quota Indicator Updates (if Playwright tests exist for QuotaIndicator):**
   - User at 5/10 quota
   - Quota indicator shows 50% filled bar
   - User adds item (6/10)
   - Quota indicator updates to 60%
   - **Evidence:** Screenshots showing quota bar progression

**Note:** These Playwright tests are NOT new requirements for this story. Only verify existing tests still pass after migration.

---

## UX Preservation Checklist (MVP-Critical)

- [ ] **Toast notifications still display on token refresh failure**
  - Verify toast message matches original: "Token refresh failed. Please log in again."
  - Verify toast styling unchanged (color, position, duration)
  - Verify toast accessibility (aria-live, keyboard dismissal)

- [ ] **FeatureGate behavior unchanged**
  - Verify gated features still hidden for users without permission
  - Verify ungated features visible to all users
  - Verify no console errors or warnings

- [ ] **QuotaIndicator behavior unchanged**
  - Verify quota bars display correct percentage
  - Verify quota text correct (e.g., "5 of 10 sets")
  - Verify visual styling unchanged (colors, sizing)

- [ ] **Gallery apps load without errors**
  - Verify all 6 gallery apps build successfully after stub deletion
  - Verify no runtime errors in browser console
  - Verify app functionality unchanged

---

## Non-MVP Concerns

*(None identified - this story is pure infrastructure consolidation)*
