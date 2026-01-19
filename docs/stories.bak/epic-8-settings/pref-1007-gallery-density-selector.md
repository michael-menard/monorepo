# Story 6.8: Gallery Density Selector

## Status

Approved

## Story

**As a** user,
**I want** to choose gallery density,
**so that** I can fit more or less items.

## Acceptance Criteria

1. ⬜ GalleryDensitySelector component
2. ⬜ Options: Comfortable, Compact
3. ⬜ Visual preview of each
4. ⬜ Saves to settings
5. ⬜ Affects gallery grid

## Tasks / Subtasks

- [ ] **Task 1: Create Selector**
  - [ ] Toggle or radio
  - [ ] Visual indicators

- [ ] **Task 2: Integration**
  - [ ] Save to API
  - [ ] Gallery reads value

## Dev Notes

```typescript
const densities = [
  { value: 'comfortable', label: 'Comfortable', description: 'Larger cards with more spacing' },
  { value: 'compact', label: 'Compact', description: 'Smaller cards, more visible at once' },
]

export function GalleryDensitySelector({ value }: { value: GalleryDensity }) {
  const [updateSettings] = useUpdateSettingsMutation()

  const handleChange = async (newDensity: GalleryDensity) => {
    await updateSettings({ appearance: { galleryDensity: newDensity } })
  }

  return (
    <div className="space-y-2">
      <Label>Gallery Density</Label>
      <RadioGroup value={value} onValueChange={handleChange}>
        {densities.map(({ value: v, label, description }) => (
          <div key={v} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
            <RadioGroupItem value={v} id={`density-${v}`} />
            <div>
              <Label htmlFor={`density-${v}`} className="cursor-pointer">{label}</Label>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
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
