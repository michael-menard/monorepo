/**
 * Story 3.1.9: Uploader Session Hook
 * Story REPA-003: Migrate Upload Hooks to @repo/upload
 *
 * Persists uploader state to localStorage with debounced writes.
 * Restores on mount and shows toast notification.
 *
 * Features:
 * - Supports both authenticated and anonymous sessions via dependency injection
 * - Debounced localStorage writes (300ms)
 * - Session restoration with 24-hour TTL
 * - Anonymous → authenticated session migration
 * - Toast notifications for session restoration
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
} from '../types'

/** Debounce delay for localStorage writes (ms) */
const DEBOUNCE_MS = 300

/** Session expiry time (24 hours) */
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000

export interface UseUploaderSessionOptions {
  /** Route path for storage key (e.g., '/instructions/new') */
  route: string
  /** Whether user is authenticated (default: false for anonymous mode) */
  isAuthenticated?: boolean
  /** User ID for authenticated sessions (undefined for anonymous) */
  userId?: string
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
  /** Clear session from storage without finalize semantics (e.g. user cancels) */
  clear: () => void
  /** Clear session from storage (on finalize success) */
  markFinalized: () => void
}

export function useUploaderSession(options: UseUploaderSessionOptions): UseUploaderSessionResult {
  const { route, isAuthenticated = false, userId, onRestore } = options
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

  // Storage key based on user/route
  const storageKey = useMemo(() => {
    const effectiveUserId = isAuthenticated ? userId : undefined
    const anonId = isAuthenticated ? undefined : getAnonSessionId()
    return getStorageKey(route, effectiveUserId, anonId)
  }, [route, isAuthenticated, userId, getAnonSessionId])

  // Session state
  const [session, setSession] = useState<UploaderSession>(createEmptySession)
  const [isDirty, setIsDirty] = useState(false)
  const [wasRestored, setWasRestored] = useState(false)

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track whether a save is pending (set by mutations, consumed by effect)
  const pendingSaveRef = useRef(false)

  // Debounced save effect - runs after React commits state changes
  useEffect(() => {
    if (!pendingSaveRef.current) return
    pendingSaveRef.current = false

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, serializeSession(session))
        logger.info('Uploader session saved', {
          route,
          userId,
          sessionId: session.anonSessionId,
        })
      } catch (error) {
        logger.warn('Failed to save uploader session', { error, route })
      }
    }, DEBOUNCE_MS)
  }, [session, storageKey, route, userId])

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const primaryStored = localStorage.getItem(storageKey)
      let parsed = parseSession(primaryStored)

      // If no user-specific session exists but user is authenticated, attempt
      // to restore from previous anonymous session key and then re-key.
      let restoredFromAnon = false
      let anonStorageKey: string | null = null

      if (!parsed && isAuthenticated) {
        try {
          const anonId = getAnonSessionId()
          anonStorageKey = getStorageKey(route, undefined, anonId)
          const anonStored = localStorage.getItem(anonStorageKey)
          const anonParsed = parseSession(anonStored)
          if (anonParsed) {
            parsed = anonParsed
            restoredFromAnon = true
          }
        } catch {
          // Ignore anon fallback errors and continue without restoration
        }
      }

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

        // Check user mismatch (different user shouldn't restore)
        if (isAuthenticated && parsed.anonSessionId && !userId) {
          // Anon session but now authenticated - could migrate or ignore
          // For safety, ignore and start fresh
          logger.info('Ignoring anonymous session for authenticated user', { route })
          return
        }

        setSession(migrated)
        setWasRestored(true)
        setIsDirty(true)

        // If we restored from an anonymous key, clean it up now that the
        // session is associated with a user-specific key.
        if (restoredFromAnon && anonStorageKey && anonStorageKey !== storageKey) {
          try {
            localStorage.removeItem(anonStorageKey)
          } catch {
            // Non-fatal if cleanup fails
          }
        }

        logger.info('Uploader session restored', {
          route,
          userId,
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
  const updateSession = useCallback((updates: Partial<UploaderSession>) => {
    setSession(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
    pendingSaveRef.current = true
  }, [])

  // Update a single file's metadata
  const updateFile = useCallback((index: number, updates: Partial<FileMetadata>) => {
    setSession(prev => {
      const files = [...prev.files]
      if (files[index]) {
        files[index] = { ...files[index], ...updates }
      }
      return { ...prev, files }
    })
    setIsDirty(true)
    pendingSaveRef.current = true
  }, [])

  // Add files to session
  const addFiles = useCallback((newFiles: FileMetadata[]) => {
    setSession(prev => ({ ...prev, files: [...prev.files, ...newFiles] }))
    setIsDirty(true)
    pendingSaveRef.current = true
  }, [])

  // Remove a file from session
  const removeFile = useCallback((index: number) => {
    setSession(prev => {
      const files = prev.files.filter((_, i) => i !== index)
      return { ...prev, files }
    })
    setIsDirty(true)
    pendingSaveRef.current = true
  }, [])

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
      logger.info('Uploader session reset', { route, userId })
    } catch (error) {
      logger.warn('Failed to clear uploader session', { error, route })
    }
  }, [storageKey, route, userId])

  // Clear without finalize semantics (alias for reset for now)
  const clear = useCallback(() => {
    reset()
  }, [reset])

  // Mark as finalized (clear from storage)
  const markFinalized = useCallback(() => {
    reset()
    logger.info('Uploader session finalized', { route, userId })
  }, [reset, route, userId])

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
    clear,
    markFinalized,
  }
}
