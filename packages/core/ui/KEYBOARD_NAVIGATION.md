# Keyboard Navigation Implementation

This document describes the comprehensive keyboard navigation implementation for all interactive elements in the UI package.

## Overview

The keyboard navigation system provides:

- **Focus Management**: Proper focus trapping, restoration, and cycling
- **Keyboard Shortcuts**: Standard keyboard interactions for all components
- **Accessibility**: ARIA attributes and screen reader support
- **Testing**: Comprehensive test coverage for all keyboard interactions

## Core Utilities

### Keyboard Navigation Library (`lib/keyboard-navigation.ts`)

#### Constants

```typescript
KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
}

KEYBOARD_SHORTCUTS = {
  NEXT_ITEM: [KEYBOARD_KEYS.ARROW_DOWN, KEYBOARD_KEYS.ARROW_RIGHT],
  PREV_ITEM: [KEYBOARD_KEYS.ARROW_UP, KEYBOARD_KEYS.ARROW_LEFT],
  FIRST_ITEM: [KEYBOARD_KEYS.HOME],
  LAST_ITEM: [KEYBOARD_KEYS.END],
  SELECT_ITEM: [KEYBOARD_KEYS.ENTER, KEYBOARD_KEYS.SPACE],
  CLOSE: [KEYBOARD_KEYS.ESCAPE],
  TOGGLE: [KEYBOARD_KEYS.ENTER, KEYBOARD_KEYS.SPACE],
}
```

#### Focus Management Hooks

##### `useFocusTrap(isActive: boolean)`

Traps focus within a container (e.g., modal dialogs).

```typescript
const { containerRef, focusFirstElement, focusNextElement, focusPreviousElement } =
  useFocusTrap(true)
```

**Features:**

- Prevents focus from escaping the container
- Cycles focus through focusable elements
- Automatically focuses first element when activated

##### `useFocusRestoration()`

Saves and restores focus when components mount/unmount.

```typescript
const { saveFocus, restoreFocus } = useFocusRestoration()
```

**Features:**

- Saves current focus before opening modals
- Restores focus when modals close
- Prevents focus loss during component transitions

#### ARIA Utilities

##### `getAriaAttributes(options)`

Generates appropriate ARIA attributes for components.

```typescript
const ariaAttributes = getAriaAttributes({
  expanded: true,
  selected: false,
  disabled: false,
  pressed: true,
  current: false,
  describedBy: 'description-id',
  controls: 'controlled-element-id',
  owns: 'owned-element-id',
})
```

#### Live Region Utilities

##### `useLiveRegion()`

Provides screen reader announcements.

```typescript
const { announce } = useLiveRegion()
announce('Dialog opened', 'polite')
```

## Component Enhancements

### Button Component

**Keyboard Support:**

- `Enter` - Activates button
- `Space` - Activates button

**ARIA Attributes:**

- `aria-pressed` - For toggle buttons
- `aria-disabled` - For disabled buttons

**Usage:**

```typescript
<Button
  pressed={isPressed}
  disabled={isDisabled}
  onClick={handleClick}
>
  Toggle Button
</Button>
```

### Dialog Component

**Keyboard Support:**

- `Escape` - Closes dialog
- `Tab` - Cycles through focusable elements (trapped)
- `Shift+Tab` - Cycles backward through focusable elements

**Focus Management:**

- Automatically traps focus within dialog
- Restores focus to trigger when dialog closes
- Focuses first focusable element when opened

**Usage:**

```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <h2>Dialog Title</h2>
    <Input placeholder="Test input" />
    <Button>Close</Button>
  </DialogContent>
</Dialog>
```

### Select Component

**Keyboard Support:**

- `Enter` / `Space` - Opens/closes select
- `Arrow Down/Up` - Navigates options (handled by Radix)
- `Enter` / `Space` - Selects option
- `Escape` - Closes select

**ARIA Attributes:**

- `aria-expanded` - Indicates if select is open
- `aria-selected` - Indicates selected option

**Usage:**

```typescript
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

## Global Keyboard Navigation

### KeyboardNavigationProvider

Provides global keyboard navigation context to the entire application.

**Setup:**

```typescript
import { KeyboardNavigationProvider } from '@your-org/ui/providers/KeyboardNavigationProvider'

function App() {
  return (
    <KeyboardNavigationProvider>
      <YourApp />
    </KeyboardNavigationProvider>
  )
}
```

### Global Shortcuts

Register global keyboard shortcuts that work throughout the application.

```typescript
import { useGlobalKeyboardShortcut } from '@your-org/ui/providers/KeyboardNavigationProvider'

function MyComponent() {
  useGlobalKeyboardShortcut('Escape', () => {
    // Handle global escape action
  })

  return <div>My Component</div>
}
```

### Screen Reader Announcements

Make announcements to screen readers.

```typescript
import { useScreenReaderAnnouncement } from '@your-org/ui/providers/KeyboardNavigationProvider'

function MyComponent() {
  const announce = useScreenReaderAnnouncement()

  const handleAction = () => {
    // Perform action
    announce('Action completed successfully', 'polite')
  }

  return <button onClick={handleAction}>Perform Action</button>
}
```

## Testing

### Running Keyboard Navigation Tests

```bash
pnpm vitest run keyboard-navigation.test.tsx
```

### Test Coverage

The keyboard navigation tests cover:

1. **Button Component**
   - Enter key activation
   - Space key activation
   - ARIA attributes

2. **Dialog Component**
   - Focus trapping
   - Escape key closing
   - Focus restoration

3. **Select Component**
   - Enter/Space key opening
   - Option selection
   - ARIA attributes

4. **Tabs Component**
   - Arrow key navigation
   - Enter/Space key activation
   - Focus management

5. **Accordion Component**
   - Enter/Space key toggling
   - ARIA attributes

6. **Focus Management**
   - Tab order
   - Disabled element handling

7. **Keyboard Shortcuts**
   - Key handling
   - Default behavior prevention

### Testing Best Practices

1. **Use `userEvent` for keyboard interactions**

   ```typescript
   const user = userEvent.setup()
   await user.keyboard('{Enter}')
   ```

2. **Test focus management**

   ```typescript
   expect(document.activeElement).toBe(expectedElement)
   ```

3. **Test ARIA attributes**

   ```typescript
   expect(element).toHaveAttribute('aria-expanded', 'true')
   ```

4. **Test async behavior**
   ```typescript
   await waitFor(() => {
     expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
   })
   ```

## Accessibility Guidelines

### WCAG 2.1 Compliance

The keyboard navigation implementation follows WCAG 2.1 guidelines:

- **2.1.1 Keyboard**: All functionality is available from a keyboard
- **2.1.2 No Keyboard Trap**: Focus can be moved away from any component
- **2.4.3 Focus Order**: Logical tab order is maintained
- **2.4.7 Focus Visible**: Focus indicators are clearly visible
- **4.1.2 Name, Role, Value**: Proper ARIA attributes are provided

### Screen Reader Support

- **Live Regions**: Dynamic content changes are announced
- **ARIA Labels**: Descriptive labels for interactive elements
- **Focus Indicators**: Clear focus management for screen readers

### Keyboard Shortcuts

Standard keyboard shortcuts are implemented:

- **Navigation**: Arrow keys, Tab, Shift+Tab
- **Activation**: Enter, Space
- **Dismissal**: Escape
- **Selection**: Enter, Space
- **Quick Navigation**: Home, End

## Implementation Notes

### Focus Management

1. **Focus Trapping**: Prevents focus from escaping modal dialogs
2. **Focus Restoration**: Returns focus to the triggering element
3. **Focus Cycling**: Allows navigation through all focusable elements
4. **Disabled Elements**: Automatically excluded from focus order

### Event Handling

1. **Prevent Default**: Prevents default browser behavior for handled keys
2. **Event Propagation**: Proper event bubbling and capturing
3. **Async Handling**: Supports asynchronous operations in event handlers

### Performance Considerations

1. **Event Delegation**: Efficient event handling for multiple elements
2. **Memory Management**: Proper cleanup of event listeners
3. **Rendering Optimization**: Minimal re-renders during keyboard interactions

## Troubleshooting

### Common Issues

1. **Focus not trapped in modal**
   - Ensure `useFocusTrap(true)` is called
   - Check that container ref is properly set

2. **Keyboard events not firing**
   - Verify element has focus
   - Check for event.preventDefault() calls
   - Ensure no conflicting event handlers

3. **ARIA attributes not updating**
   - Check prop values are correct
   - Verify component re-renders on state changes

### Debug Tools

1. **Focus Indicators**: Use browser dev tools to inspect focus
2. **ARIA Inspector**: Check ARIA attributes in accessibility panel
3. **Screen Reader Testing**: Test with NVDA, JAWS, or VoiceOver

## Future Enhancements

1. **Custom Keyboard Shortcuts**: Allow apps to define custom shortcuts
2. **Keyboard Shortcut Display**: Show available shortcuts in UI
3. **Advanced Focus Management**: Support for complex focus scenarios
4. **Internationalization**: Support for different keyboard layouts
