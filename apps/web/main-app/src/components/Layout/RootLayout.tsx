import React, { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingSpinner } from '@repo/ui/loading-spinner'
import { cn } from '@repo/ui/lib/utils'
import { NavigationProvider } from '../Navigation/NavigationProvider'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { MainArea } from './MainArea'
import {
  setActiveRoute,
  closeMobileMenu,
  selectIsMobileMenuOpen,
} from '@/store/slices/navigationSlice'
import { selectAuth } from '@/store/slices/authSlice'

// LEGO brick building animation for loading states
const legoBrickVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
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

export function RootLayout() {
  const dispatch = useDispatch()
  const location = useLocation()
  const auth = useSelector(selectAuth)
  const isMobileMenuOpen = useSelector(selectIsMobileMenuOpen)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)

  // Update active route when location changes with smooth transitions
  useEffect(() => {
    setIsPageTransitioning(true)
    dispatch(setActiveRoute(location.pathname))
    dispatch(closeMobileMenu())

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

  // Public routes that don't need authentication
  const publicRoutes = ['/login', '/register', '/forgot-password']
  const isPublicRoute = publicRoutes.includes(location.pathname)

  // If not authenticated and not on a public route, show minimal layout
  if (!auth.isAuthenticated && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-background">
        <MainArea
          isAuthenticated={false}
          isPageTransitioning={isPageTransitioning}
          currentPath={location.pathname}
        />
      </div>
    )
  }

  // Authenticated layout with full navigation and LEGO-inspired design
  return (
    <NavigationProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950">
        {/* Header with enhanced styling */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Header />
        </motion.div>

        {/* Main content area with smooth transitions */}
        <div className="flex relative">
          {/* Sidebar - only show for authenticated users */}
          {auth.isAuthenticated ? (
            <>
              {/* Desktop sidebar with slide-in animation */}
              <motion.div
                initial={{ x: -264, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="hidden lg:block"
              >
                <Sidebar className="fixed left-0 top-16 bottom-0 z-30" showLegacyRoutes={true} />
              </motion.div>

              {/* Mobile sidebar overlay with enhanced animations */}
              <AnimatePresence>
                {isMobileMenuOpen ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                      onClick={() => dispatch(closeMobileMenu())}
                    />
                    <motion.div
                      initial={{ x: -264, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -264, opacity: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                      className="fixed left-0 top-16 bottom-0 z-50 lg:hidden"
                    >
                      <Sidebar showLegacyRoutes={true} />
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </>
          ) : null}

          {/* Main content area */}
          <MainArea
            isAuthenticated={auth.isAuthenticated}
            isPageTransitioning={isPageTransitioning}
            currentPath={location.pathname}
          />
        </div>

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
 * Layout for authentication pages
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
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
