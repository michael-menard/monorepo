import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSelector, useDispatch } from 'react-redux'
import { Button, Avatar, AvatarFallback, AvatarImage } from '@repo/ui'
import {
  Heart,
  LogOut,
  Search,
  User,
  Settings,
  ChevronDown,
  Lightbulb,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { useNavigation } from './NavigationProvider'
import { selectAuth } from '@/store/slices/authSlice'
import {
  selectIsMobileMenuOpen,
  toggleMobileMenu,
  closeMobileMenu,
} from '@/store/slices/navigationSlice'

interface UnifiedNavigationProps {
  className?: string
}

// Helper function to get user initials
const getInitials = (name?: string, email?: string): string => {
  if (name) {
    const names = name.trim().split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    }
    return names[0][0].toUpperCase()
  }
  if (email) {
    return email[0].toUpperCase()
  }
  return 'U'
}

export function UnifiedNavigation({ className }: UnifiedNavigationProps) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const auth = useSelector(selectAuth)
  const isMobileMenuOpen = useSelector(selectIsMobileMenuOpen)
  const { trackNavigation } = useNavigation()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  const handleLogout = async () => {
    try {
      // Track logout analytics
      trackNavigation('logout', { source: 'user_menu' })

      // Clear user-specific localStorage data
      try {
        localStorage.removeItem('user-preferences')
        localStorage.removeItem('user-settings')
      } catch (error) {
        console.warn('Failed to clear localStorage:', error)
      }

      // Close user menu
      setIsUserMenuOpen(false)

      // Navigate to home page
      navigate({ to: '/' })
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails, clear localStorage for security
      try {
        localStorage.removeItem('user-preferences')
        localStorage.removeItem('user-settings')
      } catch (storageError) {
        console.warn('Failed to clear localStorage on error:', storageError)
      }

      // Close user menu and navigate anyway
      setIsUserMenuOpen(false)
      navigate({ to: '/' })
    }
  }

  const handleMobileMenuToggle = () => {
    dispatch(toggleMobileMenu())
  }

  const handleNavClick = (path: string, label: string) => {
    trackNavigation(path, { source: 'navigation', label })
    dispatch(closeMobileMenu())
  }

  return (
    <nav className={cn('flex items-center justify-between w-full', className)}>
      {/* Mobile menu button */}
      <div className="flex items-center lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMobileMenuToggle}
          className="p-2"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Desktop Navigation Links */}
      <div className="hidden lg:flex items-center space-x-6">
        <Link
          to="/gallery"
          className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => handleNavClick('/gallery', 'Browse MOCs')}
        >
          <Search className="h-4 w-4" />
          <span>Browse MOCs</span>
        </Link>

        <Link
          to="/inspiration"
          className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => handleNavClick('/inspiration', 'Inspiration')}
        >
          <Lightbulb className="h-4 w-4" />
          <span>Inspiration</span>
        </Link>

        {/* Private Navigation Links - Only show when authenticated */}
        {auth.isAuthenticated ? (
          <Link
            to="/wishlist"
            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => handleNavClick('/wishlist', 'Wishlist')}
          >
            <Heart className="h-4 w-4" />
            <span>Wishlist</span>
          </Link>
        ) : null}
      </div>

      {/* User Actions */}
      <div className="flex items-center space-x-2">
        {auth.isAuthenticated ? (
          <>
            {/* User Avatar Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-accent transition-colors"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  {auth.user?.avatarUrl ? (
                    <AvatarImage
                      src={auth.user.avatarUrl}
                      alt={auth.user?.name || auth.user?.email || 'User'}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(auth.user?.name, auth.user?.email)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen ? (
                <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-medium">{auth.user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{auth.user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="flex items-center px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        handleNavClick('/profile', 'Profile')
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        handleNavClick('/settings', 'Settings')
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Sign Up</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
