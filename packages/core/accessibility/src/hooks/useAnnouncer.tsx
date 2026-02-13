/**
 * useAnnouncer Hook
 *
 * Manages a screen reader live region for dynamic announcements.
 * Provides an `announce` function and an `Announcer` component to render.
 *
 * Story REPA-008: Consolidate keyboard navigation hooks
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
export const UseAnnouncerReturnSchema = z.object({
  /** Current announcement message */
  announcement: z.string(),
  /** Current announcement priority */
  priority: AnnouncementPrioritySchema,
  /** Function to trigger a screen reader announcement */
  announce: z.custom<(message: string, priority?: AnnouncementPriority) => void>(),
  /** Clear the current announcement */
  clearAnnouncement: z.custom<() => void>(),
})

export type UseAnnouncerReturn = z.infer<typeof UseAnnouncerReturnSchema>

/**
 * Hook for managing screen reader announcements via aria-live regions
 *
 * @param options - Configuration options
 * @returns Object with announce function and current announcement state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { announcement, priority, announce } = useAnnouncer()
 *
 *   const handleItemAdded = () => {
 *     announce('Item added to wishlist.')
 *   }
 *
 *   return (
 *     <>
 *       <Announcer announcement={announcement} priority={priority} />
 *       <button onClick={handleItemAdded}>Add Item</button>
 *     </>
 *   )
 * }
 * ```
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
export const AnnouncerPropsSchema = z.object({
  /** Current announcement message */
  announcement: z.string(),
  /** Announcement priority level */
  priority: AnnouncementPrioritySchema.optional(),
  /** Optional class name for styling */
  className: z.string().optional(),
})

export type AnnouncerProps = z.infer<typeof AnnouncerPropsSchema>

/**
 * Announcer Component
 *
 * Visually hidden live region that announces messages to screen readers.
 * Should be rendered once near the root of the component tree.
 *
 * @example
 * ```tsx
 * <Announcer
 *   announcement={announcement}
 *   priority={priority}
 * />
 * ```
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
