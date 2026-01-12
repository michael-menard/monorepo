import { useCallback, useState } from 'react'
import type { Logger } from '@repo/logger'

const logger: Pick<Logger, 'warn'> = (globalThis as any).logger ?? console

const HINT_STORAGE_KEY = 'gallery_tooltip_dismissed'

const canUseLocalStorage = (): boolean => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return false
    const testKey = '__gallery_hint_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

export const useFirstTimeHint = (): [boolean, () => void] => {
  const [showHint, setShowHint] = useState<boolean>(() => {
    try {
      if (!canUseLocalStorage()) return false
      return !window.localStorage.getItem(HINT_STORAGE_KEY)
    } catch (error) {
      logger.warn('Failed to read hint dismissal state', { error })
      return false
    }
  })

  const dismissHint = useCallback(() => {
    try {
      if (canUseLocalStorage()) {
        window.localStorage.setItem(HINT_STORAGE_KEY, 'true')
      }
    } catch (error) {
      logger.warn('Failed to save hint dismissal', { error })
    } finally {
      setShowHint(false)
    }
  }, [])

  return [showHint, dismissHint]
}
