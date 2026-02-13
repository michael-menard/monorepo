/**
 * Inspiration Gallery Hooks
 *
 * Custom hooks for the inspiration gallery module.
 */

// Re-export from shared packages (REPA-008)
export { useAnnouncer, Announcer } from '@repo/accessibility'
export type {
  AnnouncementPriority,
  AnnouncerOptions,
  UseAnnouncerReturn,
} from '@repo/accessibility'

export { useRovingTabIndex } from '@repo/gallery'
export type { RovingTabIndexOptions, UseRovingTabIndexReturn } from '@repo/gallery'

export { useGalleryKeyboard } from '@repo/gallery'
export type { UseGalleryKeyboardOptions, UseGalleryKeyboardReturn } from '@repo/gallery'

// Re-export from @repo/hooks (REPA-014)
export { useMultiSelect } from '@repo/hooks/useMultiSelect'
export type { UseMultiSelectOptions, UseMultiSelectReturn } from '@repo/hooks/useMultiSelect'
