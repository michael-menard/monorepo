import { Link } from '@tanstack/react-router'
import { useDispatch, useSelector } from 'react-redux'
import { logger } from '@repo/logger'
import { Button } from '@repo/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import { Menu, Bell, Settings, LogOut, User, Moon, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Badge } from '@repo/ui/badge'
import { NavigationSearch } from '../Navigation/NavigationSearch'
import { EnhancedBreadcrumb } from '../Navigation/EnhancedBreadcrumb'
import { toggleMobileMenu, selectNavigationNotifications } from '@/store/slices/navigationSlice'
import { selectAuth } from '@/store/slices/authSlice'
import { selectResolvedTheme, setTheme } from '@/store/slices/themeSlice'
import { useAuth } from '@/services/auth/AuthProvider'

export function Header() {
  const dispatch = useDispatch()
  const auth = useSelector(selectAuth)
  const resolvedTheme = useSelector(selectResolvedTheme)
  const notifications = useSelector(selectNavigationNotifications)
  const { signOut } = useAuth()

  const handleThemeToggle = () => {
    dispatch(setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))
  }

  // Calculate total notification count
  const totalNotifications = notifications.reduce(
    (sum, notification) => sum + notification.count,
    0,
  )

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      logger.error('Sign out failed:', error)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and mobile menu */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            {auth.isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => dispatch(toggleMobileMenu())}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            ) : null}

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">L</span>
              </div>
              <span className="font-bold text-lg hidden sm:inline-block">
                LEGO MOC Instructions
              </span>
            </Link>
          </div>

          {/* Center - Enhanced Navigation Search (authenticated users only) */}
          {auth.isAuthenticated ? (
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <NavigationSearch
                placeholder="Search navigation, MOCs, instructions..."
                className="w-full"
                showShortcut={true}
              />
            </div>
          ) : null}

          {/* Right side - User actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button variant="ghost" size="sm" onClick={handleThemeToggle} className="h-9 w-9">
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {auth.isAuthenticated ? (
              <>
                {/* Enhanced Notifications */}
                <Button variant="ghost" size="sm" className="h-9 w-9 relative">
                  <Bell className="h-4 w-4" />
                  {totalNotifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {totalNotifications > 99 ? '99+' : totalNotifications}
                    </Badge>
                  )}
                  <span className="sr-only">
                    Notifications {totalNotifications > 0 && `(${totalNotifications})`}
                  </span>
                </Button>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={auth.user?.avatar} alt={auth.user?.name} />
                        <AvatarFallback>
                          {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {auth.user?.name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {auth.user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              /* Login button for unauthenticated users */
              <Button asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Breadcrumb Navigation (authenticated users only) */}
        {auth.isAuthenticated ? (
          <div className="border-t border-border/40">
            <div className="container mx-auto px-4 py-2">
              <EnhancedBreadcrumb
                showBackButton={true}
                showHomeIcon={true}
                maxItems={5}
                className="text-sm"
              />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
