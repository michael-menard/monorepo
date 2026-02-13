// Hooks
export { useKeyboardDragAndDrop } from './hooks/useKeyboardDragAndDrop'
export type {
  KeyboardDragState,
  KeyboardDragActions,
  KeyboardDragDropData,
  UseKeyboardDragAndDropOptions,
} from './hooks/useKeyboardDragAndDrop'

// Components
export { default as KeyboardDragDropArea } from './components/KeyboardDragDropArea'
export type { KeyboardDragDropAreaProps } from './components/KeyboardDragDropArea'

// Screen reader announcements (REPA-008)
export { useAnnouncer, Announcer } from './hooks/useAnnouncer'
export type {
  AnnouncementPriority,
  AnnouncerOptions,
  UseAnnouncerReturn,
  AnnouncerProps,
} from './hooks/useAnnouncer'
export { AnnouncementPrioritySchema, AnnouncerOptionsSchema } from './hooks/useAnnouncer'

// Generic accessibility utilities (REPA-015)
export { focusRingClasses } from './utils/focus-styles'
export { keyboardShortcutLabels, getKeyboardShortcutLabel } from './utils/keyboard-labels'
export { ContrastRatioSchema } from './utils/contrast-validation'
