import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button, Avatar, AvatarFallback, AvatarImage } from '@repo/ui'
import { useAuth, clearCSRFToken, clearRefreshState } from '@repo/auth'
import { useDispatch } from 'react-redux'
import { authApi } from '@repo/auth/store/authApi'
import {
  Heart,
  LogOut,
  Search,
  User,
  Settings,
  ChevronDown,
  Lightbulb
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

// Zod schema for navigation props
const NavigationPropsSchema = z.object({
  className: z.string().optional(),
})

type NavigationProps = z.infer<typeof NavigationPropsSchema>

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

function Navigation({ className = '' }: NavigationProps) {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debug authentication state changes (can be removed in production)
  useEffect(() => {
    console.log('🔍 Navigation auth state:', {
      isAuthenticated,
      user: user ? { name: user.name, email: user.email } : null
    })
  }, [isAuthenticated, user])

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
      console.log('🔄 Starting logout process...')

      // Call the logout mutation (this clears server-side cookies)
      const logoutResult = await logout()
      console.log('✅ Logout API call successful:', logoutResult)

      // Wait a moment for server-side cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 200))

      // Clear client-side authentication state
      clearCSRFToken()           // Clear CSRF token from memory
      clearRefreshState()        // Clear token refresh state
      console.log('🧹 Client-side tokens cleared')

      // Force reset the entire auth API cache to ensure clean state
      dispatch(authApi.util.resetApiState())
      console.log('🔄 RTK Query cache reset')

      // Clear any user-specific localStorage data
      try {
        localStorage.removeItem('user-preferences')
        localStorage.removeItem('user-settings')
        // Add any other user-specific keys that should be cleared
      } catch (error) {
        console.warn('Could not clear localStorage:', error)
      }

      // Additional delay to ensure all cleanup completes
      await new Promise(resolve => setTimeout(resolve, 300))

      // Navigate to home page
      console.log('🏠 Navigating to home page')
      navigate({ to: '/' })

    } catch (error) {
      console.error('❌ Logout failed:', error)

      // Even if logout fails, clear all client-side state for security
      clearCSRFToken()
      clearRefreshState()
      dispatch(authApi.util.resetApiState())

      try {
        localStorage.removeItem('user-preferences')
        localStorage.removeItem('user-settings')
      } catch (storageError) {
        console.warn('Could not clear localStorage:', storageError)
      }

      // Still navigate even if logout failed
      await new Promise(resolve => setTimeout(resolve, 200))
      navigate({ to: '/' })
    }
  }

  return (
    <nav className={`flex items-center space-x-4 ${className}`}>
      {/* Main Navigation Links */}
      <div className="hidden md:flex items-center space-x-6">
        <Link
          to="/moc-gallery"
          className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Browse MOCs</span>
        </Link>

        <Link
          to="/inspiration-gallery"
          className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Lightbulb className="h-4 w-4" />
          <span>Inspiration</span>
        </Link>

        {isAuthenticated && (
          <>
            <Link
              to="/wishlist"
              className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart className="h-4 w-4" />
              <span>Wishlist</span>
            </Link>
          </>
        )}
      </div>

      {/* User Actions */}
      <div className="flex items-center space-x-2">
        {isAuthenticated ? (
          <>
            {/* User Avatar Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-accent transition-colors"
              >
                <Avatar className="h-8 w-8">
                  {user?.avatarUrl && (
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={user?.name || user?.email || 'User'}
                    />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="flex items-center px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/auth/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm">
                Sign Up
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navigation 