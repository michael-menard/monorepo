import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useAppDispatch } from '../store/hooks'
import { setNavigating } from '../store/slices/globalUISlice'

/**
 * Hook to sync TanStack Router navigation state with Redux global UI state.
 *
 * Subscribes to multiple router states to accurately detect navigation:
 * - `isLoading`: Route data is being fetched (loader functions)
 * - `isTransitioning`: Route transition is in progress
 * - `status === 'pending'`: Route match is pending resolution
 *
 * This covers all navigation scenarios:
 * - Route transitions (clicking links)
 * - Data loading (route loader functions)
 * - Lazy component loading (dynamic imports)
 * - beforeLoad guards executing
 *
 * @example
 * ```tsx
 * // In App.tsx or a top-level component inside RouterProvider
 * function InnerApp() {
 *   useNavigationSync()
 *   return <Outlet />
 * }
 *
 * // In any component
 * function LoadingIndicator() {
 *   const isNavigating = useAppSelector(selectIsNavigating)
 *   return isNavigating ? <Spinner /> : null
 * }
 * ```
 */
export const useNavigationSync = () => {
  const dispatch = useAppDispatch()

  // Subscribe to all relevant router loading states
  const isLoading = useRouterState({ select: state => state.isLoading })
  const isTransitioning = useRouterState({ select: state => state.isTransitioning })
  const status = useRouterState({ select: state => state.status })

  // Combined check: any of these states indicates navigation in progress
  const isNavigating = isLoading || isTransitioning || status === 'pending'

  useEffect(() => {
    dispatch(setNavigating(isNavigating))
  }, [isNavigating, dispatch])
}
