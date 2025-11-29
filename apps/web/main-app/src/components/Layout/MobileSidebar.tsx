import { useEffect, useCallback } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@repo/ui/button'
import { Sidebar } from './Sidebar'
import { selectSidebarOpen, setSidebarOpen } from '@/store/slices/globalUISlice'

/**
 * Mobile sidebar drawer component
 *
 * Features:
 * - Slide-in animation from left (AC: 3)
 * - Semi-transparent backdrop (AC: 4)
 * - Close on navigation (AC: 5)
 * - Close on backdrop click (AC: 6)
 * - Close on Escape key (AC: 7)
 * - Hidden on desktop md: breakpoint (AC: 8)
 */
export function MobileSidebar() {
  const dispatch = useDispatch()
  const isOpen = useSelector(selectSidebarOpen)
  const location = useLocation()

  // Close sidebar when route changes (AC: 5)
  useEffect(() => {
    if (isOpen) {
      dispatch(setSidebarOpen(false))
    }
    // Only trigger on pathname change, not on isOpen change
  }, [location.pathname, dispatch])

  // Handle Escape key press (AC: 7)
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

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* Backdrop overlay (AC: 4) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Drawer panel (AC: 1, 3, 8) */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden bg-card shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Close button */}
            <div className="absolute right-2 top-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Sidebar content */}
            <Sidebar showLegacyRoutes={true} className="h-full" />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
