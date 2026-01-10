import { useCallback, useEffect, useState } from 'react'
import type { ViewMode } from '../types'
import { getViewModeFromStorage, saveViewModeToStorage } from '../utils/view-mode-storage'

interface UseViewModeOptions {
  /** Optional initial mode before storage/URL resolution; defaults to 'grid' */
  defaultMode?: ViewMode
  /** Optional URL-derived mode, e.g. from useGalleryUrl or route search params */
  urlMode?: ViewMode | null
}

/**
 * Hook for managing gallery view mode with the following precedence:
 * 1) localStorage per galleryType
 * 2) URL-derived mode (if provided via options.urlMode)
 * 3) defaultMode (defaults to 'grid')
 */
export const useViewMode = (
  galleryType: string,
  options: UseViewModeOptions = {},
): [ViewMode, (mode: ViewMode) => void] => {
  const { defaultMode = 'grid', urlMode = null } = options

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = getViewModeFromStorage(galleryType)
    if (stored) return stored
    if (urlMode) return urlMode
    return defaultMode
  })

  // If URL mode changes (e.g. deep link), allow it to influence state when no storage yet
  useEffect(() => {
    const stored = getViewModeFromStorage(galleryType)
    if (!stored && urlMode) {
      setViewModeState(urlMode)
    }
  }, [galleryType, urlMode])

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode)
      saveViewModeToStorage(galleryType, mode)
    },
    [galleryType],
  )

  return [viewMode, setViewMode]
}
