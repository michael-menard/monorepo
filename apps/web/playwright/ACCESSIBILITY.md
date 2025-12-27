# Accessibility Testing - Uploader Route

This document defines the accessibility testing strategy for the MOC Instructions Uploader feature.

## WCAG 2.1 Compliance Target

The uploader targets **WCAG 2.1 Level AA** compliance.

## Automated Testing

### axe-core Integration

We use `@axe-core/playwright` for automated accessibility scanning.

```typescript
import AxeBuilder from '@axe-core/playwright'

// Run accessibility scan
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze()

// Fail on critical/serious violations
const violations = results.violations.filter(
  v => v.impact === 'critical' || v.impact === 'serious'
)
expect(violations).toHaveLength(0)
```

### Running A11y Tests

```bash
# Run all accessibility tests
pnpm --filter @repo/playwright test:bdd:uploader:a11y

# Run with detailed report
pnpm --filter @repo/playwright test:bdd:uploader:a11y -- --reporter=html
```

## Manual Testing Checklist

### Keyboard Navigation

- [ ] All interactive elements are focusable
- [ ] Focus order follows logical reading order
- [ ] Focus is visible at all times
- [ ] No keyboard traps
- [ ] Escape closes modals/dropdowns
- [ ] Tab moves forward, Shift+Tab moves backward

### Screen Reader Compatibility

- [ ] Page title is descriptive
- [ ] Headings are properly nested (h1 → h2 → h3)
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced
- [ ] Progress updates are announced
- [ ] Dynamic content uses aria-live regions

### Visual Accessibility

- [ ] Color contrast meets 4.5:1 for text
- [ ] Color contrast meets 3:1 for UI components
- [ ] Information not conveyed by color alone
- [ ] Focus indicators are visible
- [ ] Text can be resized to 200%

### Motor Accessibility

- [ ] Touch targets are at least 44x44px
- [ ] Drag-and-drop has keyboard alternative
- [ ] Time limits can be extended
- [ ] Animations can be disabled

## ARIA Implementation

### Form Fields

```html
<label for="title">Title *</label>
<input
  id="title"
  aria-required="true"
  aria-invalid="false"
  aria-describedby="title-error"
/>
<span id="title-error" role="alert">Title is required</span>
```

### Upload Progress

```html
<div
  role="progressbar"
  aria-valuenow="45"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Upload progress"
>
  45% complete
</div>
```

### Error Announcements

```html
<div role="alert" aria-live="polite">
  Please fix the following errors before continuing.
</div>
```

### Session Restoration

```html
<p role="status" aria-live="polite">
  Your previous progress has been restored.
</p>
```

## Screen Reader Testing

### Recommended Screen Readers

| Platform | Screen Reader | Notes |
|----------|--------------|-------|
| macOS | VoiceOver | Built-in, activate with Cmd+F5 |
| Windows | NVDA | Free, download from nvaccess.org |
| Windows | JAWS | Commercial, industry standard |

### Key VoiceOver Commands

- `VO + Right Arrow`: Move to next element
- `VO + Left Arrow`: Move to previous element
- `VO + Space`: Activate element
- `VO + U`: Open rotor (navigation menu)
- `VO + A`: Read all from current position

## Common Accessibility Issues

### 1. Missing Form Labels

**Wrong:**
```html
<input placeholder="Enter title" />
```

**Correct:**
```html
<label for="title">Title</label>
<input id="title" placeholder="Enter title" />
```

### 2. Non-semantic Buttons

**Wrong:**
```html
<div onclick="submit()">Submit</div>
```

**Correct:**
```html
<button type="submit">Submit</button>
```

### 3. Missing Error Announcements

**Wrong:**
```html
<span class="error">Invalid email</span>
```

**Correct:**
```html
<span role="alert" aria-live="polite">Invalid email</span>
```

## CI Integration

Accessibility tests are part of the smoke suite and run on every PR.

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests (smoke)
  run: pnpm --filter @repo/playwright test:bdd:smoke
```

Failed accessibility tests will block PR merge.

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/4.7)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Related Documents

- [E2E Test Guide](./README.md)
- [Performance Testing](./PERFORMANCE.md)
- [Story 3.1.26](../../docs/stories/3.1.26.e2e-a11y-perf.md)
