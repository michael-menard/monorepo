/**
 * Shell Router — React Router v7
 *
 * Single router that delegates to micro-app modules via wildcard paths.
 * Each module owns its internal routes. The shell only knows base paths
 * and layout wrappers (auth guards).
 */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// Auth layout routes — RootLayout currently handles auth-conditional rendering,
// so these are imported but only AdminLayout is used for now.
// TODO: Refactor RootLayout to remove its auth checks and use these exclusively.
import { AdminLayout } from '@repo/auth-utils/layouts'
import { RootLayout } from '@/components/Layout/RootLayout'
import { LoadingPage } from './pages/LoadingPage'

// Auth pages (shell-owned, not micro-apps)
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { OTPVerificationPage } from '../pages/auth/OTPVerificationPage'
import { EmailVerificationPage } from '../pages/auth/EmailVerificationPage'
import { NewPasswordPage } from '../pages/auth/NewPasswordPage'

// Micro-app modules (lazy-loaded, each owns its internal routes)
const SetsModule = lazy(() =>
  import('@repo/app-sets-gallery').then(m => ({ default: m.SetsModule })),
)
const WishlistModule = lazy(() =>
  import('@repo/app-wishlist-gallery').then(m => ({ default: m.WishlistModule })),
)
const MinifigsModule = lazy(() =>
  import('@repo/app-minifigs-gallery').then(m => ({ default: m.MinifigsModule })),
)
const InstructionsModule = lazy(() =>
  import('@repo/app-instructions-gallery').then(m => ({ default: m.InstructionsModule })),
)
const DashboardModule = lazy(() =>
  import('@repo/app-dashboard').then(m => ({ default: m.DashboardModule })),
)
const InspirationModule = lazy(() =>
  import('@repo/app-inspiration-gallery').then(m => ({ default: m.AppInspirationGalleryModule })),
)
const SettingsModule = lazy(() =>
  import('@repo/app-dashboard').then(m => ({ default: m.SettingsModule })),
)
// Direct pages (not micro-app modules)
const ProcurementPage = lazy(() =>
  import('@/pages/procurement').then(m => ({ default: m.ProcurementPage })),
)
const UserProfilePage = lazy(() =>
  import('@repo/user-settings').then(m => ({ default: m.default })),
)
const AdminModule = lazy(() =>
  import('./admin/AdminModule').then(m => ({ default: m.AdminModule })),
)

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingPage />}>{children}</Suspense>
}

/**
 * App-level route definitions.
 *
 * The shell mounts each micro-app at a base path with `/*`.
 * The micro-app's Module component contains its own <Routes>.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Auth pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/otp-verification" element={<OTPVerificationPage />} />
      <Route path="/auth/verify-email" element={<EmailVerificationPage />} />
      <Route path="/auth/new-password" element={<NewPasswordPage />} />

      {/* Micro-app modules with wildcard delegation */}
      <Route
        path="/sets/*"
        element={
          <SuspenseWrapper>
          <SetsModule />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/wishlist/*"
        element={
          <SuspenseWrapper>
          <WishlistModule />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/minifigs/*"
        element={
          <SuspenseWrapper>
          <MinifigsModule />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/instructions/*"
        element={
          <SuspenseWrapper>
          <InstructionsModule />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/dashboard"
        element={
          <SuspenseWrapper>
          <DashboardModule />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/settings/*"
        element={
          <SuspenseWrapper>
          <SettingsModule />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/procurement"
        element={
          <SuspenseWrapper>
          <ProcurementPage />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/inspiration"
        element={
          <SuspenseWrapper>
          <InspirationModule />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/profile/:id"
        element={
          <SuspenseWrapper>
          <UserProfilePage />
          </SuspenseWrapper>
        }
      />

      {/* Admin routes */}
      <Route element={<AdminLayout />}>
      <Route
        path="/admin/*"
        element={
          <SuspenseWrapper>
          <AdminModule />
          </SuspenseWrapper>
        }
      />
      </Route>

      {/* Legacy redirects */}
      <Route path="/scraper" element={<Navigate to="/settings/scraper" replace />} />
      <Route path="/dashboard/mocs/upload" element={<Navigate to="/instructions/new" replace />} />
      <Route path="/mocs/:slug" element={<Navigate to="/instructions/:slug" replace />} />

      {/* Stub routes */}
      <Route path="/gallery" element={<PlaceholderPage />} />
      <Route path="/gallery/:mocId" element={<PlaceholderPage />} />
      <Route path="/help" element={<PlaceholderPage />} />
      <Route path="/contact" element={<PlaceholderPage />} />
      <Route path="/feedback" element={<PlaceholderPage />} />
      <Route path="/privacy" element={<PlaceholderPage />} />
      <Route path="/terms" element={<PlaceholderPage />} />
      <Route path="/cookies" element={<PlaceholderPage />} />

      {/* Error routes */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
