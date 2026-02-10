/**
 * useBackgroundCompression Hook
 *
 * Background image compression with progress tracking and stale result detection.
 * Story WISH-2049: Background Compression Hook
 */

import { useState, useRef, useCallback } from 'react'
import { compressImage } from '../utils/imageCompression'
import type { CompressionConfig, CompressionResult } from '../utils/imageCompression'
import type { BackgroundCompressionState } from './__types__/index'

/**
 * Initial state for background compression
 */
const INITIAL_STATE: BackgroundCompressionState = {
  status: 'idle',
  originalFile: null,
  compressedFile: null,
  compressionResult: null,
  progress: 0,
  error: null,
  requestId: null,
}

/**
 * Hook for background image compression with stale result detection
 *
 * Features:
 * - Async compression with progress tracking
 * - Stale result detection via requestId (AC15)
 * - Cancel/reset functionality
 * - Error handling
 *
 * @returns Object with state and control functions
 *
 * @example
 * ```tsx
 * const { state, startCompression, cancel, reset } = useBackgroundCompression()
 *
 * // Start compression
 * startCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 })
 *
 * // Cancel in-progress compression
 * cancel()
 *
 * // Reset to idle state
 * reset()
 * ```
 */
export function useBackgroundCompression() {
  const [state, setState] = useState<BackgroundCompressionState>(INITIAL_STATE)
  const requestIdRef = useRef<string | null>(null)

  /**
   * Start background compression for a file
   * WISH-2049 AC15: Uses requestId for stale result detection
   */
  const startCompression = useCallback(async (file: File, config: CompressionConfig) => {
    // Generate unique request ID for this compression operation
    const newRequestId = `${Date.now()}-${Math.random()}`
    requestIdRef.current = newRequestId

    // Reset state and set to compressing
    setState({
      status: 'compressing',
      originalFile: file,
      compressedFile: null,
      compressionResult: null,
      progress: 0,
      error: null,
      requestId: newRequestId,
    })

    try {
      // Perform compression with progress callback
      const result: CompressionResult = await compressImage(file, {
        config,
        onProgress: (progress: number) => {
          // Check for stale request before updating progress
          if (requestIdRef.current === newRequestId) {
            setState(prev => ({
              ...prev,
              progress,
            }))
          }
        },
      })

      // Check for stale request before updating with result
      if (requestIdRef.current !== newRequestId) {
        // Stale result - silently return without updating state
        return
      }

      // Check if compression failed
      if (result.error) {
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: result.error || 'Compression failed',
          progress: 0,
        }))
        return
      }

      // Compression succeeded
      setState(prev => ({
        ...prev,
        status: 'complete',
        compressedFile: result.file,
        compressionResult: result,
        progress: 100,
        error: null,
      }))
    } catch (error) {
      // Check for stale request before updating with error
      if (requestIdRef.current !== newRequestId) {
        // Stale result - silently return
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown compression error'

      setState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
        progress: 0,
      }))
    }
  }, [])

  /**
   * Cancel in-progress compression
   * WISH-2049 AC15: Invalidates current requestId to ignore future updates
   */
  const cancel = useCallback(() => {
    // Set requestId to null to invalidate any in-progress compression
    requestIdRef.current = null
    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
    }))
  }, [])

  /**
   * Reset hook to initial idle state
   */
  const reset = useCallback(() => {
    // Cancel any in-progress compression
    requestIdRef.current = null
    setState(INITIAL_STATE)
  }, [])

  return {
    state,
    startCompression,
    cancel,
    reset,
  }
}
