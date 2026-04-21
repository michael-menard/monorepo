import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppDispatch } from '../store/hooks'
import { setNavigating } from '../store/slices/globalUISlice'

/**
 * Hook to sync React Router navigation state with Redux global UI state.
 *
 * Detects route changes via useLocation and briefly sets isNavigating=true
 * so components can show transition indicators.
 */
export const useNavigationSync = () => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      dispatch(setNavigating(true))
      prevPathRef.current = location.pathname

      // Brief navigation state — clear after transition settles
      const timer = setTimeout(() => dispatch(setNavigating(false)), 100)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, dispatch])
}
