# Story 6.17: Settings Unit Tests

## Status

Approved

## Story

**As a** developer,
**I want** unit tests for settings components,
**so that** functionality is verified.

## Acceptance Criteria

1. ⬜ Tests for theme selector
2. ⬜ Tests for display name editor
3. ⬜ Tests for avatar upload
4. ⬜ Tests for settings page
5. ⬜ Minimum 45% code coverage

## Tasks / Subtasks

- [ ] **Task 1: Component Tests**
  - [ ] Test theme changes
  - [ ] Test name validation
  - [ ] Test file validation

- [ ] **Task 2: Integration Tests**
  - [ ] Test settings load
  - [ ] Test auto-save

- [ ] **Task 3: Coverage**
  - [ ] Run coverage report
  - [ ] Verify 45% minimum

## Dev Notes

```typescript
describe('ThemeSelector', () => {
  it('renders all theme options', () => {
    render(<ThemeSelector value="light" />)
    expect(screen.getByRole('radio', { name: /light/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /dark/i })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /system/i })).not.toBeChecked()
  })

  it('calls handler on change', async () => {
    render(<ThemeSelector value="light" />)
    await userEvent.click(screen.getByRole('radio', { name: /dark/i }))
    // Verify API called
  })
})

describe('DisplayNameEditor', () => {
  it('validates minimum length', async () => {
    render(<DisplayNameEditor value="Test" />)
    await userEvent.click(screen.getByRole('button'))
    await userEvent.clear(screen.getByRole('textbox'))
    await userEvent.type(screen.getByRole('textbox'), 'A')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/2-50 characters/i)).toBeInTheDocument()
  })
})
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
