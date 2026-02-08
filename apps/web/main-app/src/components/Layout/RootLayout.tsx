import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import {
  LoadingSpinner,
  cn,
  AppTabs,
  AppTabsList,
  AppTabsTrigger,
} from '@repo/app-component-library'
import {
  LayoutDashboard,
  Heart,
  BookOpen,
  Package,
  Lightbulb,
} from 'lucide-react'
import { NavigationProvider } from '../Navigation/NavigationProvider'
import { PageTransitionSpinner } from '../PageTransitionSpinner/PageTransitionSpinner'
import { Header } from './Header'
import { MobileSidebar } from './MobileSidebar'
import { Footer } from './Footer'
import { MainArea } from './MainArea'
import { setActiveRoute } from '@/store/slices/navigationSlice'
import { selectAuth } from '@/store/slices/authSlice'
import { AuthProvider } from '@/services/auth/AuthProvider'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'
import { useNavigationSync } from '@/hooks/useNavigationSync'

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'wishlist', label: 'Wishlist', href: '/wishlist', icon: Heart },
  { id: 'instructions', label: 'Instructions', href: '/instructions', icon: BookOpen },
  { id: 'sets', label: 'Sets', href: '/sets', icon: Package },
  { id: 'inspiration', label: 'Inspiration', href: '/inspiration', icon: Lightbulb },
]

// LEGO brick building animation for loading states
const legoBrickVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
      delay: 0.1,
    },
  },
  exit: {
    scale: 0,
    rotate: 180,
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

/**
 * Inner layout component that renders the actual layout content.
 * Separated from RootLayout so AuthProvider can wrap it while being
 * inside the RouterProvider context.
 */
function RootLayoutContent() {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useSelector(selectAuth)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)

  // Determine which tab should be active based on current route
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/' || path === '/dashboard' || path.startsWith('/dashboard/')) {
      return '/dashboard'
    }
    for (const item of mainNavItems) {
      if (path === item.href || path.startsWith(item.href + '/')) {
        return item.href
      }
    }
    // Return empty string for non-nav routes (settings, profile, help, etc.)
    return ''
  }

  const handleTabChange = (value: string) => {
    if (value) {
      navigate({ to: value })
    }
  }

  // Sync router navigation state with Redux (Story 1.31)
  // Must be inside RouterProvider context
  useNavigationSync()

  // Automatically refresh tokens before they expire (Story 1.28)
  // Must be inside AuthProvider context
  useTokenRefresh()

  // Update active route when location changes with smooth transitions
  useEffect(() => {
    setIsPageTransitioning(true)
    dispatch(setActiveRoute(location.pathname))

    // Reset transition state after animation
    const timer = setTimeout(() => setIsPageTransitioning(false), 300)
    return () => clearTimeout(timer)
  }, [location.pathname, dispatch])

  // LEGO brick building loading animation
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950 dark:to-teal-950">
        <div className="text-center space-y-6">
          {/* LEGO brick building animation */}
          <div className="flex justify-center gap-2">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  'h-8 w-8 rounded-lg shadow-lg flex items-center justify-center',
                  i === 0 && 'bg-red-500',
                  i === 1 && 'bg-blue-500',
                  i === 2 && 'bg-yellow-500',
                  i === 3 && 'bg-green-500',
                )}
                variants={legoBrickVariants}
                initial="initial"
                animate="animate"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="h-3 w-3 rounded-full bg-white/80 shadow-inner"></div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <LoadingSpinner size="lg" className="text-sky-500" />
            <p className="text-muted-foreground mt-4 font-medium">
              Building your LEGO MOC experience...
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  // Unauthenticated users get minimal layout (no header, sidebar, or footer)
  // This applies to both auth pages and any other pages they might access
  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <MainArea
          isPageTransitioning={isPageTransitioning}
          currentPath={location.pathname}
        />
      </div>
    )
  }

  // Authenticated layout with full navigation and LEGO-inspired design
  const activeTab = getActiveTab()

  return (
    <NavigationProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950">
        {/* Page transition spinner - shows during route navigation */}
        <PageTransitionSpinner />

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Header />
        </motion.div>

        {/* Mobile sidebar drawer - uses globalUISlice */}
        <MobileSidebar />

        {/* Navigation tabs - hidden on mobile, shown on md+ */}
        <div className="hidden md:block border-b border-border bg-background/80 backdrop-blur-sm sticky top-16 z-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AppTabs value={activeTab} onValueChange={handleTabChange}>
              <AppTabsList variant="underline" className="h-12 w-full justify-start gap-0 bg-transparent p-0">
                {mainNavItems.map(item => {
                  const Icon = item.icon
                  return (
                    <AppTabsTrigger
                      key={item.id}
                      value={item.href}
                      variant="underline"
                      className="gap-2 px-4 h-full rounded-none data-[state=active]:border-primary border-b-2 border-transparent"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </AppTabsTrigger>
                  )
                })}
              </AppTabsList>
            </AppTabs>
          </div>
        </div>

        {/* Main content area */}
        <MainArea
          isPageTransitioning={isPageTransitioning}
          currentPath={location.pathname}
        />

        {/* Footer with slide-up animation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Footer />
        </motion.div>
      </div>
    </NavigationProvider>
  )
}

/**
 * Root layout component that wraps content with AuthProvider.
 * AuthProvider is placed here (inside RouterProvider) so it has
 * access to TanStack Router's navigation context.
 */
export function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  )
}

/**
 * Layout for authentication pages
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 min-h-screen bg-gradient-to-br from-background via-background to-muted overflow-hidden">
      {/* Background gradient blobs reused from HomePage for consistent auth styling */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute right-[-10%] top-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/50 via-blue-500/40 to-transparent blur-3xl animate-float" />
        <div className="absolute left-[-15%] bottom-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-teal-400/50 via-emerald-500/40 to-transparent blur-3xl animate-float-delayed" />
        <div className="absolute right-[10%] top-[40%] w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-cyan-500/45 via-sky-400/35 to-transparent blur-2xl animate-float" />
        <div className="absolute left-[5%] top-[25%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-green-400/45 via-lime-500/35 to-transparent blur-2xl animate-float-delayed" />
        <div className="absolute left-[40%] top-[5%] w-[300px] h-[300px] rounded-full bg-gradient-to-b from-blue-600/45 via-indigo-500/35 to-transparent blur-2xl animate-float" />
        <div className="absolute right-[35%] bottom-[8%] w-[350px] h-[350px] rounded-full bg-gradient-to-t from-teal-500/45 via-cyan-400/35 to-transparent blur-2xl animate-float-delayed" />
        <div className="absolute right-[25%] top-[20%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-sky-400/35 via-cyan-500/25 to-transparent blur-xl animate-float" />
        <div className="absolute left-[30%] bottom-[25%] w-[280px] h-[280px] rounded-full bg-gradient-to-tl from-emerald-400/35 via-teal-500/25 to-transparent blur-xl animate-float-delayed" />
        <div className="absolute right-[45%] top-[35%] w-[200px] h-[200px] rounded-full bg-gradient-to-br from-lime-400/30 via-green-500/20 to-transparent blur-xl animate-float" />
        <div className="absolute left-[55%] top-[60%] w-[180px] h-[180px] rounded-full bg-gradient-to-tr from-blue-400/30 via-cyan-500/20 to-transparent blur-xl animate-float-delayed" />
      </div>

      {/* Centered auth content with liquid glass aesthetic */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="relative backdrop-blur-2xl bg-gray-500/5 dark:bg-gray-400/5 border border-white/10 dark:border-white/5 rounded-3xl p-8 md:p-10 shadow-2xl">
            {/* Glass overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-gray-400/10 dark:from-gray-300/5 dark:via-transparent dark:to-gray-500/5 rounded-3xl pointer-events-none" />
            <div className="absolute inset-0 rounded-3xl shadow-inner pointer-events-none" />

            <div className="relative z-10">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Layout for error pages
 */
export function ErrorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">{children}</div>
    </div>
  )
}
