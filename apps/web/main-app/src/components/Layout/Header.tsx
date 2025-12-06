import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useDispatch, useSelector } from 'react-redux'
import { logger } from '@repo/logger'
import {
  AppAlertDialog,
  AppAlertDialogAction,
  AppAlertDialogCancel,
  AppAlertDialogContent,
  AppAlertDialogDescription,
  AppAlertDialogFooter,
  AppAlertDialogHeader,
  AppAlertDialogTitle,
  AppAvatar,
  AppBadge,
  CustomButton,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuLabel,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
} from '@repo/app-component-library'
import { Menu, Bell, Settings, LogOut, User, Moon, Sun, Monitor } from 'lucide-react'
import { NavigationSearch } from '../Navigation/NavigationSearch'
import { EnhancedBreadcrumb } from '../Navigation/EnhancedBreadcrumb'
import { selectNavigationNotifications } from '@/store/slices/navigationSlice'
import { toggleSidebar } from '@/store/slices/globalUISlice'
import { selectAuth } from '@/store/slices/authSlice'
import { selectTheme, selectResolvedTheme, setTheme, type Theme } from '@/store/slices/themeSlice'
import { useAuth } from '@/services/auth/AuthProvider'

export function Header() {
  const dispatch = useDispatch()
  const auth = useSelector(selectAuth)
  const theme = useSelector(selectTheme)
  const resolvedTheme = useSelector(selectResolvedTheme)
  const notifications = useSelector(selectNavigationNotifications)
  const { signOut } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleThemeChange = (newTheme: Theme) => {
    dispatch(setTheme(newTheme))
  }

  const getThemeIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />
    }
    return resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
  }

  // Calculate total notification count
  const totalNotifications = notifications.reduce(
    (sum, notification) => sum + notification.count,
    0,
  )

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleSignOutConfirm = async () => {
    try {
      await signOut()
    } catch (error) {
      logger.error('Sign out failed:', error)
    } finally {
      setShowLogoutConfirm(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and mobile menu */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button - visible on mobile, hidden on md and up (AC: 8) */}
            {auth.isAuthenticated ? (
              <CustomButton
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => dispatch(toggleSidebar())}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </CustomButton>
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
            {/* Theme toggle dropdown */}
            <AppDropdownMenu>
              <AppDropdownMenuTrigger asChild>
                <CustomButton variant="ghost" size="sm" className="h-9 w-9">
                  {getThemeIcon()}
                  <span className="sr-only">Toggle theme</span>
                </CustomButton>
              </AppDropdownMenuTrigger>
              <AppDropdownMenuContent align="end">
                <AppDropdownMenuItem
                  onClick={() => handleThemeChange('light')}
                  className={theme === 'light' ? 'bg-accent' : ''}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </AppDropdownMenuItem>
                <AppDropdownMenuItem
                  onClick={() => handleThemeChange('dark')}
                  className={theme === 'dark' ? 'bg-accent' : ''}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </AppDropdownMenuItem>
                <AppDropdownMenuItem
                  onClick={() => handleThemeChange('system')}
                  className={theme === 'system' ? 'bg-accent' : ''}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </AppDropdownMenuItem>
              </AppDropdownMenuContent>
            </AppDropdownMenu>

            {auth.isAuthenticated ? (
              <>
                {/* Enhanced Notifications */}
                <CustomButton variant="ghost" size="sm" className="h-9 w-9 relative">
                  <Bell className="h-4 w-4" />
                  {totalNotifications > 0 && (
                    <AppBadge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {totalNotifications > 99 ? '99+' : totalNotifications}
                    </AppBadge>
                  )}
                  <span className="sr-only">
                    Notifications {totalNotifications > 0 && `(${totalNotifications})`}
                  </span>
                </CustomButton>

                {/* User menu */}
                <AppDropdownMenu>
                  <AppDropdownMenuTrigger asChild>
                    <CustomButton variant="ghost" className="relative h-9 w-9 rounded-full">
                      <AppAvatar
                        avatarUrl={auth.user?.avatar}
                        userName={auth.user?.name || 'User'}
                        size="sm"
                      />
                    </CustomButton>
                  </AppDropdownMenuTrigger>
                  <AppDropdownMenuContent className="w-56" align="end" forceMount>
                    <AppDropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {auth.user?.name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {auth.user?.email}
                        </p>
                      </div>
                    </AppDropdownMenuLabel>
                    <AppDropdownMenuSeparator />
                    <AppDropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </AppDropdownMenuItem>
                    <AppDropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </AppDropdownMenuItem>
                    <AppDropdownMenuSeparator />
                    <AppDropdownMenuItem onClick={handleSignOutClick} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </AppDropdownMenuItem>
                  </AppDropdownMenuContent>
                </AppDropdownMenu>
              </>
            ) : (
              /* Login button for unauthenticated users */
              <CustomButton asChild>
                <Link to="/login">Sign In</Link>
              </CustomButton>
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

      {/* Logout Confirmation Dialog (AC: 6) */}
      <AppAlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AppAlertDialogContent>
          <AppAlertDialogHeader>
            <AppAlertDialogTitle>Log out?</AppAlertDialogTitle>
            <AppAlertDialogDescription>
              You will need to sign in again to access your account.
            </AppAlertDialogDescription>
          </AppAlertDialogHeader>
          <AppAlertDialogFooter>
            <AppAlertDialogCancel>Cancel</AppAlertDialogCancel>
            <AppAlertDialogAction onClick={handleSignOutConfirm}>Log out</AppAlertDialogAction>
          </AppAlertDialogFooter>
        </AppAlertDialogContent>
      </AppAlertDialog>
    </header>
  )
}
