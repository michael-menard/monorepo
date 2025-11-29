# Story 6.10: Display Name Editor

## Status

Approved

## Story

**As a** user,
**I want** to edit my display name,
**so that** I can personalize my profile.

## Acceptance Criteria

1. ⬜ DisplayNameEditor component
2. ⬜ Shows current name
3. ⬜ Inline edit mode
4. ⬜ Validates min/max length
5. ⬜ Save/Cancel buttons

## Tasks / Subtasks

- [ ] **Task 1: Create Component**
  - [ ] Create DisplayNameEditor.tsx
  - [ ] View and edit modes

- [ ] **Task 2: Save Logic**
  - [ ] Validation
  - [ ] API call

## Dev Notes

```typescript
export function DisplayNameEditor({ value }: { value: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(value)
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation()

  const handleSave = async () => {
    if (name.length < 2 || name.length > 50) {
      toast.error('Name must be 2-50 characters')
      return
    }
    try {
      await updateSettings({ account: { displayName: name } }).unwrap()
      toast.success('Display name updated')
      setIsEditing(false)
    } catch {
      toast.error('Failed to update name')
    }
  }

  return (
    <div className="space-y-2">
      <Label>Display Name</Label>
      {isEditing ? (
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          <Button onClick={handleSave} disabled={isLoading}>Save</Button>
          <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-lg">{value}</span>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
