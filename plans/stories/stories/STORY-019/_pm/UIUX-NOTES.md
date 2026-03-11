# UI/UX Notes - STORY-019: WebSocket Support

## Verdict
**PASS-WITH-NOTES**

This story touches UI for dashboard real-time updates and notifications. The WebSocket infrastructure itself is backend-focused, but the consumer-facing notification system requires careful UX design and accessibility considerations. Story is implementable with proper attention to real-time UI patterns, loading states, and error recovery UX.

---

## Component & UI Architecture Notes

### Suggested React Components

**New Components Required:**

1. **`WebSocketProvider` (Context Provider)**
   - Location: `packages/core/app-component-library/websocket/WebSocketProvider/`
   - Purpose: Manage WebSocket connection lifecycle across the app
   - State: connection status, reconnection attempts, error state
   - Provides: WebSocket send function, connection status, event listeners

2. **`NotificationToast` (Notification Display)**
   - Location: `packages/core/app-component-library/notifications/NotificationToast/`
   - Purpose: Display real-time notifications from WebSocket events
   - Uses: `_primitives/Toast` from shadcn
   - Variants: success, info, warning, error
   - Features: auto-dismiss, action buttons, dismiss button

3. **`NotificationCenter` (Notification List)**
   - Location: `packages/core/app-component-library/notifications/NotificationCenter/`
   - Purpose: Dropdown/panel showing notification history
   - Uses: `_primitives/DropdownMenu` or `_primitives/Popover`
   - Features: mark as read, clear all, filter by type

4. **`ConnectionStatusIndicator` (Connection State)**
   - Location: `packages/core/app-component-library/websocket/ConnectionStatusIndicator/`
   - Purpose: Show WebSocket connection status in UI
   - States: connected (green), reconnecting (yellow), disconnected (red)
   - Uses: `_primitives/Badge` or custom indicator dot

**Pages/Routes Affected:**

- `apps/web/app-dashboard/src/pages/Dashboard.tsx` - Main dashboard integrating WebSocket
- All dashboard sub-pages that need real-time updates

### Reuse Targets

**Existing Primitives to Use:**
- `packages/core/app-component-library/_primitives/Toast` - Base for NotificationToast
- `packages/core/app-component-library/_primitives/Badge` - For status indicators
- `packages/core/app-component-library/_primitives/DropdownMenu` - For notification center
- `packages/core/app-component-library/_primitives/Button` - For notification actions

**Existing Utilities:**
- `packages/core/logger` - For WebSocket connection logging
- Consider creating `packages/core/websocket-client` for WebSocket logic

### State Management Notes

- **Connection State:** Use React Context (`WebSocketProvider`) to manage connection globally
- **Notification Queue:** Consider using local state or lightweight store (Zustand) for notification history
- **Reconnection Logic:** Implement exponential backoff in WebSocketProvider
- **Event Routing:** WebSocket messages should route to appropriate handlers based on message type

### Routing Notes

- No new routes required
- All existing dashboard routes should work with WebSocket connection
- WebSocket connection should persist across route changes (provider at app root)

---

## Accessibility Requirements (Concrete)

### Semantic Structure

1. **Notification Toasts:**
   - Use `role="alert"` for important notifications
   - Use `role="status"` for non-critical updates
   - Wrap in `<aside>` or appropriate landmark

2. **Connection Status Indicator:**
   - Use `role="status"` for connection state
   - Include `aria-live="polite"` for status changes
   - Provide text alternative for color-only indicators

3. **Notification Center:**
   - Use `role="dialog"` or `role="menu"` depending on interaction pattern
   - Properly labeled with `aria-labelledby` pointing to "Notifications" heading
   - List of notifications should use `<ul>` with `<li>` for each item

### Labels and ARIA Attributes

1. **WebSocket Connection Status:**
   ```tsx
   <div role="status" aria-live="polite" aria-label="WebSocket connection status">
     <Badge>Connected</Badge>
     <span className="sr-only">WebSocket connection is active</span>
   </div>
   ```

2. **Notification Toast:**
   ```tsx
   <div role="alert" aria-live="assertive" aria-atomic="true">
     <p>Upload completed: MOC Instructions</p>
     <button aria-label="Dismiss notification">×</button>
   </div>
   ```

3. **Notification Center Toggle:**
   ```tsx
   <button
     aria-label="Open notifications"
     aria-expanded={isOpen}
     aria-haspopup="true"
   >
     Notifications {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
   </button>
   ```

### Keyboard Navigation

1. **Notification Toasts:**
   - Toasts should not trap focus by default
   - If toast has action buttons, they should be keyboard accessible (Tab to reach)
   - Escape key should dismiss toast if it has focus

2. **Notification Center:**
   - Open/close with Enter or Space on toggle button
   - Arrow keys to navigate notification list
   - Enter to activate notification actions
   - Escape to close dropdown
   - Tab should cycle through interactive elements within

3. **Focus Management:**
   - When notification appears, do NOT steal focus (use `role="alert"` for screen reader announcement)
   - When notification center opens, optionally move focus to first notification
   - When notification center closes, return focus to toggle button

### Contrast and Visual Indicators

1. **Connection Status Colors:**
   - Connected (green): Use `bg-green-600` with white text (meets WCAG AAA)
   - Reconnecting (yellow): Use `bg-yellow-600` with black text
   - Disconnected (red): Use `bg-red-600` with white text
   - Never rely on color alone - include icon or text label

2. **Notification Types:**
   - Success: green + checkmark icon
   - Info: blue + info icon
   - Warning: yellow + warning icon
   - Error: red + error icon
   - All icons must have text alternatives

3. **High Contrast Mode:**
   - Ensure borders/outlines visible in high contrast mode
   - Test with Windows High Contrast Mode

### Required Axe Checks

Run axe DevTools on:
1. **Dashboard page with WebSocket connected:**
   - Route: `/dashboard`
   - Check: No critical violations in connection status indicator
   - Check: Toast notifications meet ARIA requirements

2. **Dashboard with notification toast visible:**
   - Trigger: Simulate WebSocket event
   - Check: Toast has proper role and aria-live
   - Check: Dismiss button has accessible label

3. **Notification center open:**
   - Action: Click notification center toggle
   - Check: Dropdown/popover meets menu/dialog requirements
   - Check: All interactive elements keyboard accessible

---

## Design System Rules to Embed in Story

### Token-Only Colors (REQUIRED)

**DO:**
```tsx
// Correct - using Tailwind theme tokens
<div className="bg-teal-600 text-white border-sky-400">
```

**DON'T:**
```tsx
// Wrong - inline styles with arbitrary colors
<div style={{ backgroundColor: '#00ADB5', color: '#FFF' }}>
```

**Notification Color Tokens:**
- Success: `bg-green-600`, `text-green-50`, `border-green-700`
- Info: `bg-sky-600`, `text-sky-50`, `border-sky-700`
- Warning: `bg-yellow-600`, `text-yellow-50`, `border-yellow-700`
- Error: `bg-red-600`, `text-red-50`, `border-red-700`

### No Inline Styles

All styling must use Tailwind classes or CSS modules. No `style={{}}` props except for truly dynamic values (e.g., animation progress percentage).

### No New Fonts

Use existing font stack from Tailwind config. Do not import additional font families.

### `_primitives` Import Requirement

**REQUIRED Pattern:**
```tsx
// Correct - import from _primitives
import { Toast, ToastProvider, ToastViewport } from '@repo/ui/_primitives/Toast'
import { Badge } from '@repo/ui/_primitives/Badge'
import { DropdownMenu } from '@repo/ui/_primitives/DropdownMenu'

// Then wrap/compose in your app component
export function NotificationToast({ message, type }: NotificationToastProps) {
  return (
    <Toast>
      <Badge variant={type}>{message}</Badge>
    </Toast>
  )
}
```

**WRONG:**
```tsx
// Never use third-party toast libraries directly
import { toast } from 'react-hot-toast' // ❌ Wrong
```

### Example Reference

**Notification Pattern Reference:**
Look at existing card patterns for composition:
- `packages/core/app-component-library/cards/AppCounterCard/` - Shows how to compose primitives
- `packages/core/app-component-library/buttons/CustomButton/` - Shows variant patterns

**WebSocket Provider Pattern:**
Similar to existing providers in the codebase, wrap the app with context:
```tsx
<WebSocketProvider endpoint={wsEndpoint}>
  <NotificationProvider>
    <App />
  </NotificationProvider>
</WebSocketProvider>
```

---

## Playwright UI Evidence Requirements

### What to Record in Video

**Required Video Demonstrations (2-3 minutes total):**

1. **Real-time notification flow (30 seconds):**
   - Start: Dashboard loaded, WebSocket connected (show status indicator)
   - Action: Trigger backend event (upload completion)
   - Result: Notification toast appears within 2 seconds
   - Interaction: Click action button in toast
   - Result: Navigate to relevant page (e.g., MOC detail)

2. **Connection recovery flow (45 seconds):**
   - Start: Dashboard with active connection
   - Action: Simulate network disconnect (DevTools offline)
   - Result: Connection status indicator shows "Reconnecting"
   - Wait: 5-10 seconds
   - Action: Restore network
   - Result: Status changes to "Connected", missed notifications appear

3. **Notification center interaction (30 seconds):**
   - Action: Click notification bell/icon
   - Result: Notification center dropdown opens
   - Interaction: Keyboard navigate through notifications (show arrow keys)
   - Action: Press Enter on notification
   - Result: Navigate to relevant content
   - Action: Press Escape
   - Result: Dropdown closes, focus returns to toggle

4. **Accessibility validation (30 seconds):**
   - Action: Navigate dashboard using only keyboard (Tab, Arrow, Enter, Escape)
   - Show: Connection indicator, notification toast, notification center all keyboard accessible
   - Show: Screen reader announcement (optional but recommended)

### Key Assertions in Tests

**Playwright Test Assertions:**

```typescript
// Connection status
await expect(page.getByRole('status', { name: /connection status/i })).toContainText('Connected')

// Notification appears
await expect(page.getByRole('alert')).toBeVisible()
await expect(page.getByRole('alert')).toContainText('Upload completed')

// Notification center
await page.getByRole('button', { name: /notifications/i }).click()
await expect(page.getByRole('menu')).toBeVisible()

// Keyboard navigation
await page.keyboard.press('Tab')
await expect(page.getByRole('button', { name: /dismiss/i })).toBeFocused()

// No page refresh
const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null)
// Trigger notification
await expect(navigationPromise).resolves.toBeNull() // No navigation occurred
```

### Required Artifacts

1. **Video recording:**
   - Full flow from connection to notification to interaction
   - Show both mouse and keyboard interactions
   - Include network tab showing WebSocket connection

2. **Playwright trace:**
   - Capture trace for debugging
   - Should show WebSocket messages in network timeline
   - Should show component state changes

3. **Screenshots:**
   - Connection status indicator (connected, reconnecting, disconnected)
   - Notification toast (all 4 types: success, info, warning, error)
   - Notification center open with multiple notifications
   - Focus indicators visible on interactive elements

4. **Axe accessibility report:**
   - Run on dashboard page
   - Run on dashboard with notification visible
   - Run on dashboard with notification center open
   - Must show 0 critical violations

---

## Risks / Gotchas

### Likely Accessibility Pitfalls

1. **Over-announcing notifications:**
   - Risk: Too many `role="alert"` announcements overwhelm screen reader users
   - Mitigation: Use `role="status"` for non-critical updates, reserve `alert` for errors

2. **Missing focus management:**
   - Risk: Notification appears but user doesn't know (if not using screen reader)
   - Mitigation: Consider optional focus move for high-priority alerts, but generally avoid stealing focus

3. **Color-only status indicators:**
   - Risk: Connection status shown only by dot color
   - Mitigation: Always include text label or icon with text alternative

4. **Toast auto-dismiss timing:**
   - Risk: Toast disappears before user can read/interact (WCAG 2.2.1)
   - Mitigation: Either no auto-dismiss, or long enough timeout (5+ seconds) with ability to pause/extend

5. **Notification sound without visual:**
   - Risk: Sound notification without visual equivalent
   - Mitigation: Always pair sound with visual notification, provide sound toggle

### Likely Design System Compliance Pitfalls

1. **Custom toast library:**
   - Risk: Developer imports `react-hot-toast` or similar instead of using shadcn Toast primitive
   - Prevention: Explicitly document Toast primitive usage, code review check

2. **Hardcoded colors:**
   - Risk: Using hex colors for notification status instead of theme tokens
   - Prevention: Document exact Tailwind classes for each notification type

3. **Inconsistent animation:**
   - Risk: Custom animation not matching LEGO-inspired theme
   - Prevention: Use Framer Motion with documented presets, review animations

4. **Z-index conflicts:**
   - Risk: Toast appears behind modals or other overlays
   - Prevention: Document z-index layering strategy, use consistent Tailwind z-index utilities

5. **Mobile responsiveness:**
   - Risk: Notification toast too large on mobile, covers content
   - Prevention: Test on mobile viewport, use responsive sizing (max-width, padding)

6. **Loading states not designed:**
   - Risk: No UI for "connecting" or "reconnecting" state beyond status indicator
   - Prevention: Design skeleton/shimmer for dashboard during initial connection

---

## Additional Recommendations

1. **Consider notification persistence:**
   - Should notifications persist across page refreshes?
   - If yes, consider localStorage or backend storage
   - Document decision in story

2. **Rate limiting UI feedback:**
   - If many notifications arrive quickly, should they queue or consolidate?
   - Recommend: Show "3 new updates" consolidated notification instead of 3 separate toasts

3. **User preferences:**
   - Consider notification settings (enable/disable types, sound on/off)
   - Could be future enhancement but should design with extensibility in mind

4. **Offline UX:**
   - What happens to notifications sent while offline?
   - Recommendation: Show "Reconnecting..." message, fetch missed notifications on reconnect
