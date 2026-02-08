import { Suspense, lazy } from 'react'
import { useParams } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

// Lazy load pages
const AdminUsersPage = lazy(() =>
  import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })),
)
const AdminUserDetailPage = lazy(() =>
  import('./pages/AdminUserDetailPage').then(m => ({ default: m.AdminUserDetailPage })),
)

/**
 * Loading fallback for admin pages
 */
function AdminLoadingFallback() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  )
}

/**
 * Admin Module
 *
 * Handles routing between admin user list and detail pages.
 * All routes are protected by RouteGuards.admin.
 */
export function AdminModule() {
  const params = useParams({ strict: false })
  const userId = (params as { userId?: string }).userId

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<AdminLoadingFallback />}>
        {userId ? <AdminUserDetailPage userId={userId} /> : <AdminUsersPage />}
      </Suspense>
    </div>
  )
}
