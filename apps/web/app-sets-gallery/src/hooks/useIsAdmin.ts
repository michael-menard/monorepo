import { useSelector } from 'react-redux'

/**
 * Returns true if the current user has admin role.
 * Checks user.roles from the shell app's auth state.
 */
export function useIsAdmin(): boolean {
  const user = useSelector((state: { auth?: { user?: { roles?: string[] } } }) => state.auth?.user)
  if (!user?.roles) return false
  return user.roles.includes('admin') || user.roles.includes('admins')
}
