import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs'
import {
  Navigation,
  Search,
  Zap,
  Star,
  Bell,
  Settings,
  BarChart3,
  Compass,
  Target,
  Layers,
} from 'lucide-react'
import {
  NavigationSearch,
  QuickActions,
  EnhancedBreadcrumb,
  CompactBreadcrumb,
  useNavigation,
  addNotification,
  updateNavigationBadge,
  setContextualNavigation,
  selectNavigationAnalytics,
  selectUserPreferences,
  selectNavigationNotifications,
} from '@/components/Navigation'

/**
 * Navigation System Demo Page
 * Showcases all features of the unified navigation system
 */
export function NavigationDemoPage() {
  const dispatch = useDispatch()
  const { trackNavigation, setContextualItems } = useNavigation()
  const analytics = useSelector(selectNavigationAnalytics)
  const preferences = useSelector(selectUserPreferences)
  const notifications = useSelector(selectNavigationNotifications)

  // Set up demo contextual navigation
  useEffect(() => {
    const demoContextualItems = [
      {
        id: 'demo-export',
        label: 'Export Demo Data',
        href: '/navigation-demo/export',
        icon: 'Download',
        description: 'Export navigation demo data',
        category: 'utility' as const,
      },
      {
        id: 'demo-settings',
        label: 'Demo Settings',
        href: '/navigation-demo/settings',
        icon: 'Settings',
        description: 'Configure demo settings',
        category: 'utility' as const,
      },
    ]

    setContextualItems(demoContextualItems)
  }, [setContextualItems])

  // Demo functions
  const handleAddNotification = () => {
    dispatch(
      addNotification({
        itemId: 'gallery',
        count: Math.floor(Math.random() * 10) + 1,
        type: 'info',
      }),
    )
  }

  const handleUpdateBadge = () => {
    dispatch(
      updateNavigationBadge({
        id: 'wishlist',
        badge: Math.floor(Math.random() * 50) + 1,
      }),
    )
  }

  const handleTrackDemo = () => {
    trackNavigation('demo_interaction', {
      source: 'navigation_demo',
      action: 'demo_button_click',
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Compass className="h-8 w-8 text-primary" />
          Navigation System Demo
        </h1>
        <p className="text-muted-foreground">
          Explore the comprehensive unified navigation system with enhanced features
        </p>
      </div>

      {/* Demo Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="breadcrumbs">Breadcrumbs</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-primary" />
                  Enhanced Navigation
                </CardTitle>
                <CardDescription>Hierarchical navigation with smart active states</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Multi-level navigation support</li>
                  <li>• Smart active state detection</li>
                  <li>• Badge and notification system</li>
                  <li>• User preference management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Intelligent Search
                </CardTitle>
                <CardDescription>
                  Search across all navigation items with smart results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Fuzzy search across labels and descriptions</li>
                  <li>• Recent search history</li>
                  <li>• Keyboard shortcuts (Cmd+K)</li>
                  <li>• Contextual search results</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Fast access to frequently used actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Customizable quick action buttons</li>
                  <li>• Recently visited items</li>
                  <li>• Keyboard shortcuts</li>
                  <li>• Usage analytics</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Demo Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive Demo</CardTitle>
              <CardDescription>
                Try out the navigation features with these demo actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleAddNotification} variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  Add Notification
                </Button>
                <Button onClick={handleUpdateBadge} variant="outline">
                  <Star className="h-4 w-4 mr-2" />
                  Update Badge
                </Button>
                <Button onClick={handleTrackDemo} variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Track Analytics
                </Button>
              </div>

              {/* Current Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{notifications.length}</div>
                  <div className="text-sm text-muted-foreground">Active Notifications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {preferences.favoriteItems.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Favorite Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.length}</div>
                  <div className="text-sm text-muted-foreground">Tracked Items</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Search Demo</CardTitle>
              <CardDescription>
                Try searching for navigation items, MOCs, or any content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NavigationSearch
                placeholder="Search navigation items, MOCs, instructions..."
                className="w-full max-w-md"
                showShortcut={true}
              />

              <div className="text-sm text-muted-foreground">
                <p>Try searching for:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>"gallery" - Find gallery-related items</li>
                  <li>"upload" - Find upload actions</li>
                  <li>"dashboard" - Find dashboard navigation</li>
                  <li>"settings" - Find settings and preferences</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breadcrumbs Tab */}
        <TabsContent value="breadcrumbs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Breadcrumb</CardTitle>
                <CardDescription>
                  Full-featured breadcrumb with back button and overflow handling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedBreadcrumb
                  showBackButton={true}
                  showHomeIcon={true}
                  maxItems={5}
                  className="p-4 bg-muted/50 rounded-md"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compact Breadcrumb</CardTitle>
                <CardDescription>Minimal breadcrumb for mobile or tight spaces</CardDescription>
              </CardHeader>
              <CardContent>
                <CompactBreadcrumb className="p-4 bg-muted/50 rounded-md" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick-actions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vertical Quick Actions</CardTitle>
                <CardDescription>Compact vertical layout for sidebars</CardDescription>
              </CardHeader>
              <CardContent>
                <QuickActions variant="vertical" showRecentlyVisited={true} maxItems={3} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grid Quick Actions</CardTitle>
                <CardDescription>Grid layout for dashboard or main content areas</CardDescription>
              </CardHeader>
              <CardContent>
                <QuickActions variant="grid" showRecentlyVisited={false} maxItems={4} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Navigation Analytics
              </CardTitle>
              <CardDescription>Track user navigation patterns and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.length > 0 ? (
                <div className="space-y-4">
                  {analytics.map(item => (
                    <div
                      key={item.itemId}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div>
                        <div className="font-medium">{item.itemId}</div>
                        <div className="text-sm text-muted-foreground">
                          Last visited: {new Date(item.lastVisited).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="secondary">{item.visitCount} visits</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No analytics data yet</p>
                  <p className="text-sm">Navigate around to see analytics in action</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
