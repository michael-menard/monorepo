/**
 * Story 3.1.9: Uploader Session Hook
 *
 * Persists uploader state to localStorage with debounced writes.
 * Restores on mount and shows toast notification.
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useToast } from '@repo/app-component-library'
import { logger } from '@repo/logger'
import {
  type UploaderSession,
  type FileMetadata,
  type UploaderStep,
  parseSession,
  serializeSession,
  createEmptySession,
  getStorageKey,
  generateAnonSessionId,
  migrateSession,
} from '@repo/upload-types'

/** Debounce delay for localStorage writes (ms) */
const DEBOUNCE_MS = 300

/** Session expiry time (24 hours) */
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000

export interface UseUploaderSessionOptions {
  /** Route path for storage key (e.g., '/instructions/new') */
  route: string
  /** Callback when session is restored */
  onRestore?: (session: UploaderSession) => void
}

export interface UseUploaderSessionResult {
  /** Current session state */
  session: UploaderSession
  /** Whether session has unsaved changes */
  isDirty: boolean
  /** Whether session was restored from storage */
  wasRestored: boolean
  /** Update session fields */
  updateSession: (updates: Partial<UploaderSession>) => void
  /** Update a single file's metadata */
  updateFile: (index: number, updates: Partial<FileMetadata>) => void
  /** Add files to session */
  addFiles: (files: FileMetadata[]) => void
  /** Remove a file from session */
  removeFile: (index: number) => void
  /** Set current step */
  setStep: (step: UploaderStep) => void
  /** Reset session to empty state */
  reset: () => void
  /** Clear session from storage (on finalize success) */
  markFinalized: () => void
}

export function useUploaderSession(options: UseUploaderSessionOptions): UseUploaderSessionResult {
  const { route, onRestore } = options
  const { toast } = useToast()

  // Anonymous session ID for unauthenticated users
  const anonSessionIdRef = useRef<string | null>(null)

  // Get or create anon session ID
  const getAnonSessionId = useCallback(() => {
    if (!anonSessionIdRef.current) {
      const stored = localStorage.getItem('uploader:anonSessionId')
      anonSessionIdRef.current = stored || generateAnonSessionId()
      if (!stored) {
        localStorage.setItem('uploader:anonSessionId', anonSessionIdRef.current)
      }
    }
    return anonSessionIdRef.current
  }, [])

  // Storage key based on route and anonymous session id
  const storageKey = useMemo(() => {
    const anonId = getAnonSessionId()
    return getStorageKey(route, undefined, anonId)
  }, [route, getAnonSessionId])

  // Session state
  const [session, setSession] = useState<UploaderSession>(createEmptySession)
  const [isDirty, setIsDirty] = useState(false)
  const [wasRestored, setWasRestored] = useState(false)

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Save to localStorage with debounce
  const saveToStorage = useCallback(
    (sessionData: UploaderSession) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, serializeSession(sessionData))
          logger.info('Uploader session saved', {
            route,
            sessionId: sessionData.anonSessionId,
          })
        } catch (error) {
          logger.warn('Failed to save uploader session', { error, route })
        }
      }, DEBOUNCE_MS)
    },
    [storageKey, route, user?.id],
  )

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      const parsed = parseSession(stored)

      if (parsed) {
        // Check expiry
        const age = Date.now() - parsed.updatedAt
        if (age > SESSION_EXPIRY_MS) {
          logger.info('Uploader session expired, clearing', { route, age })
          localStorage.removeItem(storageKey)
          return
        }

        // Migrate if needed
        const migrated = migrateSession(parsed)

        setSession(migrated)
        setWasRestored(true)
        setIsDirty(true)

        logger.info('Uploader session restored', {
          route,
          sessionId: migrated.anonSessionId,
        })

        // Show toast (aria-live polite)
        toast({
          title: 'Progress restored',
          description: 'We restored your uploader progress.',
        })

        onRestore?.(migrated)
      }
    } catch (error) {
      logger.warn('Failed to restore uploader session', { error, route })
    }
  }, [storageKey]) // Only run on mount/key change

  // Update session fields
  const updateSession = useCallback(
    (updates: Partial<UploaderSession>) => {
      setSession(prev => {
        const updated = { ...prev, ...updates }
        saveToStorage(updated)
        setIsDirty(true)
        return updated
      })
    },
    [saveToStorage],
  )

  // Update a single file's metadata
  const updateFile = useCallback(
    (index: number, updates: Partial<FileMetadata>) => {
      setSession(prev => {
        const files = [...prev.files]
        if (files[index]) {
          files[index] = { ...files[index], ...updates }
        }
        const updated = { ...prev, files }
        saveToStorage(updated)
        setIsDirty(true)
        return updated
      })
    },
    [saveToStorage],
  )

  // Add files to session
  const addFiles = useCallback(
    (newFiles: FileMetadata[]) => {
      setSession(prev => {
        const updated = { ...prev, files: [...prev.files, ...newFiles] }
        saveToStorage(updated)
        setIsDirty(true)
        return updated
      })
    },
    [saveToStorage],
  )

  // Remove a file from session
  const removeFile = useCallback(
    (index: number) => {
      setSession(prev => {
        const files = prev.files.filter((_, i) => i !== index)
        const updated = { ...prev, files }
        saveToStorage(updated)
        setIsDirty(true)
        return updated
      })
    },
    [saveToStorage],
  )

  // Set current step
  const setStep = useCallback(
    (step: UploaderStep) => {
      updateSession({ step })
    },
    [updateSession],
  )

  // Reset session to empty state
  const reset = useCallback(() => {
    const empty = createEmptySession()
    setSession(empty)
    setIsDirty(false)
    setWasRestored(false)

    try {
      localStorage.removeItem(storageKey)
      logger.info('Uploader session reset', { route })
    } catch (error) {
      logger.warn('Failed to clear uploader session', { error, route })
    }
  }, [storageKey, route, user?.id])

  // Mark as finalized (clear from storage)
  const markFinalized = useCallback(() => {
    reset()
    logger.info('Uploader session finalized', { route })
  }, [reset, route])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    session,
    isDirty,
    wasRestored,
    updateSession,
    updateFile,
    addFiles,
    removeFile,
    setStep,
    reset,
    markFinalized,
  }
}
