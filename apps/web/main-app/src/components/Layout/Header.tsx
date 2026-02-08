import { Link } from '@tanstack/react-router'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppAvatar,
  AppBadge,
  Button,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuLabel,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
} from '@repo/app-component-library'
import {
  Menu,
  Bell,
  Settings,
  LogOut,
  User,
  Moon,
  Sun,
  Monitor,
  Blocks,
  HelpCircle,
} from 'lucide-react'
import { EnhancedBreadcrumb } from '../Navigation/EnhancedBreadcrumb'
import { selectNavigationNotifications } from '@/store/slices/navigationSlice'
import { toggleSidebar } from '@/store/slices/globalUISlice'
import { selectAuth } from '@/store/slices/authSlice'
import { selectTheme, selectResolvedTheme, setTheme, type Theme } from '@/store/slices/themeSlice'
import { useAuth } from '@/services/auth/AuthProvider'

interface HeaderProps {
  showBreadcrumbs?: boolean
}

export function Header({ showBreadcrumbs = false }: HeaderProps) {
  const dispatch = useDispatch()
  const auth = useSelector(selectAuth)
  const theme = useSelector(selectTheme)
  const resolvedTheme = useSelector(selectResolvedTheme)
  const notifications = useSelector(selectNavigationNotifications)
  const { signOut } = useAuth()

  const handleThemeChange = (newTheme: Theme) => {
    dispatch(setTheme(newTheme))
  }

  const getThemeIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />
    }
    return resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
  }

  const totalNotifications = notifications.reduce(
    (sum, notification) => sum + notification.count,
    0,
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main header row */}
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left section - Logo and mobile menu */}
          <div className="flex items-center gap-3">
            {auth.isAuthenticated ? (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => dispatch(toggleSidebar())}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            ) : null}

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
                <Blocks className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-base leading-tight tracking-wide text-foreground">
                  LEGO MOC
                </span>
                <span className="text-[10px] text-muted-foreground leading-none tracking-wider uppercase">
                  Instructions
                </span>
              </div>
            </Link>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <AppDropdownMenu>
              <AppDropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  {getThemeIcon()}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </AppDropdownMenuTrigger>
              <AppDropdownMenuContent align="end" className="w-36">
                <AppDropdownMenuItem
                  onClick={() => handleThemeChange('light')}
                  className={`cursor-pointer ${theme === 'light' ? 'bg-accent' : ''}`}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </AppDropdownMenuItem>
                <AppDropdownMenuItem
                  onClick={() => handleThemeChange('dark')}
                  className={`cursor-pointer ${theme === 'dark' ? 'bg-accent' : ''}`}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </AppDropdownMenuItem>
                <AppDropdownMenuItem
                  onClick={() => handleThemeChange('system')}
                  className={`cursor-pointer ${theme === 'system' ? 'bg-accent' : ''}`}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </AppDropdownMenuItem>
              </AppDropdownMenuContent>
            </AppDropdownMenu>

            {auth.isAuthenticated ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                  <Bell className="h-4 w-4" />
                  {totalNotifications > 0 && (
                    <AppBadge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 flex items-center justify-center text-[10px] font-medium bg-primary text-primary-foreground border-0">
                      {totalNotifications > 99 ? '99+' : totalNotifications}
                    </AppBadge>
                  )}
                  <span className="sr-only">
                    Notifications {totalNotifications > 0 && `(${totalNotifications})`}
                  </span>
                </Button>

                {/* User menu */}
                <AppDropdownMenu>
                  <AppDropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative rounded-full ml-1 h-9 w-9 p-0"
                    >
                      <AppAvatar
                        avatarUrl={auth.user?.avatar}
                        userName={auth.user?.name || 'User'}
                        size="sm"
                        clickable={false}
                        showEditButton={false}
                      />
                    </Button>
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
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </AppDropdownMenuItem>
                    <AppDropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </AppDropdownMenuItem>
                    <AppDropdownMenuItem asChild>
                      <Link to="/help" className="cursor-pointer">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Support
                      </Link>
                    </AppDropdownMenuItem>
                    <AppDropdownMenuSeparator />
                    <AppDropdownMenuItem
                      onSelect={() => signOut()}
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </AppDropdownMenuItem>
                  </AppDropdownMenuContent>
                </AppDropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button size="default" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumb row (authenticated only, controlled by prop) */}
        {auth.isAuthenticated && showBreadcrumbs ? (
          <div className="flex items-center h-10 -mt-1 border-t border-border/50">
            <EnhancedBreadcrumb
              showBackButton={true}
              showHomeIcon={true}
              maxItems={5}
              className="text-sm"
            />
          </div>
        ) : null}
      </div>
    </header>
  )
}
