/**
 * Story 3.1.17: Live Announcements Hook
 *
 * Provides a live region for screen reader announcements.
 * Useful for announcing file add/remove events in upload components.
 */

import { useState, useCallback, useEffect, useRef } from 'react'

export interface UseLiveAnnouncementsOptions {
  /** Politeness level for announcements (default: 'polite') */
  politeness?: 'polite' | 'assertive'
  /** Delay before clearing announcement in ms (default: 5000) */
  clearDelay?: number
}

export interface UseLiveAnnouncementsReturn {
  /** Current announcement message */
  announcement: string
  /** Announce a message to screen readers */
  announce: (message: string) => void
  /** Clear the current announcement */
  clear: () => void
  /** Props to spread on the live region element */
  getLiveRegionProps: () => {
    role: 'status' | 'alert'
    'aria-live': 'polite' | 'assertive'
    'aria-atomic': boolean
    className: string
    children: string
  }
}

/**
 * Hook for managing screen reader announcements via ARIA live regions.
 *
 * @example
 * ```tsx
 * function UploadComponent() {
 *   const { announce, getLiveRegionProps } = useLiveAnnouncements()
 *
 *   const handleFilesAdded = (count: number) => {
 *     announce(`${count} file${count === 1 ? '' : 's'} added`)
 *   }
 *
 *   const handleFileRemoved = (fileName: string) => {
 *     announce(`${fileName} removed`)
 *   }
 *
 *   return (
 *     <div>
 *       <DropZone onFilesAdded={handleFilesAdded} />
 *       <div {...getLiveRegionProps()} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useLiveAnnouncements(
  options: UseLiveAnnouncementsOptions = {},
): UseLiveAnnouncementsReturn {
  const { politeness = 'polite', clearDelay = 5000 } = options

  const [announcement, setAnnouncement] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const announce = useCallback(
    (message: string) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set the new announcement
      setAnnouncement(message)

      // Auto-clear after delay
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('')
      }, clearDelay)
    },
    [clearDelay],
  )

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setAnnouncement('')
  }, [])

  const getLiveRegionProps = useCallback(
    () => ({
      role: (politeness === 'assertive' ? 'alert' : 'status') as 'status' | 'alert',
      'aria-live': politeness,
      'aria-atomic': true,
      // Visually hidden but accessible to screen readers
      className: 'sr-only',
      children: announcement,
    }),
    [politeness, announcement],
  )

  return {
    announcement,
    announce,
    clear,
    getLiveRegionProps,
  }
}

/**
 * Pre-built announcement messages for common upload events
 */
export const uploadAnnouncements = {
  filesAdded: (count: number): string => (count === 1 ? '1 file added' : `${count} files added`),

  fileRemoved: (fileName: string): string => `${fileName} removed`,

  uploadStarted: (count: number): string =>
    count === 1 ? 'Upload started' : `${count} uploads started`,

  uploadComplete: (fileName: string): string => `${fileName} upload complete`,

  uploadFailed: (fileName: string): string => `${fileName} upload failed`,

  allUploadsComplete: (count: number): string =>
    count === 1 ? 'Upload complete' : `All ${count} uploads complete`,

  allUploadsFailed: (count: number): string =>
    count === 1 ? 'Upload failed' : `All ${count} uploads failed`,
}
