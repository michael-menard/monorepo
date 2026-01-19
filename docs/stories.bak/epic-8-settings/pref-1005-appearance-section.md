# Story 6.6: Appearance Section

## Status

Approved

## Story

**As a** user,
**I want** an appearance settings section,
**so that** I can customize the look.

## Acceptance Criteria

1. ⬜ AppearanceSection component
2. ⬜ Card with section header
3. ⬜ Contains theme and density settings
4. ⬜ Visual dividers between options
5. ⬜ Descriptive labels

## Tasks / Subtasks

- [ ] **Task 1: Create Section**
  - [ ] Create AppearanceSection.tsx
  - [ ] Card layout

- [ ] **Task 2: Section Content**
  - [ ] Theme selector slot
  - [ ] Density selector slot

## Dev Notes

```typescript
interface AppearanceSectionProps {
  settings: AppearanceSettings
}

export function AppearanceSection({ settings }: AppearanceSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance
        </CardTitle>
        <CardDescription>
          Customize how the app looks and feels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ThemeSelector value={settings.theme} />
        <Separator />
        <GalleryDensitySelector value={settings.galleryDensity} />
      </CardContent>
    </Card>
  )
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
