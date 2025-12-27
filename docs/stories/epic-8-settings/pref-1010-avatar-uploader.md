# Story 6.11: Avatar Uploader

## Status

Approved

## Story

**As a** user,
**I want** to upload a profile avatar,
**so that** I can personalize my profile.

## Acceptance Criteria

1. ⬜ AvatarUploader component
2. ⬜ Shows current avatar or default
3. ⬜ Click to upload new
4. ⬜ Accept jpg, png, webp
5. ⬜ Max 2MB size

## Tasks / Subtasks

- [ ] **Task 1: Create Component**
  - [ ] Current avatar display
  - [ ] Upload button

- [ ] **Task 2: Upload Logic**
  - [ ] File validation
  - [ ] API upload

## Dev Notes

```typescript
export function AvatarUploader({ currentAvatar }: { currentAvatar?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadAvatar, { isLoading }] = useUploadAvatarMutation()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be under 2MB')
      return
    }

    try {
      await uploadAvatar(file).unwrap()
      toast.success('Avatar updated')
    } catch {
      toast.error('Failed to upload avatar')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={currentAvatar} />
        <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
      </Avatar>
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isLoading}>
        {isLoading ? 'Uploading...' : 'Change Avatar'}
      </Button>
      <input type="file" ref={inputRef} accept="image/jpeg,image/png,image/webp" onChange={handleFile} hidden />
    </div>
  )
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
