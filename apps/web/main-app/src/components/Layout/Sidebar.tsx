import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import { CustomButton, AppBadge, cn } from '@repo/app-component-library'
import { motion } from 'framer-motion'
import {
  Home,
  Images,
  Heart,
  BookOpen,
  LayoutDashboard,
  Settings,
  HelpCircle,
  ChevronRight,
  Search,
  Lightbulb,
  User,
  Package,
} from 'lucide-react'
import { QuickActions } from '../Navigation/QuickActions'
import { useNavigation } from '../Navigation/NavigationProvider'
import { selectPrimaryNavigation } from '@/store/slices/navigationSlice'
import { selectAuth } from '@/store/slices/authSlice'

interface SidebarProps {
  className?: string
  showLegacyRoutes?: boolean
}

const iconMap = {
  Home,
  Images,
  Heart,
  BookOpen,
  LayoutDashboard,
  Settings,
  HelpCircle,
  Search,
  Lightbulb,
  User,
  Package,
}

// LEGO-inspired navigation items with legacy route support
const legacyNavigationItems = [
  {
    id: 'moc-gallery',
    label: 'MOC Gallery',
    href: '/moc-gallery',
    icon: 'Images',
    description: 'Browse community MOCs',
    category: 'browse',
  },
  {
    id: 'inspiration',
    label: 'Inspiration',
    href: '/inspiration',
    icon: 'Lightbulb',
    description: 'Get inspired by amazing builds',
    category: 'browse',
  },
  {
    id: 'profile',
    label: 'My Profile',
    href: '/profile',
    icon: 'User',
    description: 'View and edit your profile',
    category: 'account',
    requiresAuth: true,
  },
]

// LEGO snap animation variants
const legoSnapVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      type: 'spring' as const,
      stiffness: 600,
      damping: 15,
    },
  },
}

export function Sidebar({ className, showLegacyRoutes = true }: SidebarProps) {
  const location = useLocation()
  const navigation = useSelector(selectPrimaryNavigation)
  const auth = useSelector(selectAuth)
  const { trackNavigation } = useNavigation()

  const handleNavigationClick = (itemId: string, href: string) => {
    trackNavigation('sidebar_navigation', {
      itemId,
      href,
      source: 'sidebar',
      timestamp: Date.now(),
    })
  }

  // Filter legacy items based on authentication
  const visibleLegacyItems = legacyNavigationItems.filter(
    item => !item.requiresAuth || auth.isAuthenticated,
  )

  return (
    <aside
      className={cn(
        'w-64 bg-card border-r border-border flex flex-col',
        'shadow-sm', // LEGO-inspired subtle shadow
        className,
      )}
    >
      {/* LEGO-inspired header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-sky-50 to-teal-50 dark:from-sky-950 dark:to-teal-950">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-sky-500 flex items-center justify-center shadow-sm">
            <div className="h-2 w-2 rounded-full bg-white/80"></div>
          </div>
          <span className="font-semibold text-sm text-sky-700 dark:text-sky-300">LEGO MOC Hub</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Primary Navigation */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Navigation
          </h2>
          <div className="space-y-1">
            {navigation.map(item => {
              const Icon = iconMap[item.icon as keyof typeof iconMap] || Home
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href))

              return (
                <motion.div
                  key={item.id}
                  variants={legoSnapVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Link
                    to={item.href}
                    onClick={() => handleNavigationClick(item.id, item.href)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      'hover:bg-sky-50 hover:text-sky-700 hover:shadow-sm',
                      'focus:bg-sky-50 focus:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200',
                      'dark:hover:bg-sky-950 dark:hover:text-sky-300 dark:focus:bg-sky-950 dark:focus:text-sky-300',
                      isActive && 'bg-sky-100 text-sky-700 shadow-sm border border-sky-200',
                      isActive && 'dark:bg-sky-900 dark:text-sky-300 dark:border-sky-800',
                      // LEGO-inspired 8px grid system
                      'min-h-[40px]', // 5 * 8px grid
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <AppBadge
                        variant="secondary"
                        className="h-5 text-xs bg-sky-100 text-sky-700 border-sky-200"
                      >
                        {item.badge}
                      </AppBadge>
                    ) : null}
                    {item.children ? <ChevronRight className="h-4 w-4 flex-shrink-0" /> : null}
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Legacy Routes (if enabled) */}
        {showLegacyRoutes && visibleLegacyItems.length > 0 ? (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Browse & Discover
            </h2>
            <div className="space-y-1">
              {visibleLegacyItems.map(item => {
                const Icon = iconMap[item.icon as keyof typeof iconMap] || Home
                const isActive = location.pathname === item.href

                return (
                  <motion.div
                    key={item.id}
                    variants={legoSnapVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Link
                      to={item.href}
                      onClick={() => handleNavigationClick(item.id, item.href)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                        'hover:bg-teal-50 hover:text-teal-700 hover:shadow-sm',
                        'focus:bg-teal-50 focus:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200',
                        'dark:hover:bg-teal-950 dark:hover:text-teal-300 dark:focus:bg-teal-950 dark:focus:text-teal-300',
                        isActive && 'bg-teal-100 text-teal-700 shadow-sm border border-teal-200',
                        isActive && 'dark:bg-teal-900 dark:text-teal-300 dark:border-teal-800',
                        'min-h-[40px]', // LEGO 8px grid system
                      )}
                      title={item.description}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Account Navigation */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Account
          </h2>
          <div className="space-y-1">
            <motion.div
              variants={legoSnapVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              <Link
                to="/settings"
                onClick={() => handleNavigationClick('settings', '/settings')}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  'hover:bg-slate-50 hover:text-slate-700 hover:shadow-sm',
                  'focus:bg-slate-50 focus:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200',
                  'dark:hover:bg-slate-950 dark:hover:text-slate-300 dark:focus:bg-slate-950 dark:focus:text-slate-300',
                  location.pathname === '/settings' &&
                    'bg-slate-100 text-slate-700 shadow-sm border border-slate-200',
                  location.pathname === '/settings' &&
                    'dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
                  'min-h-[40px]',
                )}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">Settings</span>
              </Link>
            </motion.div>

            <motion.div
              variants={legoSnapVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              <Link
                to="/help"
                onClick={() => handleNavigationClick('help', '/help')}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  'hover:bg-slate-50 hover:text-slate-700 hover:shadow-sm',
                  'focus:bg-slate-50 focus:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200',
                  'dark:hover:bg-slate-950 dark:hover:text-slate-300 dark:focus:bg-slate-950 dark:focus:text-slate-300',
                  location.pathname === '/help' &&
                    'bg-slate-100 text-slate-700 shadow-sm border border-slate-200',
                  location.pathname === '/help' &&
                    'dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
                  'min-h-[40px]',
                )}
              >
                <HelpCircle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">Help & Support</span>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4">
          <QuickActions
            variant="vertical"
            showRecentlyVisited={true}
            maxItems={3}
            className="space-y-3"
          />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p>LEGO MOC Instructions</p>
          <p>Version {import.meta.env.VITE_APP_VERSION || '1.0.0'}</p>
        </div>
      </div>
    </aside>
  )
}

/**
 * Collapsible sidebar for larger screens
 */
export function CollapsibleSidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const navigation = useSelector(selectPrimaryNavigation)

  return (
    <aside
      className={cn(
        'bg-card border-r border-border flex flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Toggle button */}
      <div className="p-4 border-b border-border">
        <CustomButton
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-start"
        >
          <ChevronRight
            className={cn('h-4 w-4 transition-transform', isCollapsed ? 'rotate-0' : 'rotate-180')}
          />
          {!isCollapsed && <span className="ml-2">Collapse</span>}
        </CustomButton>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map(item => {
          const Icon = iconMap[item.icon as keyof typeof iconMap] || Home
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))

          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                isActive && 'bg-accent text-accent-foreground',
                isCollapsed && 'justify-center',
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4" />
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <AppBadge variant="secondary" className="h-5 text-xs">
                      {item.badge}
                    </AppBadge>
                  ) : null}
                </>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
