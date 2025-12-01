import { useState, useEffect, useRef } from 'react'

/**
 * Hook that delays showing a UI element until after a threshold.
 * Useful for avoiding "flash" of loading indicators on fast operations.
 *
 * @param isActive - Whether the element should be shown (e.g., isLoading)
 * @param delayMs - Delay in milliseconds before showing (default: 300ms)
 * @returns Whether the element should actually be rendered
 *
 * @example
 * ```tsx
 * const isLoading = useAppSelector(selectIsNavigating)
 * const shouldShowSpinner = useDelayedShow(isLoading, 300)
 *
 * return shouldShowSpinner ? <Spinner /> : null
 * ```
 */
export const useDelayedShow = (isActive: boolean, delayMs: number = 300): boolean => {
  const [shouldShow, setShouldShow] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isActive) {
      // Start timer to show after delay
      timeoutRef.current = setTimeout(() => {
        setShouldShow(true)
      }, delayMs)
    } else {
      // Clear timer and hide immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setShouldShow(false)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isActive, delayMs])

  return shouldShow
}
