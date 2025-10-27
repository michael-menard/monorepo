import { useState, useCallback } from 'react'
import type { UploadProgress } from '../types/index.js'

export interface UseUploadProgressOptions {
  onProgressChange?: (progress: UploadProgress) => void
}

export interface UseUploadProgressReturn {
  progress: UploadProgress
  updateProgress: (loaded: number, total: number) => void
  resetProgress: () => void
}

export const useUploadProgress = (
  options: UseUploadProgressOptions = {},
): UseUploadProgressReturn => {
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  })

  const updateProgress = useCallback(
    (loaded: number, total: number) => {
      const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0
      const newProgress = { loaded, total, percentage }

      setProgress(newProgress)
      options.onProgressChange?.(newProgress)
    },
    [options],
  )

  const resetProgress = useCallback(() => {
    const resetProgress = { loaded: 0, total: 0, percentage: 0 }
    setProgress(resetProgress)
    options.onProgressChange?.(resetProgress)
  }, [options])

  return {
    progress,
    updateProgress,
    resetProgress,
  }
}
