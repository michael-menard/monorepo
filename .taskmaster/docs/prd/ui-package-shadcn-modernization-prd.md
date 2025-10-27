---
id: ui-package-modernization-2025-01
title: UI Package shadcn/ui Modernization & Component Consolidation
owner: Design System Team
area: packages
type: enhancement
risk: medium
created: 2025-01-06
package: @monorepo/ui
---

# UI Package shadcn/ui Modernization & Component Consolidation

## Executive Summary

- **Problem**: The @monorepo/ui package contains custom implementations of components that are now available in shadcn/ui, including a custom loading spinner, potentially outdated component implementations, and inconsistent design patterns that deviate from the established design system
- **Audience**: Frontend developers using UI components, design system maintainers, and end users experiencing inconsistent visual patterns across applications
- **Opportunity**: Modernizing to latest shadcn/ui components will reduce maintenance overhead, improve accessibility, ensure design consistency, and provide better developer experience with standardized APIs
- **Desired Outcome**: A fully modernized UI package using latest shadcn/ui components with improved performance, accessibility, and maintainability

## Goals

- Replace custom loading spinner with shadcn/ui skeleton or spinner components
- Audit all existing components against latest shadcn/ui offerings
- Upgrade outdated shadcn components to latest versions
- Eliminate custom implementations where shadcn equivalents exist
- Improve component accessibility and performance
- Standardize component APIs and design tokens
- Reduce bundle size through better tree-shaking and optimization

## Constraints & Standards (Must-Follow)

- Design system: shadcn/ui latest version, Tailwind v4 tokens
- Types: TypeScript + Zod for all prop validation
- State: Maintain existing state patterns, use RTK Query where applicable
- Testing: Vitest (unit), Playwright (e2e) with ≥90% coverage maintained
- A11y: WCAG 2.2 AA, keyboard nav, axe clean, screen reader support
- Perf: Core Web Vitals budgets, lazy loading, tree-shaking optimization
- Security: no unsafe HTML, sanitized props, secure component patterns

## Acceptance Criteria

- All components use latest shadcn/ui implementations where available
- Custom loading spinner replaced with shadcn skeleton or modern spinner
- Component APIs remain backward compatible or provide migration path
- Bundle size reduced by at least 15% through optimization
- Accessibility compliance maintained or improved across all components
- Storybook stories updated for all modified components
- Migration guide provided for breaking changes
- Design tokens fully aligned with shadcn/ui standards

## Vertical Slices

### Phase A — Compile + Storybook

- Updated shadcn/ui components compile successfully
- All Storybook stories render without errors
- New loading states using shadcn patterns working
- TypeScript errors resolved across all components

### Phase B1 — Unit Tests

- All existing component functionality covered with updated tests
- New component behaviors validated
- Edge cases and error scenarios tested
- Hook functionality validated with new implementations

### Phase B2 — E2E Smoke

- Critical component interactions working end-to-end
- Loading states and transitions validated
- Form components and validation working
- Navigation and dialog components tested

### Phase C — Accessibility

- Axe violations: 0 across all updated components
- Keyboard navigation through all interactive elements
- Screen reader compatibility verified
- High contrast and dark mode support validated

### Phase D — Performance

- Bundle size reduction measured and achieved
- Component render performance optimized
- Tree-shaking effectiveness verified
- Core Web Vitals impact assessed

### Phase E — Security/Hardening

- No unsafe HTML in component rendering
- Props properly sanitized and validated
- Component security patterns enforced
- No XSS vulnerabilities introduced

## Rollout / Risks

- **Breaking Changes Risk**: API changes might break existing consumers
  - **Mitigation**: Maintain backward compatibility layer and provide automated migration scripts
- **Bundle Size Risk**: New shadcn components might increase bundle size
  - **Mitigation**: Implement tree-shaking optimization and component lazy loading
- **Design Inconsistency Risk**: Updates might create visual regressions
  - **Mitigation**: Comprehensive visual regression testing and design system review
- **Migration Complexity Risk**: Large number of consuming applications
  - **Mitigation**: Phased rollout with feature flags and gradual migration

## Appendix

### Current Component Analysis

#### Custom Loading Spinner (packages/ui/src/loading-spinner/)

**Current Implementation:**

- Custom Framer Motion animations
- Three variants: LoadingSpinner, PulseSpinner, DotsSpinner
- CVA (class-variance-authority) for styling variants
- Variants: default, secondary, muted, destructive
- Sizes: sm, default, lg, xl

**Issues:**

- Heavy dependency on Framer Motion for simple animations
- Custom SVG implementation vs shadcn standard patterns
- Potentially unnecessary complexity for basic loading states

**Shadcn/ui Alternatives:**

- **Skeleton component** for content loading states
- **Spinner component** (if available in latest version)
- CSS-only animations reducing JS bundle size

#### Existing shadcn Components in Package

Current components that appear to be shadcn-based:

- accordion, alert-dialog, avatar, badge, button, card, checkbox
- command, dialog, dropdown-menu, form, input, label, progress
- select, sheet, skeleton, switch, table, tabs, textarea
- tooltip, and others

**Assessment Needed:**

- Version currency check against latest shadcn/ui
- API compliance with latest patterns
- Accessibility improvements in newer versions
- Performance optimizations available

### Proposed Modernization Strategy

#### 1. Loading States Modernization

Replace custom loading spinners with:

```tsx
// Current complex implementation
<LoadingSpinner variant="default" size="lg" showText />

// Proposed shadcn-aligned approach
<Skeleton className="h-4 w-[250px]" />
<Spinner size="lg" /> // or CSS-only spinner
```

#### 2. Component Audit & Upgrade Process

1. **Inventory**: List all current components and their shadcn equivalents
2. **Version Check**: Compare current implementations with latest shadcn versions
3. **API Analysis**: Identify breaking changes and migration requirements
4. **Performance Assessment**: Measure bundle size and runtime performance impact
5. **Accessibility Review**: Ensure compliance improvements are captured

#### 3. Migration Phases

- **Phase 1**: Update existing shadcn components to latest versions
- **Phase 2**: Replace custom implementations with shadcn equivalents
- **Phase 3**: Optimize bundle size and performance
- **Phase 4**: Update documentation and migration guides

### Component Priority Matrix

#### High Priority (Replace/Update First)

- Loading Spinner → Skeleton/Spinner
- Form components (if outdated)
- Dialog/Modal components (for latest a11y features)
- Input components (for improved validation)

#### Medium Priority

- Data display components (Table, Card, Badge)
- Navigation components (Menu, Dropdown)
- Feedback components (Alert, Toast)

#### Low Priority

- Layout components (if working well)
- Simple components (Button, if recent)

### Performance Targets

- Bundle size: Reduce by 15% through modern implementations
- First paint: <50ms improvement for loading states
- Runtime performance: 20% faster component renders
- Tree-shaking: 100% unused component code elimination
- Animation performance: 60fps for all transitions

### API Design Philosophy

Maintain backward compatibility while modernizing:

```tsx
// Backward compatible wrapper
export const LoadingSpinner = (props: LegacySpinnerProps) => {
  // Map legacy props to new Skeleton/Spinner implementation
  return <Skeleton {...mappedProps} />
}

// New recommended API
export const Spinner = Skeleton // Re-export shadcn component
export const ContentSkeleton = Skeleton // Semantic naming
```

### Testing Strategy

- **Visual Regression**: Chromatic or similar for design consistency
- **Accessibility**: axe-core automated testing + manual verification
- **Performance**: Bundle analysis and runtime performance monitoring
- **Integration**: Test in consuming applications before release
- **Migration**: Automated tests for migration script effectiveness

### Documentation Requirements

- **Migration Guide**: Step-by-step upgrade instructions
- **API Reference**: Updated component props and usage
- **Design Patterns**: Updated design system guidelines
- **Performance Guide**: Best practices for optimal bundle size
- **Accessibility Guide**: Updated a11y compliance patterns
