# Accessibility Requirements

## Compliance Target

**Standard:** WCAG 2.1 AA compliance with progressive enhancement toward AAA where feasible

## Key Requirements

**Visual:**

- Color contrast ratios: 4.5:1 for normal text, 3:1 for large text, 3:1 for UI components
- Focus indicators: 2px solid outline with high contrast color, visible on all interactive elements
- Text sizing: Minimum 16px for body text, scalable up to 200% without horizontal scrolling

**Interaction:**

- Keyboard navigation: All functionality accessible via keyboard with logical tab order
- Screen reader support: Proper semantic HTML, ARIA labels, and descriptive text for all content
- Touch targets: Minimum 44px x 44px for all interactive elements on mobile devices

**Content:**

- Alternative text: Descriptive alt text for all images, especially MOC photos and instruction diagrams
- Heading structure: Logical heading hierarchy (h1-h6) for proper document outline
- Form labels: Clear, descriptive labels for all form inputs with error message association

## Testing Strategy

Automated testing with axe-core integrated into development workflow, manual testing with screen readers (NVDA, JAWS, VoiceOver), keyboard-only navigation testing, and color contrast validation for all design elements.
