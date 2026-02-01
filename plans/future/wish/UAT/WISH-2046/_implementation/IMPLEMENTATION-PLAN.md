# Implementation Plan - WISH-2046

## Overview

Add user-selectable compression quality presets to extend the existing WISH-2022 compression feature. This is a frontend-only story with no backend changes.

## Chunk 1: Preset Definitions and Types

**Files:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

**Changes:**

1. Add Zod schema for compression presets:
```typescript
export const CompressionPresetSchema = z.object({
  name: z.enum(['low-bandwidth', 'balanced', 'high-quality']),
  label: z.string(),
  description: z.string(),
  settings: CompressionConfigSchema,
  estimatedSize: z.string(),
})

export type CompressionPreset = z.infer<typeof CompressionPresetSchema>
```

2. Define the three presets as a constant array:
```typescript
export const COMPRESSION_PRESETS: CompressionPreset[] = [
  {
    name: 'low-bandwidth',
    label: 'Low bandwidth',
    description: 'Smallest file size, fastest upload',
    settings: { maxSizeMB: 0.5, maxWidthOrHeight: 1200, initialQuality: 0.6, useWebWorker: true, fileType: 'image/jpeg' },
    estimatedSize: '~300KB'
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Good quality, reasonable file size (recommended)',
    settings: { maxSizeMB: 1, maxWidthOrHeight: 1920, initialQuality: 0.8, useWebWorker: true, fileType: 'image/jpeg' },
    estimatedSize: '~800KB'
  },
  {
    name: 'high-quality',
    label: 'High quality',
    description: 'Best quality, larger file size',
    settings: { maxSizeMB: 2, maxWidthOrHeight: 2400, initialQuality: 0.9, useWebWorker: true, fileType: 'image/jpeg' },
    estimatedSize: '~1.5MB'
  }
]
```

3. Add helper function to get preset by name:
```typescript
export function getPresetByName(name: CompressionPreset['name']): CompressionPreset {
  return COMPRESSION_PRESETS.find(p => p.name === name) ?? COMPRESSION_PRESETS[1] // Default to balanced
}
```

4. Update DEFAULT_COMPRESSION_CONFIG to reference balanced preset settings

**Validation:**
- `pnpm check-types` passes
- Unit tests for preset lookup and default behavior

## Chunk 2: Update useS3Upload Hook

**Files:**
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`

**Changes:**

1. Update UploadOptions to accept preset name instead of skipCompression:
```typescript
export interface UploadOptions {
  /**
   * Compression preset to use. Defaults to 'balanced'.
   * Set to null to skip compression entirely.
   */
  preset?: CompressionPreset['name'] | null
}
```

2. Update upload function to use preset settings:
```typescript
// Replace skipCompression logic:
if (options.preset !== null) {
  setState('compressing')
  const presetConfig = getPresetByName(options.preset ?? 'balanced')
  const result = await compressImage(file, {
    config: presetConfig.settings,
    onProgress: setCompressionProgress,
  })
  // ... rest of compression logic
}
```

3. Add presetUsed to result state for toast notifications

**Validation:**
- `pnpm check-types` passes
- Update existing useS3Upload tests

## Chunk 3: Preset Selector UI Component

**Files:**
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`

**Changes:**

1. Replace highQualityMode checkbox with preset selector using RadioGroup:
```typescript
import { RadioGroup, RadioGroupItem } from '@repo/app-component-library'
```

2. Update localStorage key and default:
```typescript
const COMPRESSION_PRESET_KEY = 'wishlist:preferences:compressionPreset'
const [selectedPreset, setSelectedPreset] = useLocalStorage<CompressionPreset['name']>(
  COMPRESSION_PRESET_KEY,
  'balanced'
)
```

3. Add "Skip compression" checkbox that sets preset to null

4. Update handleFileSelect to pass preset:
```typescript
await upload(file, { preset: skipCompression ? null : selectedPreset })
```

5. Add preset selector UI below image upload:
```tsx
<div className="space-y-2 mt-3">
  <Label className="text-sm">Compression Quality</Label>
  <RadioGroup
    value={selectedPreset}
    onValueChange={(value) => setSelectedPreset(value as CompressionPreset['name'])}
    disabled={isDisabled || skipCompression}
    className="space-y-2"
  >
    {COMPRESSION_PRESETS.map((preset) => (
      <div key={preset.name} className="flex items-center space-x-3">
        <RadioGroupItem value={preset.name} id={preset.name} />
        <Label htmlFor={preset.name} className="flex-1 cursor-pointer">
          <span className="font-medium">{preset.label}</span>
          {preset.name === 'balanced' && (
            <span className="ml-2 text-xs text-primary">(recommended)</span>
          )}
          <span className="block text-xs text-muted-foreground">
            {preset.description} ({preset.estimatedSize})
          </span>
        </Label>
      </div>
    ))}
  </RadioGroup>
</div>
```

6. Update toast notification to include preset name:
```typescript
toast.success(
  `Image compressed with ${presetLabel}: ${formatFileSize(originalSize)} -> ${formatFileSize(finalSize)}`
)
```

**Validation:**
- `pnpm check-types` passes
- Visual verification of UI
- Radio buttons work correctly

## Chunk 4: Unit Tests

**Files:**
- `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

**Test Cases:**

1. imageCompression.test.ts additions:
   - Test COMPRESSION_PRESETS array has 3 presets
   - Test getPresetByName returns correct preset
   - Test getPresetByName returns balanced for invalid name
   - Test low-bandwidth preset settings (0.6 quality, 1200px)
   - Test balanced preset settings (0.8 quality, 1920px)
   - Test high-quality preset settings (0.9 quality, 2400px)

2. useS3Upload.test.ts updates:
   - Test upload with preset: 'low-bandwidth'
   - Test upload with preset: 'balanced'
   - Test upload with preset: 'high-quality'
   - Test upload with preset: null (skip compression)
   - Test default preset is 'balanced' when not specified

**Validation:**
- `pnpm test` passes for affected files

## Chunk 5: Playwright E2E Tests

**Files:**
- `apps/web/playwright/tests/wishlist-compression-presets.spec.ts`

**Test Cases:**

1. Default preset selection:
   - Open add item form
   - Verify "Balanced" preset is selected by default
   - Verify "(recommended)" badge is shown

2. Preset selection and persistence:
   - Select "Low bandwidth" preset
   - Upload an image
   - Navigate away and return
   - Verify "Low bandwidth" is still selected

3. Skip compression checkbox:
   - Check "Skip compression" checkbox
   - Verify preset selector is disabled
   - Upload image (verify no compression occurs)
   - Uncheck checkbox
   - Verify preset selector is enabled again

4. Toast notification with preset name:
   - Select "High quality" preset
   - Upload a large image
   - Verify toast shows "Image compressed with High quality: X MB -> Y MB"

**Validation:**
- `pnpm playwright test wishlist-compression-presets` passes

## Edge Cases and Fallbacks

1. **Invalid localStorage value**: If stored preset name is invalid, fall back to 'balanced'
2. **High quality produces large files**: Acceptable per story requirements (user made explicit choice)
3. **Already small images**: Continue using existing SKIP_COMPRESSION_SIZE_THRESHOLD logic
4. **Compression failure**: Show preset name in error for debugging context

## Implementation Order

1. Chunk 1: Preset definitions (foundation)
2. Chunk 2: useS3Upload updates (integrates presets)
3. Chunk 3: UI component (uses hook changes)
4. Chunk 4: Unit tests (validates chunks 1-3)
5. Chunk 5: E2E tests (validates full flow)

## Risk Mitigation

- **UI clutter**: Radio buttons are compact; collapsed by default if needed
- **Migration**: Old localStorage key (highQualityMode) will be ignored; users get fresh default
- **Type safety**: Zod schemas ensure preset names are valid at runtime
