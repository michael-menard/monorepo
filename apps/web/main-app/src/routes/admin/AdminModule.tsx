import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
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
 * Owns its internal routes under /admin/*.
 * Protected by AdminLayout in the shell router.
 */
export function AdminModule() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<AdminLoadingFallback />}>
        <Routes>
          <Route index element={<AdminUsersPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:userId" element={<AdminUserDetailPage />} />

        </Routes>
      </Suspense>
    </div>
  )
}
