/**
 * useAnnouncer Hook
 *
 * Manages a screen reader live region for dynamic announcements.
 * Provides an `announce` function and an `Announcer` component to render.
 *
 * INSP-019: Keyboard Navigation & A11y
 *
 * @see https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { z } from 'zod'

/**
 * Priority levels for announcements
 */
export const AnnouncementPrioritySchema = z.enum(['polite', 'assertive'])
export type AnnouncementPriority = z.infer<typeof AnnouncementPrioritySchema>

/**
 * Configuration for the useAnnouncer hook
 */
export const AnnouncerOptionsSchema = z.object({
  /** Delay before clearing the announcement (ms) - allows same message to be announced again */
  clearDelay: z.number().optional().default(100),
  /** Default priority for announcements */
  defaultPriority: AnnouncementPrioritySchema.optional().default('polite'),
})

export type AnnouncerOptions = z.infer<typeof AnnouncerOptionsSchema>

/**
 * Return type for useAnnouncer hook
 */
export interface UseAnnouncerReturn {
  /** Current announcement message */
  announcement: string
  /** Current announcement priority */
  priority: AnnouncementPriority
  /** Function to trigger a screen reader announcement */
  announce: (message: string, priority?: AnnouncementPriority) => void
  /** Clear the current announcement */
  clearAnnouncement: () => void
}

/**
 * Hook for managing screen reader announcements via aria-live regions
 *
 * @param options - Configuration options
 * @returns Object with announce function and current announcement state
 */
export function useAnnouncer(options: Partial<AnnouncerOptions> = {}): UseAnnouncerReturn {
  const { clearDelay = 100, defaultPriority = 'polite' } = options

  const [announcement, setAnnouncement] = useState('')
  const [priority, setPriority] = useState<AnnouncementPriority>(defaultPriority)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  /**
   * Announce a message to screen readers
   *
   * @param message - The message to announce
   * @param messagePriority - 'polite' (default) or 'assertive' for urgent messages
   */
  const announce = useCallback(
    (message: string, messagePriority: AnnouncementPriority = defaultPriority) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Clear first to allow re-announcing the same message
      setAnnouncement('')
      setPriority(messagePriority)

      // Use RAF to ensure the clear is processed before setting new message
      window.requestAnimationFrame(() => {
        setAnnouncement(message)

        // Clear after delay to allow the same message to be announced again
        timeoutRef.current = setTimeout(() => {
          setAnnouncement('')
        }, clearDelay)
      })
    },
    [clearDelay, defaultPriority],
  )

  /**
   * Clear the current announcement immediately
   */
  const clearAnnouncement = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setAnnouncement('')
  }, [])

  return {
    announcement,
    priority,
    announce,
    clearAnnouncement,
  }
}

/**
 * Props for the Announcer component
 */
export interface AnnouncerProps {
  /** Current announcement message */
  announcement: string
  /** Announcement priority level */
  priority?: AnnouncementPriority
  /** Optional class name for styling */
  className?: string
}

/**
 * Announcer Component
 *
 * Visually hidden live region that announces messages to screen readers.
 * Should be rendered once near the root of the component tree.
 */
export function Announcer({
  announcement,
  priority = 'polite',
  className,
}: AnnouncerProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={className ?? 'sr-only'}
      data-testid="screen-reader-announcer"
    >
      {announcement}
    </div>
  )
}

export default useAnnouncer
