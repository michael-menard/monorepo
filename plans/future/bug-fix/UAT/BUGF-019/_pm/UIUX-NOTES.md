# UI/UX Notes: BUGF-019

## Story Context

**Title**: Implement Password Reset Rate Limiting and UX Improvements
**Story ID**: BUGF-019
**Epic**: bug-fix
**Phase**: 3 (Test Coverage & Quality)
**Points**: 2

---

## UI/UX Goals

1. **Transparent Feedback**: Users should understand why they can't retry and when they can
2. **Countdown Visibility**: Timer displays in both banner and button text
3. **Accessibility**: Screen reader support, keyboard navigation, reduced motion support
4. **Visual Consistency**: Match existing LEGO-inspired auth page styling
5. **Account Enumeration Prevention**: Generic error messages that don't leak account existence

---

## Design Patterns (from BUGF-027 Guide)

### 1. RateLimitBanner Component

**Current Location**: `packages/core/upload/src/components/RateLimitBanner/index.tsx`
**Target Location**: `packages/core/app-component-library/src/feedback/RateLimitBanner/`

**Visual Characteristics**:
- **Variant**: Destructive (red, error tone)
- **Layout**: Full-width banner above form, below page header
- **Components**: Alert container + progress bar + countdown text + retry button
- **Dismissible**: Optional (via `onDismiss` prop)

**Example**:

```
┌────────────────────────────────────────────────────────┐
│ ⚠️ Rate Limit Exceeded                                │
│                                                        │
│ Too many attempts. Please wait 2:30 before retrying.  │
│                                                        │
│ [============================          ] 75% complete │
│                                                        │
│ [ Retry Now ]  (disabled until countdown expires)     │
└────────────────────────────────────────────────────────┘
```

**Reference**: BUGF-027 guide section 3.1, section 4.1

---

### 2. Countdown Timer Display

#### 2.1 Format Specification

**Format**: `MM:SS`

**Examples**:
- 150 seconds → "2:30"
- 45 seconds → "0:45"
- 600 seconds → "10:00"

**Implementation** (from BUGF-027 section 3.2.1):

```typescript
function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
```

**Reference**: BUGF-027 guide section 3.2.1

#### 2.2 Countdown Display Locations

| Location | Display Pattern | Purpose |
|----------|----------------|---------|
| **RateLimitBanner** | "Please wait 2:30 before retrying." | Prominent, persistent countdown |
| **Submit Button** | "Wait 2:30" (replaces button text) | Inline feedback at action point |
| **Screen Reader** | "Approximately 2 minutes remaining" | Accessible announcement (throttled) |

**Design Rationale**: Dual display (banner + button) provides redundancy and meets users at point of action.

---

### 3. Button States

#### 3.1 ForgotPasswordPage Submit Button

**State Machine**:

```
┌──────────────────┐
│ Normal           │  → User can submit
│ "Send Reset      │
│  Instructions"   │
└──────────────────┘
        ↓ (LimitExceededException)
┌──────────────────┐
│ Cooldown Active  │  → User must wait
│ "Wait 2:30"      │
│ (disabled)       │
└──────────────────┘
        ↓ (countdown expires)
┌──────────────────┐
│ Normal (restored)│
└──────────────────┘
```

**Visual Indicators During Cooldown**:
- **Opacity**: Reduced to 50% (`opacity-50`)
- **Cursor**: `cursor-not-allowed`
- **Text**: Dynamic countdown ("Wait 2:30")
- **Color**: Muted (inherited from disabled state)

**CSS Pattern** (from BUGF-027 section 3.3):

```typescript
<Button
  type="submit"
  disabled={cooldownSeconds > 0 || isSubmitting}
  aria-disabled={cooldownSeconds > 0 || isSubmitting}
  className={cn(
    'w-full',
    cooldownSeconds > 0 && 'cursor-not-allowed opacity-50'
  )}
>
  {cooldownSeconds > 0
    ? `Wait ${formatCountdown(cooldownSeconds)}`
    : 'Send Reset Instructions'
  }
</Button>
```

#### 3.2 ResetPasswordPage Submit Button

**Same pattern as ForgotPasswordPage**, but for `confirmResetPassword` operation:

- Normal: "Reset Password"
- Cooldown: "Wait 4:00"
- Loading: "Resetting..." (with spinner)

#### 3.3 Resend Code Button

**Pattern**: Identical to existing `ResendCodeButton` component (reference implementation)

**States**:
- Normal: "Resend code"
- Cooldown: "Wait 2:00"
- Loading: "Sending..."

**Reference**: `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx`

---

### 4. Password Strength Indicator

**Current Location (duplicated)**:
- `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx:56-108` (inline)
- `apps/web/reset-password/src/components/PasswordStrengthIndicator.tsx` (standalone)

**Target Location**: `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/`

#### 4.1 Visual Design

**Layout**: 5 horizontal bars, filled based on password strength

```
Weak (1 bar):      [█░░░░]
Fair (2 bars):     [██░░░]
Medium (3 bars):   [███░░]
Strong (4 bars):   [████░]
Very Strong (5):   [█████]
```

**Color Coding**:

| Strength | Bars Filled | Color | Tailwind Class |
|----------|-------------|-------|----------------|
| Weak | 1 | Red | `bg-destructive` |
| Fair | 2 | Orange | `bg-orange-500` |
| Medium | 3 | Yellow | `bg-yellow-500` |
| Strong | 4 | Lime | `bg-lime-500` |
| Very Strong | 5 | Green | `bg-green-500` |

**Reference**: Seed AC-4, BUGF-027 guide section 3.4

#### 4.2 Strength Calculation (from existing implementation)

**Algorithm** (extracted from ResetPasswordPage lines 56-74):

```typescript
function getPasswordStrength(password: string): number {
  if (password.length === 0) return 0
  if (password.length < 8) return 1

  let strength = 2 // Base: length >= 8

  // Check character variety
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password)

  if (hasLowercase && hasUppercase) strength++
  if (hasNumbers) strength++
  if (hasSpecialChars && password.length >= 12) strength++

  return Math.min(strength, 5)
}
```

**Visual Feedback**: Update in real-time as user types (debounced by 200ms for performance).

---

### 5. Banner Placement

#### 5.1 ForgotPasswordPage Layout

```
┌────────────────────────────────────────────────┐
│ LEGO Brick Animation (existing)                │
│                                                 │
│ Forgot Password (h1)                           │
│                                                 │
│ ┌────────────────────────────────────────┐    │
│ │ ⚠️ Rate Limit Exceeded (RateLimitBanner) │   │
│ │ Too many attempts. Wait 2:30.           │    │
│ │ [==================    ] 75%            │    │
│ └────────────────────────────────────────┘    │
│                                                 │
│ ┌────────────────────────────────────────┐    │
│ │ Email Address                           │    │
│ │ [____________________________]          │    │
│ │                                         │    │
│ │ [ Send Reset Instructions ] (disabled)  │    │
│ │ Button text: "Wait 2:30"                │    │
│ └────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

**Placement Rationale**:
- Banner above form: Prominent, visible before interaction
- Banner below header: Doesn't obscure page title or navigation
- Banner dismissible: NO (user must wait to proceed with auth action)

**Reference**: BUGF-027 guide section 4.4.1

#### 5.2 ResetPasswordPage Layout

```
┌────────────────────────────────────────────────┐
│ Reset Password (h1)                            │
│                                                 │
│ ┌────────────────────────────────────────┐    │
│ │ ⚠️ Rate Limit Exceeded                   │   │
│ │ Too many verification code attempts.    │    │
│ │ Wait 4:00 before retrying.              │    │
│ └────────────────────────────────────────┘    │
│                                                 │
│ ┌────────────────────────────────────────┐    │
│ │ Email Address                           │    │
│ │ [____________________________]          │    │
│ │                                         │    │
│ │ Verification Code                       │    │
│ │ [____________]                          │    │
│ │                                         │    │
│ │ New Password                            │    │
│ │ [____________________________]          │    │
│ │ Password Strength: [███░░]              │    │
│ │                                         │    │
│ │ [ Reset Password ] (disabled)           │    │
│ │                                         │    │
│ │ [ Resend code ] (disabled: "Wait 2:00") │    │
│ └────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

---

### 6. Accessibility Requirements

#### 6.1 ARIA Live Regions

**Pattern** (from BUGF-027 section 3.4.1):

```typescript
// RateLimitBanner component
<div role="timer" aria-live="polite" className="sr-only">
  {canRetry
    ? 'Rate limit expired. You can now retry.'
    : `${remainingSeconds} seconds remaining until you can retry.`}
</div>
```

**Key Attributes**:
- `role="timer"` - Identifies countdown semantics
- `aria-live="polite"` - Announces changes without interrupting
- `className="sr-only"` - Hidden visually, available to screen readers

**Reference**: BUGF-027 guide section 3.4.1

#### 6.2 Screen Reader Announcements

**Throttling**: Announce every 30 seconds (not every second)

**Announcement Text**:
- Initial: "Rate limit exceeded. Approximately 4 minutes remaining."
- 30 seconds later: "Approximately 3 minutes remaining."
- 60 seconds later: "Approximately 2 minutes remaining."
- When expired: "Rate limit expired. You can now retry."

**Rationale**: Prevents screen reader spam. Visual countdown continues to update every second for sighted users.

**Reference**: BUGF-027 guide section 3.4.2

#### 6.3 Prefers-Reduced-Motion Support

**CSS Pattern**:

```typescript
<div
  className={cn(
    'h-full bg-destructive',
    'transition-all duration-1000 ease-linear',
    'motion-reduce:transition-none', // Disable animation
  )}
  style={{ width: `${progress}%` }}
/>
```

**Behavior**:
- Progress bar animation disabled
- Countdown timer continues to function
- Smooth transitions disabled
- Static states remain visible

**Reference**: BUGF-027 guide section 3.4.3, Seed AC-5

#### 6.4 Keyboard Navigation

**Requirements**:
- Submit button focusable (even when disabled)
- Tab order: Banner → Email input → Submit button
- Retry button in banner: Focusable, but disabled until countdown expires
- Focus indicator visible on all interactive elements

---

### 7. Error Messaging

#### 7.1 Account Enumeration Prevention

**Rule**: Rate limit messages must be generic. Never reveal account existence.

**Examples**:

| Message | Safe? | Rationale |
|---------|-------|-----------|
| "Too many attempts. Please wait before trying again." | ✅ Yes | Generic, applies to any email |
| "Rate limit exceeded. Try again in 2:30." | ✅ Yes | Time-based, no account info |
| "This account has been locked for 5 minutes." | ❌ No | Implies account exists |
| "Too many failed resets for test@example.com." | ❌ No | Confirms email exists |

**Reference**: BUGF-027 guide section 5.4.1, Seed AC-6

#### 7.2 Recommended Messaging

**ForgotPasswordPage**:
- Error: "Too many password reset attempts. Please wait before retrying."
- Banner title: "Rate Limit Exceeded"

**ResetPasswordPage**:
- Error: "Too many verification code attempts. Please wait before retrying."
- Banner title: "Rate Limit Exceeded"

**ResendCodeButton**:
- Button text during cooldown: "Wait 2:00"
- No additional error message needed (button state is self-explanatory)

---

### 8. Visual Consistency

#### 8.1 LEGO-Inspired Theme

**Color Palette** (from CLAUDE.md):
- Primary: Sky blue (`bg-sky-500`)
- Secondary: Teal (`bg-teal-500`)
- Destructive: Red (`bg-destructive`)
- Success: Green (`bg-green-500`)

**Maintain Existing Patterns**:
- LEGO brick animations on auth pages (ForgotPasswordPage, ResetPasswordPage)
- Card-based form layouts
- Consistent spacing (Tailwind spacing scale)
- Button styles from `@repo/app-component-library`

**Reference**: CLAUDE.md Design System section

#### 8.2 Component Library Alignment

**Import Pattern**:

```typescript
// CORRECT (per CLAUDE.md)
import { Button, Card, Alert, RateLimitBanner } from '@repo/app-component-library'

// WRONG (avoid individual paths)
import { Button } from '@repo/app-component-library/buttons'
```

**Architecture**:
- `RateLimitBanner` = App-level feedback component (in `/feedback/`)
- `Alert` = Primitive component from shadcn (in `/_primitives/`)
- `PasswordStrengthIndicator` = App-level form component (in `/forms/`)

**Reference**: CLAUDE.md Component Library Architecture

---

### 9. Responsive Design

**Breakpoint Considerations**:

| Viewport | Banner Layout | Button Layout |
|----------|---------------|---------------|
| Mobile (<640px) | Full-width, stacked content | Full-width button, countdown below |
| Tablet (640-1024px) | Full-width, inline countdown | Full-width button, countdown inline |
| Desktop (>1024px) | Centered card (max-w-md), inline countdown | Full-width within card |

**Progress Bar**:
- Always full-width within banner
- Height: 4px (h-1)
- Animated transition: 1000ms linear (disabled with `motion-reduce`)

---

### 10. Animation Details

#### 10.1 Progress Bar Animation

**Pattern**:
- Width: 100% → 0% over cooldown duration
- Transition: `transition-all duration-1000 ease-linear`
- Update frequency: Every second (synchronized with countdown)

**Implementation** (from RateLimitBanner):

```typescript
const progress = (remainingSeconds / totalSeconds) * 100

<div
  style={{ width: `${progress}%` }}
  className="h-full bg-destructive transition-all duration-1000 ease-linear motion-reduce:transition-none"
/>
```

**Reference**: BUGF-027 guide section 3.4.3

#### 10.2 Button State Transitions

**Disabled → Enabled Transition**:
- Opacity: 50% → 100% (fade-in over 200ms)
- Text: "Wait 0:00" → "Send Reset Instructions" (instant)
- Cursor: `cursor-not-allowed` → `cursor-pointer`

**No animation on countdown text changes** (performance: avoid layout thrashing with 60 updates/minute).

---

### 11. Edge Cases

#### 11.1 Very Long Cooldowns (10 minutes)

**Display**: "Wait 10:00"
**Banner message**: "Too many attempts. Please wait 10 minutes before retrying."

**Consideration**: 10 minutes is the maximum cooldown (capped at 600 seconds). UI should handle gracefully without layout shift.

#### 11.2 Page Refresh During Cooldown

**Expected Behavior**:
- SessionStorage persists across refresh
- Cooldown state restored on page load
- Banner visible immediately
- Countdown picks up where it left off

**Example**: User at "Wait 3:45", refreshes page, sees "Wait 3:42" (accounting for elapsed time).

#### 11.3 Browser Back Button

**Expected Behavior**:
- SessionStorage preserved
- If navigating back to ForgotPasswordPage during cooldown, banner and disabled button restored

---

### 12. Recommended Enhancements (Future Stories)

**Not in BUGF-019 scope**, but noted for future improvements:

1. **Custom Banner Messages**: Add optional `message` prop to RateLimitBanner for context-specific text
2. **Variant Prop**: Add `variant?: 'destructive' | 'warning'` for non-critical rate limits
3. **Cancel Countdown**: Add "I'll wait" button to dismiss banner (but keep button disabled)
4. **Sound Alert**: Optional audio notification when countdown expires (accessibility enhancement)
5. **Dark Mode Support**: Ensure color contrast meets WCAG AA in both light and dark themes

**Reference**: BUGF-027 guide section 4.3

---

## UI/UX Checklist

- [ ] RateLimitBanner displays above form, below header
- [ ] Countdown format: MM:SS (e.g., "2:30")
- [ ] Submit button text changes to "Wait X:XX" during cooldown
- [ ] Button disabled with `disabled={true}` and `aria-disabled="true"`
- [ ] Button has reduced opacity (50%) and `cursor-not-allowed` during cooldown
- [ ] Progress bar animates from 100% to 0% over cooldown duration
- [ ] Progress bar animation disabled with `prefers-reduced-motion`
- [ ] Password strength indicator displays 5 bars with color coding (red/orange/yellow/lime/green)
- [ ] Screen reader announcements throttled to every 30 seconds
- [ ] role="timer" and aria-live="polite" attributes present
- [ ] Error messages are generic (account enumeration prevention)
- [ ] Visual consistency with LEGO-inspired theme (Sky/Teal palette)
- [ ] Responsive design works on mobile, tablet, desktop
- [ ] SessionStorage state persists across page refresh
- [ ] Keyboard navigation supported (tab order, focus indicators)

---

**UI/UX Notes Status**: Draft
**Story**: BUGF-019
**Last Updated**: 2026-02-11
**Author**: PM UI/UX Advisor Worker
