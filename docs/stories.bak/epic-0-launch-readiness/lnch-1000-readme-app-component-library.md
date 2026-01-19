# Story lnch-1000: README for app-component-library Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the @repo/ui package,
**so that** I can quickly understand available components and usage patterns.

## Epic Context

This is **Story 1 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **Critical** - This package is imported everywhere as @repo/ui.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (first story in workstream)

## Related Stories

- lnch-1001: README for logger Package
- lnch-1002: README for accessibility Package
- lnch-1003: README for upload-client Package
- lnch-1004: README for upload-types Package

## Acceptance Criteria

1. README.md exists at `packages/core/app-component-library/README.md`
2. Documents all exported components from shadcn/ui
3. Shows correct import pattern (`import { Button } from '@repo/ui'`)
4. Includes component categories (primitives, layout, form, overlay, navigation, data-display)
5. Links to shadcn/ui documentation for detailed component API
6. Documents any custom components or modifications
7. Includes quick-start example

## Tasks / Subtasks

- [ ] **Task 1: Audit Current Exports** (AC: 2, 4)
  - [ ] Review `packages/core/app-component-library/src/index.ts`
  - [ ] List all exported components by category
  - [ ] Identify any custom components not from shadcn/ui

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/core/app-component-library/README.md`
  - [ ] Add package overview section
  - [ ] Add installation section (workspace dependency)

- [ ] **Task 3: Document Import Pattern** (AC: 3)
  - [ ] Show correct import: `import { Button, Card } from '@repo/ui'`
  - [ ] Show WRONG pattern to avoid: `import { Button } from '@repo/ui/button'`
  - [ ] Explain why barrel import is required

- [ ] **Task 4: List Components by Category** (AC: 4, 6)
  - [ ] Primitives: Button, Badge, Separator, etc.
  - [ ] Layout: Card, Tabs, Accordion, etc.
  - [ ] Form: Input, Select, Checkbox, etc.
  - [ ] Overlay: Dialog, Sheet, Popover, etc.
  - [ ] Navigation: NavigationMenu, Breadcrumb, etc.
  - [ ] Data Display: Table, Avatar, etc.

- [ ] **Task 5: Add External Links** (AC: 5)
  - [ ] Link to shadcn/ui docs: https://ui.shadcn.com/docs/components
  - [ ] Note that component APIs match shadcn/ui

- [ ] **Task 6: Add Quick-Start Example** (AC: 7)
  - [ ] Show simple usage example with 2-3 components
  - [ ] Include import statement

## Dev Notes

### Package Location
- `packages/core/app-component-library/`

### Current Export Structure
The package re-exports shadcn/ui components. Check `src/index.ts` for the full list.

### Import Rule (from CLAUDE.md)
```typescript
// CORRECT
import { Button, Card, Table } from '@repo/ui'

// WRONG - never import from individual paths
import { Button } from '@repo/ui/button'
```

## Testing

### Verification
- README renders correctly in GitHub
- All documented imports work in consuming apps
- No broken links

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
