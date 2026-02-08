import { useEffect, useCallback } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  LayoutDashboard,
  Heart,
  BookOpen,
  Package,
  Lightbulb,
  User,
  Settings,
  HelpCircle,
  Blocks,
} from 'lucide-react'
import { Button, cn } from '@repo/app-component-library'
import { selectSidebarOpen, setSidebarOpen } from '@/store/slices/globalUISlice'

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'wishlist', label: 'Wishlist', href: '/wishlist', icon: Heart },
  { id: 'instructions', label: 'Instructions', href: '/instructions', icon: BookOpen },
  { id: 'sets', label: 'Sets', href: '/sets', icon: Package },
  { id: 'inspiration', label: 'Inspiration', href: '/inspiration', icon: Lightbulb },
]

const accountNavItems = [
  { id: 'profile', label: 'Profile', href: '/profile', icon: User },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
  { id: 'help', label: 'Help & Support', href: '/help', icon: HelpCircle },
]

/**
 * Mobile sidebar drawer component
 *
 * Features:
 * - Slide-in animation from left
 * - Semi-transparent backdrop
 * - Close on navigation
 * - Close on backdrop click
 * - Close on Escape key
 * - Hidden on desktop md: breakpoint
 */
export function MobileSidebar() {
  const dispatch = useDispatch()
  const isOpen = useSelector(selectSidebarOpen)
  const location = useLocation()

  // Close sidebar when route changes
  useEffect(() => {
    if (isOpen) {
      dispatch(setSidebarOpen(false))
    }
  }, [location.pathname, dispatch])

  // Handle Escape key press
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        dispatch(setSidebarOpen(false))
      }
    },
    [dispatch, isOpen],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleBackdropClick = () => {
    dispatch(setSidebarOpen(false))
  }

  const handleClose = () => {
    dispatch(setSidebarOpen(false))
  }

  const isNavItemActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/'
    }
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed left-0 top-0 bottom-0 w-72 z-50 md:hidden bg-card shadow-xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Blocks className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm">LEGO MOC</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Main navigation */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  Navigation
                </h2>
                <div className="space-y-1">
                  {mainNavItems.map(item => {
                    const Icon = item.icon
                    const isActive = isNavItemActive(item.href)
                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive && 'bg-accent text-accent-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Account navigation */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  Account
                </h2>
                <div className="space-y-1">
                  {accountNavItems.map(item => {
                    const Icon = item.icon
                    const isActive = isNavItemActive(item.href)
                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive && 'bg-accent text-accent-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                LEGO MOC Instructions
              </p>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
