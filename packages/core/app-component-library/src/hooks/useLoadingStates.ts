import { useState, useCallback, useRef, useEffect } from 'react'

export type LoadingType = 'idle' | 'loading' | 'success' | 'error'

export interface LoadingState {
  type: LoadingType
  message?: string
  progress?: number
  error?: Error | string | null
}

export interface UseLoadingStatesOptions {
  initialType?: LoadingType
  initialMessage?: string
  autoReset?: boolean
  resetDelay?: number
  onStateChange?: (state: LoadingState) => void
}

export interface UseLoadingStatesReturn {
  // State
  loadingState: LoadingState
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  isIdle: boolean

  // Actions
  startLoading: (message?: string) => void
  setProgress: (progress: number) => void
  setSuccess: (message?: string) => void
  setError: (error: Error | string) => void
  reset: () => void

  // Async wrapper
  withLoading: <T>(asyncFn: () => Promise<T>, message?: string) => Promise<T>

  // Multiple loading states
  createLoadingState: (key: string) => {
    startLoading: (message?: string) => void
    setProgress: (progress: number) => void
    setSuccess: (message?: string) => void
    setError: (error: Error | string) => void
    reset: () => void
    state: LoadingState
  }
}

export const useLoadingStates = (options: UseLoadingStatesOptions = {}): UseLoadingStatesReturn => {
  const {
    initialType = 'idle',
    initialMessage,
    autoReset = false,
    resetDelay = 3000,
    onStateChange,
  } = options

  const [loadingState, setLoadingState] = useState<LoadingState>({
    type: initialType,
    message: initialMessage,
    progress: 0,
    error: null,
  })

  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const multipleStatesRef = useRef<Map<string, LoadingState>>(new Map())

  const updateState = useCallback(
    (updates: Partial<LoadingState>) => {
      setLoadingState(prev => {
        const newState = { ...prev, ...updates }
        onStateChange?.(newState)
        return newState
      })
    },
    [onStateChange],
  )

  const clearResetTimeout = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = null
    }
  }, [])

  const startLoading = useCallback(
    (message?: string) => {
      clearResetTimeout()
      updateState({
        type: 'loading',
        message,
        progress: 0,
        error: null,
      })
    },
    [updateState, clearResetTimeout],
  )

  const setProgress = useCallback(
    (progress: number) => {
      updateState({ progress: Math.min(Math.max(progress, 0), 100) })
    },
    [updateState],
  )

  const setSuccess = useCallback(
    (message?: string) => {
      updateState({
        type: 'success',
        message,
        progress: 100,
        error: null,
      })

      if (autoReset) {
        clearResetTimeout()
        resetTimeoutRef.current = setTimeout(() => {
          updateState({ type: 'idle', message: undefined, progress: 0, error: null })
        }, resetDelay)
      }
    },
    [updateState, autoReset, resetDelay, clearResetTimeout],
  )

  const setError = useCallback(
    (error: Error | string) => {
      updateState({
        type: 'error',
        error,
        progress: 0,
      })

      if (autoReset) {
        clearResetTimeout()
        resetTimeoutRef.current = setTimeout(() => {
          updateState({ type: 'idle', message: undefined, progress: 0, error: null })
        }, resetDelay)
      }
    },
    [updateState, autoReset, resetDelay, clearResetTimeout],
  )

  const reset = useCallback(() => {
    clearResetTimeout()
    updateState({
      type: 'idle',
      message: undefined,
      progress: 0,
      error: null,
    })
  }, [updateState, clearResetTimeout])

  const withLoading = useCallback(
    async <T>(asyncFn: () => Promise<T>, message?: string): Promise<T> => {
      try {
        startLoading(message)
        const result = await asyncFn()
        setSuccess()
        return result
      } catch (error) {
        setError(error instanceof Error ? error : String(error))
        throw error
      }
    },
    [startLoading, setSuccess, setError],
  )

  const createLoadingState = useCallback((key: string) => {
    const updateMultipleState = (updates: Partial<LoadingState>) => {
      const currentState = multipleStatesRef.current.get(key) || {
        type: 'idle',
        progress: 0,
        error: null,
      }
      const newState = { ...currentState, ...updates }
      multipleStatesRef.current.set(key, newState)
      // Force re-render by updating the main state
      setLoadingState(prev => ({ ...prev }))
    }

    const getState = (): LoadingState => {
      return (
        multipleStatesRef.current.get(key) || {
          type: 'idle',
          progress: 0,
          error: null,
        }
      )
    }

    return {
      startLoading: (message?: string) => {
        updateMultipleState({
          type: 'loading',
          message,
          progress: 0,
          error: null,
        })
      },
      setProgress: (progress: number) => {
        updateMultipleState({ progress: Math.min(Math.max(progress, 0), 100) })
      },
      setSuccess: (message?: string) => {
        updateMultipleState({
          type: 'success',
          message,
          progress: 100,
          error: null,
        })
      },
      setError: (error: Error | string) => {
        updateMultipleState({
          type: 'error',
          error,
          progress: 0,
        })
      },
      reset: () => {
        updateMultipleState({
          type: 'idle',
          message: undefined,
          progress: 0,
          error: null,
        })
      },
      state: getState(),
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearResetTimeout()
    }
  }, [clearResetTimeout])

  return {
    // State
    loadingState,
    isLoading: loadingState.type === 'loading',
    isSuccess: loadingState.type === 'success',
    isError: loadingState.type === 'error',
    isIdle: loadingState.type === 'idle',

    // Actions
    startLoading,
    setProgress,
    setSuccess,
    setError,
    reset,

    // Async wrapper
    withLoading,

    // Multiple loading states
    createLoadingState,
  }
}

// Hook for managing multiple loading states
export const useMultipleLoadingStates = () => {
  const [states, setStates] = useState<Map<string, LoadingState>>(new Map())

  const updateState = useCallback((key: string, updates: Partial<LoadingState>) => {
    setStates(prev => {
      const newStates = new Map(prev)
      const currentState = newStates.get(key) || {
        type: 'idle',
        progress: 0,
        error: null,
      }
      newStates.set(key, { ...currentState, ...updates })
      return newStates
    })
  }, [])

  const getState = useCallback(
    (key: string): LoadingState => {
      return (
        states.get(key) || {
          type: 'idle',
          progress: 0,
          error: null,
        }
      )
    },
    [states],
  )

  const createLoadingState = useCallback(
    (key: string) => {
      return {
        startLoading: (message?: string) => {
          updateState(key, {
            type: 'loading',
            message,
            progress: 0,
            error: null,
          })
        },
        setProgress: (progress: number) => {
          updateState(key, { progress: Math.min(Math.max(progress, 0), 100) })
        },
        setSuccess: (message?: string) => {
          updateState(key, {
            type: 'success',
            message,
            progress: 100,
            error: null,
          })
        },
        setError: (error: Error | string) => {
          updateState(key, {
            type: 'error',
            error,
            progress: 0,
          })
        },
        reset: () => {
          updateState(key, {
            type: 'idle',
            message: undefined,
            progress: 0,
            error: null,
          })
        },
        get state() {
          return getState(key)
        },
      }
    },
    [updateState, getState],
  )

  return {
    states,
    getState,
    createLoadingState,
  }
}
