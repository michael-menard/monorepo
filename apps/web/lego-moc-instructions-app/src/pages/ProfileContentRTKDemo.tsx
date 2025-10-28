import React, { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@repo/ui'
import {
  Heart,
  BookOpen,
  Download,
  Calendar,
  Star,
  TrendingUp,
  Users,
  Eye,
  Plus,
  Search,
  Settings,
  Upload,
  ExternalLink,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

// Import RTK hooks and actions
import {
  useAppDispatch,
  useAppSelector,
  // Wishlist
  fetchWishlistItems,
  selectWishlistItems,
  selectWishlistLoading,
  selectWishlistError,
  selectWishlistStats,
  togglePurchaseStatus,
  // MOC Instructions
  fetchMocInstructions,
  selectMocInstructions,
  selectMocInstructionsLoading,
  selectMocInstructionsError,
  selectMocInstructionsStats,
  incrementDownloadCount,
  // Profile
  fetchProfileData,
  selectUserStats,
  selectRecentActivities,
  selectQuickActions,
  selectProfileLoading,
  selectProfileError,
  refreshProfileStats,
  addRecentActivity,
  type WishlistItem,
  type MockInstruction,
} from '../store'

/**
 * RTK-powered Profile Content Demo
 * This demonstrates how to use Redux Toolkit slices for state management
 */
export default function ProfileContentRTKDemo() {
  const dispatch = useAppDispatch()

  // Wishlist selectors
  const wishlistItems = useAppSelector(selectWishlistItems)
  const wishlistLoading = useAppSelector(selectWishlistLoading)
  const wishlistError = useAppSelector(selectWishlistError)
  const wishlistStats = useAppSelector(selectWishlistStats)

  // MOC Instructions selectors
  const mocInstructions = useAppSelector(selectMocInstructions)
  const mocInstructionsLoading = useAppSelector(selectMocInstructionsLoading)
  const mocInstructionsError = useAppSelector(selectMocInstructionsError)
  const mocInstructionsStats = useAppSelector(selectMocInstructionsStats)

  // Profile selectors
  const userStats = useAppSelector(selectUserStats)
  const recentActivities = useAppSelector(selectRecentActivities)
  const quickActions = useAppSelector(selectQuickActions)
  const profileLoading = useAppSelector(selectProfileLoading)
  const profileError = useAppSelector(selectProfileError)

  // Initialize data on mount
  useEffect(() => {
    dispatch(fetchWishlistItems())
    dispatch(fetchMocInstructions({})) // Pass empty filters object
    dispatch(fetchProfileData())
  }, [dispatch])

  // Event handlers
  const handleTogglePurchase = async (itemId: string) => {
    try {
      await dispatch(togglePurchaseStatus(itemId)).unwrap()

      // Add activity for purchase
      const item = wishlistItems.find(item => item.id === itemId)
      if (item) {
        dispatch(
          addRecentActivity({
            type: 'wishlist_add',
            title: `${item.isPurchased ? 'Unpurchased' : 'Purchased'} ${item.name}`,
            description: `Updated purchase status for ${item.name}`,
            imageUrl: item.imageUrl,
            relatedId: itemId,
          }),
        )
      }
    } catch (error) {}
  }

  const handleDownloadInstruction = async (instructionId: string) => {
    try {
      await dispatch(incrementDownloadCount(instructionId)).unwrap()

      // Add activity for download
      const instruction = mocInstructions.find(inst => inst.id === instructionId)
      if (instruction) {
        dispatch(
          addRecentActivity({
            type: 'download',
            title: `Downloaded ${instruction.title}`,
            description: `Downloaded MOC instructions by ${instruction.author}`,
            imageUrl: instruction.coverImageUrl,
            relatedId: instructionId,
          }),
        )
      }
    } catch (error) {}
  }

  const handleRefreshStats = () => {
    dispatch(refreshProfileStats())
  }

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).getFullYear()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'download':
        return <Download className="h-4 w-4" />
      case 'wishlist_add':
        return <Heart className="h-4 w-4" />
      case 'instruction_upload':
        return <Upload className="h-4 w-4" />
      case 'review':
        return <Star className="h-4 w-4" />
      case 'follow':
        return <Users className="h-4 w-4" />
      default:
        return <BookOpen className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'download':
        return 'text-blue-600'
      case 'wishlist_add':
        return 'text-red-600'
      case 'instruction_upload':
        return 'text-green-600'
      case 'review':
        return 'text-yellow-600'
      case 'follow':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks}w ago`
  }

  const iconMap = {
    Upload,
    Search,
    Download,
    Heart,
    Users,
    Settings,
    Plus,
  }

  const colorMap = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }

  const isLoading = wishlistLoading || mocInstructionsLoading || profileLoading
  const hasError = wishlistError || mocInstructionsError || profileError

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Profile Dashboard (RTK)
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Redux Toolkit powered profile with real state management
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleRefreshStats}
                variant="outline"
                size="sm"
                disabled={profileLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${profileLoading ? 'animate-spin' : ''}`} />
                Refresh Stats
              </Button>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                RTK Powered
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Live State
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {hasError ? (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error Loading Data</h3>
            <p className="text-red-600 text-sm mt-1">
              {wishlistError || mocInstructionsError || profileError}
            </p>
          </div>
        </div>
      ) : null}

      {/* Loading State */}
      {isLoading ? (
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      {!isLoading && (
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg">Wishlist</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-red-600">
                      {wishlistStats?.total || wishlistItems.length}
                    </span>
                    <span className="text-sm text-gray-500">Items</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total value: {formatCurrency(wishlistStats?.totalValue || 0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {wishlistStats?.purchased || 0} purchased
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Instructions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      {mocInstructionsStats?.total || mocInstructions.length}
                    </span>
                    <span className="text-sm text-gray-500">MOCs</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>
                      {mocInstructionsStats?.averageRating?.toFixed(1) || '0.0'} avg rating
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {mocInstructionsStats?.published || 0} published
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600">
                      {mocInstructionsStats?.totalDownloads || 0}
                    </span>
                    <span className="text-sm text-gray-500">Downloads</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Member since {userStats ? formatDate(userStats.memberSince) : '2024'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {userStats?.profileViews || 0} profile views
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.slice(0, 6).map(action => {
                    const IconComponent = iconMap[action.icon as keyof typeof iconMap]
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        className={`flex items-center space-x-2 p-3 h-auto ${colorMap[action.color]}`}
                        asChild
                      >
                        <a href={action.href}>
                          {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
                          <span className="text-sm font-medium">{action.title}</span>
                        </a>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Recent Activity</span>
                  <span className="text-sm text-gray-500">({recentActivities.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.slice(0, 5).map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className={`mt-1 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                      {activity.imageUrl ? (
                        <img
                          src={activity.imageUrl}
                          alt=""
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wishlist Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-red-600" />
                    <CardTitle>My Wishlist</CardTitle>
                    <span className="text-sm text-gray-500">
                      ({wishlistItems.filter(item => !item.isPurchased).length} unpurchased)
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href="/wishlist"
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <span>View All</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {wishlistItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No wishlist items yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Start building your wishlist by adding LEGO sets you want to buy.
                    </p>
                    <Button asChild>
                      <a href="/sets">Browse Sets</a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wishlistItems.slice(0, 5).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {item.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-lg font-bold text-green-600">
                              ${item.price.toFixed(2)}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                item.priority === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : item.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {item.priority} priority
                            </span>
                            {item.isPurchased ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Purchased
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePurchase(item.id)}
                            disabled={wishlistLoading}
                          >
                            {item.isPurchased ? 'Mark Unpurchased' : 'Mark Purchased'}
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on LEGO.com"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MOC Instructions Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <CardTitle>My MOC Instructions</CardTitle>
                    <span className="text-sm text-gray-500">
                      ({mocInstructions.length} instructions)
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href="/moc-instructions"
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <span>View All</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {mocInstructions.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No MOC instructions yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Share your custom builds with the community by uploading instructions.
                    </p>
                    <Button asChild>
                      <a href="/upload">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Instructions
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mocInstructions.slice(0, 5).map(instruction => {
                      const getDifficultyColor = (difficulty: string) => {
                        switch (difficulty) {
                          case 'beginner':
                            return 'bg-green-100 text-green-800'
                          case 'intermediate':
                            return 'bg-yellow-100 text-yellow-800'
                          case 'advanced':
                            return 'bg-orange-100 text-orange-800'
                          case 'expert':
                            return 'bg-red-100 text-red-800'
                          default:
                            return 'bg-gray-100 text-gray-800'
                        }
                      }

                      return (
                        <div
                          key={instruction.id}
                          className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow"
                        >
                          <img
                            src={instruction.coverImageUrl || '/placeholder-instruction.jpg'}
                            alt={instruction.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {instruction.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {instruction.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(instruction.difficulty)}`}
                              >
                                {instruction.difficulty}
                              </span>
                              <span className="text-sm text-gray-500">{instruction.category}</span>
                              {instruction.rating ? (
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <span className="text-sm text-gray-600">
                                    {instruction.rating.toFixed(1)}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInstruction(instruction.id)}
                              disabled={mocInstructionsLoading}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {instruction.downloadCount}
                            </Button>
                            <div className="text-xs">
                              {new Date(instruction.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-white dark:bg-gray-800 border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                🚀 RTK Features
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>✅ Redux Toolkit slices for state management</li>
                <li>✅ Async thunks for API simulation</li>
                <li>✅ Real-time state updates</li>
                <li>✅ Interactive purchase/download actions</li>
                <li>✅ Optimistic UI updates</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">📊 Live Stats</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  Wishlist: {wishlistItems.length} items ($
                  {wishlistStats?.totalValue?.toFixed(2) || '0.00'})
                </li>
                <li>Instructions: {mocInstructions.length} MOCs</li>
                <li>Downloads: {mocInstructionsStats?.totalDownloads || 0} total</li>
                <li>Activities: {recentActivities.length} recent</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                🎯 Try Actions
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Toggle purchase status on wishlist items</li>
                <li>• Download MOC instructions to increment counts</li>
                <li>• Refresh stats to see live updates</li>
                <li>• Watch recent activities update in real-time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
