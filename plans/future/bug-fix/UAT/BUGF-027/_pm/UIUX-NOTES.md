# UI/UX Notes: BUGF-027

## Verdict

**SKIPPED** - This is a documentation story with no UI implementation.

## Justification

BUGF-027 produces an implementation guide document at `docs/guides/password-reset-rate-limiting.md`. The story does not modify UI components or user-facing interfaces.

## UI/UX Considerations for Guide Content

While this story does not implement UI, the guide document should address the following UI/UX patterns for BUGF-019 implementation:

### Component Reuse (AC-4)

The guide should document:

1. **RateLimitBanner Component**:
   - Current location: `packages/core/upload/src/components/RateLimitBanner/index.tsx`
   - Target location: `packages/core/app-component-library/feedback/RateLimitBanner`
   - Styling adaptations for auth flows vs upload flows
   - Props contract for countdown timer and retry callback

2. **Design System Compliance**:
   - RateLimitBanner uses token-based Tailwind colors (already compliant)
   - Component should be adapted from shadcn Alert primitive
   - Must follow `_primitives` import pattern per CLAUDE.md

### Accessibility Requirements (AC-3)

The guide should specify:

1. **Countdown Timer Accessibility**:
   - Use `aria-live="polite"` for countdown announcements
   - Respect `prefers-reduced-motion` for timer animations
   - Screen reader should announce remaining time at intervals (e.g., every 30 seconds)

2. **Button States During Cooldown**:
   - Disabled button should include `aria-disabled="true"`
   - Disabled state should have clear visual indicator (not just opacity)
   - Focus should not be trapped on disabled button

3. **Error Message Display**:
   - Rate limit error should use `role="alert"` for immediate screen reader announcement
   - Error should be associated with form input via `aria-describedby`

### User Flow Documentation (AC-3)

The guide should document:

1. **Rate Limit Trigger**:
   - User submits forgot password form
   - Cognito returns LimitExceededException
   - Frontend displays RateLimitBanner with countdown

2. **During Cooldown**:
   - Submit button disabled
   - Countdown timer visible
   - User can dismiss banner or wait for expiration

3. **After Cooldown**:
   - Submit button re-enabled
   - Banner auto-dismisses or shows "Try again" button
   - User can retry password reset

### Pattern References

The guide should reference:

- **RateLimitBanner** (existing): `packages/core/upload/src/components/RateLimitBanner/index.tsx`
- **ForgotPasswordPage** (existing error handling): `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx`
- **ResendCodeButton** (existing cooldown pattern): `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx`

## Future UI/UX Enhancements

The following are out of scope for the guide but could be documented in `FUTURE-UIUX.md` for BUGF-019 or later stories:

1. **Visual Polish**:
   - Progress bar for countdown timer (not just text)
   - Smooth animations for banner entry/exit
   - Subtle pulse effect on retry button when cooldown expires

2. **Edge Case UX**:
   - What happens if user refreshes page during cooldown (sessionStorage persistence)
   - What happens if user switches tabs during cooldown (timer continues)
   - Multi-device scenario (cooldown on different device)

3. **Advanced Accessibility**:
   - Keyboard shortcut to hear remaining time on demand
   - High contrast mode support for countdown timer
   - Reduced motion alternative (static text instead of animated countdown)
