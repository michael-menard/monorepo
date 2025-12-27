# Story 6.7: Theme Selector

## Status

Approved

## Story

**As a** user,
**I want** to choose my color theme,
**so that** I can use light or dark mode.

## Acceptance Criteria

1. ⬜ ThemeSelector component
2. ⬜ Options: Light, Dark, System
3. ⬜ Visual previews for each
4. ⬜ Updates immediately on change
5. ⬜ Syncs with Redux themeSlice

## Tasks / Subtasks

- [ ] **Task 1: Create Selector**
  - [ ] Radio group or toggle
  - [ ] Icons for each option

- [ ] **Task 2: Theme Logic**
  - [ ] Update themeSlice
  - [ ] Save to API

## Dev Notes

```typescript
const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeSelector({ value }: { value: Theme }) {
  const dispatch = useAppDispatch()
  const [updateSettings] = useUpdateSettingsMutation()

  const handleChange = async (newTheme: Theme) => {
    dispatch(setTheme(newTheme))
    await updateSettings({ appearance: { theme: newTheme } })
  }

  return (
    <div className="space-y-2">
      <Label>Theme</Label>
      <RadioGroup value={value} onValueChange={handleChange} className="flex gap-4">
        {themes.map(({ value: v, label, icon: Icon }) => (
          <div key={v} className="flex items-center space-x-2">
            <RadioGroupItem value={v} id={v} />
            <Label htmlFor={v} className="flex items-center gap-2 cursor-pointer">
              <Icon className="h-4 w-4" />
              {label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
