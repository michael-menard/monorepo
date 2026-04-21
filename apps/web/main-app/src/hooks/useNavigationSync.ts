import { useEffect } from 'react'
import { useNavigation } from 'react-router-dom'
import { useAppDispatch } from '../store/hooks'
import { setNavigating } from '../store/slices/globalUISlice'

/**
 * Hook to sync React Router navigation state with Redux global UI state.
 *
 * Uses React Router's useNavigation() to detect when navigation is in progress
 * (loading data, submitting forms, etc.) and dispatches to Redux so any
 * component can show a loading indicator.
 */
export const useNavigationSync = () => {
  const dispatch = useAppDispatch()
  const navigation = useNavigation()

  const isNavigating = navigation.state !== 'idle'

  useEffect(() => {
    dispatch(setNavigating(isNavigating))
  }, [isNavigating, dispatch])
}
