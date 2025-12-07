/**
 * Story 3.1.9: Unsaved Changes Prompt Hook
 *
 * Blocks SPA navigation with custom dialog and browser refresh/close with native prompt.
 * Uses TanStack Router's useBlocker for SPA navigation blocking.
 */

import { useEffect, useCallback, useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { logger } from '@repo/logger'

export interface UseUnsavedChangesPromptOptions {
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Route identifier for logging */
  route?: string
  /** User ID for logging */
  userId?: string
  /** Session ID for logging */
  sessionId?: string
}

export interface UseUnsavedChangesPromptResult {
  /** Whether the confirmation dialog should be shown */
  showDialog: boolean
  /** Call when user confirms they want to stay */
  confirmStay: () => void
  /** Call when user confirms they want to leave */
  confirmLeave: () => void
}

/**
 * Hook to prompt user when navigating away with unsaved changes.
 *
 * Features:
 * - SPA navigation: Shows custom React dialog via TanStack Router useBlocker
 * - Browser refresh/close: Shows native beforeunload prompt
 * - Logs guard blocks for observability
 */
export function useUnsavedChangesPrompt(
  options: UseUnsavedChangesPromptOptions,
): UseUnsavedChangesPromptResult {
  const { isDirty, route, userId, sessionId } = options
  const [showDialog, setShowDialog] = useState(false)

  // TanStack Router navigation blocker
  const blocker = useBlocker({
    condition: isDirty,
  })

  // When blocker is triggered, show our custom dialog
  useEffect(() => {
    if (blocker.status === 'blocked') {
      setShowDialog(true)
      // blocker.next contains the target location when blocked
      const targetPath = blocker.next?.pathname
      logger.warn('Navigation blocked - unsaved changes', {
        route,
        userId,
        sessionId,
        targetPath,
      })
    }
  }, [blocker.status, blocker.next?.pathname, route, userId, sessionId])

  // Handle beforeunload for browser refresh/close
  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (event: Event) => {
      // Standard way to trigger browser prompt
      event.preventDefault()
      // Chrome requires returnValue to be set (cast to BeforeUnloadEvent)
      ;(event as { returnValue: string }).returnValue = ''

      logger.warn('Browser unload blocked - unsaved changes', {
        route,
        userId,
        sessionId,
      })

      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty, route, userId, sessionId])

  // Confirm stay - reset blocker and hide dialog
  const confirmStay = useCallback(() => {
    setShowDialog(false)
    if (blocker.status === 'blocked') {
      blocker.reset()
    }
    logger.info('User chose to stay on page', { route, userId, sessionId })
  }, [blocker, route, userId, sessionId])

  // Confirm leave - proceed with navigation
  const confirmLeave = useCallback(() => {
    setShowDialog(false)
    if (blocker.status === 'blocked') {
      blocker.proceed()
    }
    logger.info('User chose to leave page', { route, userId, sessionId })
  }, [blocker, route, userId, sessionId])

  return {
    showDialog,
    confirmStay,
    confirmLeave,
  }
}
