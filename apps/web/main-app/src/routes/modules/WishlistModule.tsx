import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  LoadingSpinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/app-component-library'
import { Heart, Star, DollarSign, Bell, Calendar, TrendingUp, Clock, Gift } from 'lucide-react'
import { useEnhancedWishlistQueryQuery, useGetEnhancedPriceEstimatesQuery } from '@/store'

/**
 * Enhanced Wishlist Module showcasing our serverless API client features
 */
export function WishlistModule() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [priorityFilter] = useState<string[]>(['high', 'urgent'])

  // Use enhanced wishlist query with all optimizations
  const {
    data: wishlistData,
    isLoading: isWishlistLoading,
    error: wishlistError,
  } = useEnhancedWishlistQueryQuery({
    priorityLevels: priorityFilter as any,
    wishlistCategories: activeCategory === 'all' ? undefined : [activeCategory],
    priceAlerts: true,
    // Enhanced features
    cacheStrategy: 'short', // Fresh data for price-sensitive info
    includePriceHistory: true,
    includeAvailability: true,
    prefetchRelated: true,
  })

  // Get price estimates for all items
  const itemIds = wishlistData?.data?.items?.map(item => item.id) || []
  const { data: priceData, isLoading: isPriceLoading } = useGetEnhancedPriceEstimatesQuery(
    itemIds,
    {
      skip: itemIds.length === 0,
      refetchOnMountOrArgChange: 60, // Refetch every minute for fresh prices
    },
  )

  const categories = [
    { id: 'all', name: 'All Items', icon: '📋', color: 'default' },
    { id: 'birthday-gifts', name: 'Birthday Gifts', icon: '🎂', color: 'secondary' },
    { id: 'holiday-gifts', name: 'Holiday Gifts', icon: '🎄', color: 'destructive' },
    { id: 'personal-collection', name: 'Personal Collection', icon: '🏠', color: 'default' },
    { id: 'investment', name: 'Investment Sets', icon: '💰', color: 'default' },
  ]

  const getCategoryStats = (categoryId: string) => {
    if (!wishlistData?.data?.items) return { count: 0, value: 0 }

    const items =
      categoryId === 'all'
        ? wishlistData.data.items
        : wishlistData.data.items.filter(item =>
            (item as { wishlistCategories?: string[] }).wishlistCategories?.includes(categoryId),
          )

    return {
      count: items.length,
      value: items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0),
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with enhanced statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="h-8 w-8 text-primary" />
              Enhanced Wishlist
            </h1>
            <p className="text-muted-foreground">
              Smart wishlist with priority management, price tracking, and LEGO-specific features
            </p>
          </div>

          {/* Performance indicator */}
          {(wishlistData as unknown as { performance?: { duration: number; cacheHit: boolean } })
            ?.performance ? (
            <div className="text-right text-sm text-muted-foreground">
              <div>
                Loaded in{' '}
                {(
                  wishlistData as unknown as { performance: { duration: number } }
                ).performance.duration.toFixed(0)}
                ms
              </div>
              <div className="flex items-center gap-1">
                {(wishlistData as unknown as { performance: { cacheHit: boolean } }).performance
                  .cacheHit ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    Cached
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 text-blue-500" />
                    Network
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isWishlistLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  wishlistData?.data?.summary?.totalItems?.toLocaleString() || '0'
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isWishlistLoading || isPriceLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  `$${priceData?.data?.totalValue?.toFixed(0) || '0'}`
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isWishlistLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  wishlistData?.data?.summary?.priorityCounts?.high || '0'
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Price Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isWishlistLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  priceData?.data?.priceAlerts?.filter(
                    (alert: { enabled: boolean }) => alert.enabled,
                  )?.length || '0'
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Wishlist Categories
          </CardTitle>
          <CardDescription>
            Organize your wishlist by categories with smart filtering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid w-full grid-cols-5">
              {categories.map(category => {
                const stats = getCategoryStats(category.id)
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex flex-col gap-1"
                  >
                    <span>
                      {category.icon} {category.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stats.count} items • ${stats.value.toFixed(0)}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category.id} value={category.id} className="mt-6">
                <WishlistItemsGrid
                  items={wishlistData?.data?.items || []}
                  category={category}
                  isLoading={isWishlistLoading}
                  error={wishlistError}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Enhanced Features Showcase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Enhanced Wishlist Features
          </CardTitle>
          <CardDescription>
            This wishlist is powered by our enhanced serverless API client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Star className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Priority Management</h4>
              <p className="text-sm text-muted-foreground">
                Advanced priority levels: low, medium, high, urgent
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Price Tracking</h4>
              <p className="text-sm text-muted-foreground">Real-time price monitoring and alerts</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Smart Categories</h4>
              <p className="text-sm text-muted-foreground">Seasonal items and gift planning</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Bell className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">LEGO Integration</h4>
              <p className="text-sm text-muted-foreground">
                Theme filtering and set number tracking
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Wishlist Items Grid Component
 */
function WishlistItemsGrid({
  items,
  category,
  isLoading,
  error,
}: {
  items: any[]
  category: any
  isLoading: boolean
  error: any
}) {
  const filteredItems =
    category.id === 'all'
      ? items
      : items.filter((item: any) => item.wishlistCategories?.includes(category.id))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading wishlist items...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-2">Error loading wishlist</div>
        <p className="text-muted-foreground text-sm">
          {error.message || 'Failed to load wishlist items'}
        </p>
      </div>
    )
  }

  if (!filteredItems.length) {
    return (
      <div className="text-center py-12">
        <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No items in this category</h3>
        <p className="text-muted-foreground">
          Add some LEGO sets to your {category.name.toLowerCase()}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredItems.map((item: any) => (
        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold truncate flex-1">{item.title}</h3>

              {/* Priority Badge */}
              <Badge
                variant={
                  item.priority === 'urgent'
                    ? 'destructive'
                    : item.priority === 'high'
                      ? 'default'
                      : item.priority === 'medium'
                        ? 'secondary'
                        : 'outline'
                }
                className="ml-2"
              >
                {item.priority}
              </Badge>
            </div>

            {/* Estimated Cost */}
            {item.estimatedCost ? (
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">${item.estimatedCost.toFixed(2)}</span>
                {item.priceAlerts ? (
                  <Badge variant="outline" className="text-xs">
                    <Bell className="h-3 w-3 mr-1" />
                    Alert
                  </Badge>
                ) : null}
              </div>
            ) : null}

            {/* Themes */}
            {item.themes && item.themes.length > 0 ? (
              <div className="flex flex-wrap gap-1 mb-2">
                {item.themes.slice(0, 2).map((theme: string) => (
                  <Badge key={theme} variant="outline" className="text-xs">
                    {theme}
                  </Badge>
                ))}
                {item.themes.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{item.themes.length - 2}
                  </Badge>
                )}
              </div>
            ) : null}

            {/* Status Indicators */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {item.isPurchased ? (
                <Badge variant="default" className="text-xs">
                  Purchased
                </Badge>
              ) : null}
              {item.isWatching ? (
                <Badge variant="outline" className="text-xs">
                  👀 Watching
                </Badge>
              ) : null}
              {item.giftIdea ? (
                <Badge variant="outline" className="text-xs">
                  <Gift className="h-3 w-3 mr-1" />
                  Gift
                </Badge>
              ) : null}
            </div>

            {/* Seasonal Items */}
            {item.seasonalItems && item.seasonalItems.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.seasonalItems.map((season: string) => (
                  <Badge key={season} variant="secondary" className="text-xs">
                    {season === 'holiday' ? '🎄' : season === 'birthday' ? '🎂' : '🎉'} {season}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
