import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { isTokenExpired } from '../jwt'
import type { AuthState } from '../guards'

/**
 * Select auth slice from Redux store.
 * All consuming apps mount the auth reducer at state.auth.
 */
const selectAuth = (state: any): AuthState => state.auth

/**
 * Loading fallback shown while auth state is being resolved.
 */
function AuthLoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  )
}

/**
 * ProtectedLayout — wraps routes that require authentication.
 *
 * - Shows a loading spinner while auth state resolves
 * - Redirects to /login if not authenticated
 * - Redirects to /login?expired=true if the access token has expired
 * - Renders child routes via <Outlet /> when authenticated
 */
export function ProtectedLayout() {
  const auth = useSelector(selectAuth)

  if (auth.isLoading) {
    return <AuthLoadingFallback />
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (auth.tokens?.accessToken && isTokenExpired(auth.tokens.accessToken)) {
    return <Navigate to="/login?expired=true" replace />
  }

  return <Outlet />
}

/**
 * GuestLayout — wraps routes that should only be accessible to unauthenticated users.
 *
 * - Shows a loading spinner while auth state resolves
 * - Redirects authenticated users to /dashboard
 * - Renders child routes via <Outlet /> for guests
 */
export function GuestLayout() {
  const auth = useSelector(selectAuth)

  if (auth.isLoading) {
    return <AuthLoadingFallback />
  }

  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

/**
 * AdminLayout — wraps routes that require authentication and the admin role.
 *
 * - Shows a loading spinner while auth state resolves
 * - Redirects to /login if not authenticated
 * - Redirects to /login?expired=true if the access token has expired
 * - Redirects to /unauthorized if the user lacks the admin role
 * - Renders child routes via <Outlet /> for authenticated admins
 */
export function AdminLayout() {
  const auth = useSelector(selectAuth)

  if (auth.isLoading) {
    return <AuthLoadingFallback />
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (auth.tokens?.accessToken && isTokenExpired(auth.tokens.accessToken)) {
    return <Navigate to="/login?expired=true" replace />
  }

  const roles = auth.user?.roles ?? []
  if (!roles.includes('admin')) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
