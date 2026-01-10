import { ViewModeSchema, type ViewMode } from '../types'

const STORAGE_PREFIX = 'gallery_view_mode_'

export const getViewModeStorageKey = (galleryType: string): string => `${STORAGE_PREFIX}${galleryType}`

export const getViewModeFromStorage = (galleryType: string): ViewMode | null => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null

    const key = getViewModeStorageKey(galleryType)
    const stored = window.localStorage.getItem(key)
    if (!stored) return null

    return ViewModeSchema.parse(stored)
  } catch {
    return null
  }
}

export const saveViewModeToStorage = (galleryType: string, mode: ViewMode): void => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return

    const key = getViewModeStorageKey(galleryType)
    window.localStorage.setItem(key, mode)
  } catch {
    // Swallow storage errors; view mode persistence is non-critical
  }
}
