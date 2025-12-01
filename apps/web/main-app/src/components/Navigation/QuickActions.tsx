import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Plus, Zap, Star, Clock, MoreHorizontal } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { Badge } from '@repo/app-component-library'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/app-component-library'
import { cn } from '@repo/app-component-library'
import { useNavigation } from './NavigationProvider'
import {
  selectQuickActions,
  selectRecentlyVisited,
  selectUserPreferences,
  NavigationItem,
} from '@/store/slices/navigationSlice'

interface QuickActionsProps {
  className?: string
  variant?: 'horizontal' | 'vertical' | 'grid'
  showRecentlyVisited?: boolean
  maxItems?: number
}

/**
 * Quick Actions Component
 * Provides easy access to frequently used actions and recently visited items
 */
export function QuickActions({
  className,
  variant = 'horizontal',
  showRecentlyVisited = true,
  maxItems = 4,
}: QuickActionsProps) {
  const quickActions = useSelector(selectQuickActions)
  const recentlyVisited = useSelector(selectRecentlyVisited)
  const userPreferences = useSelector(selectUserPreferences)
  const { navigateToItem, trackNavigation } = useNavigation()

  const [showAll, setShowAll] = useState(false)

  // Filter and sort quick actions
  const visibleActions = quickActions
    .filter(action => !userPreferences.hiddenItems.includes(action.id))
    .slice(0, showAll ? undefined : maxItems)

  const handleActionClick = (action: NavigationItem) => {
    navigateToItem(action)
    trackNavigation(action.id, {
      source: 'quick_actions',
      variant,
      timestamp: new Date().toISOString(),
    })
  }

  const handleRecentClick = (item: NavigationItem) => {
    navigateToItem(item)
    trackNavigation(item.id, {
      source: 'recently_visited',
      timestamp: new Date().toISOString(),
    })
  }

  if (quickActions.length === 0 && (!showRecentlyVisited || recentlyVisited.length === 0)) {
    return null
  }

  const containerClasses = cn(
    'space-y-4',
    variant === 'horizontal' && 'flex flex-col space-y-4',
    variant === 'vertical' && 'flex flex-col space-y-2',
    variant === 'grid' && 'grid grid-cols-2 md:grid-cols-4 gap-4',
    className,
  )

  return (
    <div className={containerClasses}>
      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
              {quickActions.length > maxItems && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="h-6 px-2 text-xs"
                >
                  {showAll ? 'Show Less' : `+${quickActions.length - maxItems} more`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className={cn(
                'flex gap-2',
                variant === 'vertical' && 'flex-col',
                variant === 'grid' && 'grid grid-cols-2 gap-2',
              )}
            >
              {visibleActions.map(action => (
                <QuickActionButton
                  key={action.id}
                  action={action}
                  onClick={() => handleActionClick(action)}
                  isFavorite={userPreferences.favoriteItems.includes(action.id)}
                />
              ))}

              {/* More Actions Dropdown */}
              {quickActions.length > maxItems && !showAll && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {quickActions.slice(maxItems).map(action => (
                      <DropdownMenuItem
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        className="flex items-center gap-2"
                      >
                        <div className="w-4 h-4 bg-muted rounded" />
                        <span>{action.label}</span>
                        {action.badge ? (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {action.badge}
                          </Badge>
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Visited */}
      {showRecentlyVisited && recentlyVisited.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recently Visited
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {recentlyVisited.slice(0, 3).map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRecentClick(item)}
                  className="w-full justify-start h-8 px-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-3 h-3 bg-muted rounded flex-shrink-0" />
                    <span className="flex-1 text-left truncate text-xs">{item.label}</span>
                    {userPreferences.favoriteItems.includes(item.id) && (
                      <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

/**
 * Individual Quick Action Button Component
 */
interface QuickActionButtonProps {
  action: NavigationItem
  onClick: () => void
  isFavorite?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function QuickActionButton({
  action,
  onClick,
  isFavorite = false,
  size = 'sm',
}: QuickActionButtonProps) {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 h-auto p-2',
        size === 'sm' && 'h-8 px-2',
        size === 'md' && 'h-10 px-3',
        size === 'lg' && 'h-12 px-4',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'bg-primary/10 rounded flex-shrink-0 flex items-center justify-center',
          size === 'sm' && 'w-4 h-4',
          size === 'md' && 'w-5 h-5',
          size === 'lg' && 'w-6 h-6',
        )}
      >
        <Plus
          className={cn(
            'text-primary',
            size === 'sm' && 'h-3 w-3',
            size === 'md' && 'h-4 w-4',
            size === 'lg' && 'h-5 w-5',
          )}
        />
      </div>

      {/* Label */}
      <span
        className={cn(
          'flex-1 text-left truncate',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
        )}
      >
        {action.label}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isFavorite ? <Star className="h-3 w-3 text-yellow-500" /> : null}
        {action.isNew ? (
          <Badge variant="secondary" className="text-xs px-1">
            New
          </Badge>
        ) : null}
        {action.badge ? (
          <Badge variant="default" className="text-xs px-1">
            {action.badge}
          </Badge>
        ) : null}
      </div>

      {/* Keyboard Shortcut */}
      {action.shortcut ? (
        <Badge variant="outline" className="text-xs px-1 ml-1">
          {action.shortcut}
        </Badge>
      ) : null}
    </Button>
  )
}
