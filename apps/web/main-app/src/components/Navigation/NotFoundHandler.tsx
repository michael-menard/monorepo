import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Home, ArrowLeft, Search, AlertTriangle } from 'lucide-react'
import { useNavigation } from './NavigationProvider'

interface NotFoundHandlerProps {
  title?: string
  description?: string
  showBackButton?: boolean
  showHomeButton?: boolean
  showSearchSuggestions?: boolean
  className?: string
}

export function NotFoundHandler({
  title = 'Page Not Found',
  description = "The page you're looking for doesn't exist or has been moved.",
  showBackButton = true,
  showHomeButton = true,
  showSearchSuggestions = true,
  className,
}: NotFoundHandlerProps) {
  const navigate = useNavigate()
  const { trackNavigation } = useNavigation()

  const handleBack = () => {
    navigate({ to: '..' })
    trackNavigation('404_back', { source: 'not_found_handler' })
  }

  const handleHome = () => {
    navigate({ to: '/' })
    trackNavigation('404_home', { source: 'not_found_handler' })
  }

  const handleSearchClick = (suggestion: string) => {
    trackNavigation('404_search_suggestion', {
      source: 'not_found_handler',
      suggestion,
    })
  }

  // Common search suggestions based on legacy app routes
  const searchSuggestions = [
    { label: 'Browse MOCs', path: '/gallery', icon: Search },
    { label: 'MOC Gallery', path: '/moc-gallery', icon: Search },
    { label: 'Inspiration Gallery', path: '/inspiration', icon: Search },
    { label: 'My Wishlist', path: '/wishlist', icon: Search },
    { label: 'My Profile', path: '/profile', icon: Search },
  ]

  return (
    <div className={`min-h-[60vh] flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {showBackButton ? (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            ) : null}

            {showHomeButton ? (
              <Button onClick={handleHome} className="flex-1">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            ) : null}
          </div>

          {/* Search suggestions */}
          {showSearchSuggestions ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Or try one of these:</div>
              <div className="grid gap-2">
                {searchSuggestions.map(suggestion => (
                  <Link
                    key={suggestion.path}
                    to={suggestion.path}
                    className="flex items-center p-2 rounded-md hover:bg-accent transition-colors text-sm"
                    onClick={() => handleSearchClick(suggestion.label)}
                  >
                    <suggestion.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {suggestion.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Help text */}
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            If you believe this is an error, please contact support or try refreshing the page.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Compact 404 handler for inline use
 */
export function CompactNotFoundHandler({
  message = 'Content not found',
  showHomeLink = true,
}: {
  message?: string
  showHomeLink?: boolean
}) {
  const { trackNavigation } = useNavigation()

  return (
    <div className="text-center py-8">
      <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {showHomeLink ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          onClick={() => trackNavigation('compact_404_home', { source: 'compact_not_found' })}
        >
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Route-specific 404 handlers
 */
export const RouteNotFoundHandlers = {
  gallery: () => (
    <NotFoundHandler
      title="Gallery Item Not Found"
      description="The MOC you're looking for might have been removed or doesn't exist."
      showSearchSuggestions={true}
    />
  ),

  profile: () => (
    <NotFoundHandler
      title="Profile Not Found"
      description="The user profile you're looking for doesn't exist or is private."
      showSearchSuggestions={false}
    />
  ),

  moc: () => (
    <NotFoundHandler
      title="MOC Not Found"
      description="The MOC instruction you're looking for might have been removed or doesn't exist."
      showSearchSuggestions={true}
    />
  ),
}
