/**
 * Story 3.1.9: Uploader Session Provider
 *
 * Context provider for uploader session state.
 * Combines session persistence and unsaved changes guard.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useUploaderSession, type UseUploaderSessionResult } from '@/hooks/useUploaderSession'
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt'
import { UnsavedChangesDialog } from '@/components/Uploader/UnsavedChangesDialog'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slices/authSlice'

export interface UploaderSessionContextValue extends UseUploaderSessionResult {
  /** Route path this session is for */
  route: string
}

const UploaderSessionContext = createContext<UploaderSessionContextValue | null>(null)

export interface UploaderSessionProviderProps {
  /** Route path for session key (e.g., '/instructions/new') */
  route: string
  /** Children to render */
  children: ReactNode
  /** Callback when session is restored */
  onRestore?: (session: UseUploaderSessionResult['session']) => void
}

/**
 * Provider component for uploader session.
 * Wraps children with session context and unsaved changes guard.
 */
export function UploaderSessionProvider({
  route,
  children,
  onRestore,
}: UploaderSessionProviderProps) {
  const { user } = useAppSelector(selectAuth)

  // Session persistence
  const sessionResult = useUploaderSession({
    route,
    onRestore,
  })

  // Unsaved changes guard
  const { showDialog, confirmStay, confirmLeave } = useUnsavedChangesPrompt({
    isDirty: sessionResult.isDirty,
    route,
    userId: user?.id,
    sessionId: sessionResult.session.anonSessionId,
  })

  const contextValue = useMemo<UploaderSessionContextValue>(
    () => ({
      ...sessionResult,
      route,
    }),
    [sessionResult, route],
  )

  return (
    <UploaderSessionContext.Provider value={contextValue}>
      {children}

      {/* Unsaved changes confirmation dialog */}
      <UnsavedChangesDialog open={showDialog} onStay={confirmStay} onLeave={confirmLeave} />
    </UploaderSessionContext.Provider>
  )
}

/**
 * Hook to access uploader session context.
 * Must be used within UploaderSessionProvider.
 */
export function useUploaderSessionContext(): UploaderSessionContextValue {
  const context = useContext(UploaderSessionContext)

  if (!context) {
    throw new Error('useUploaderSessionContext must be used within UploaderSessionProvider')
  }

  return context
}
