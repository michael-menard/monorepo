import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
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
} from 'lucide-react'

interface UserStats {
  totalWishlistItems: number
  totalMocInstructions: number
  totalDownloads: number
  memberSince: string
  favoriteCategory: string
  totalSpent: number
  averageRating: number
  profileViews: number
  followersCount: number
  followingCount: number
}

interface RecentActivity {
  id: string
  type: 'download' | 'wishlist_add' | 'instruction_upload' | 'review' | 'follow'
  title: string
  description: string
  timestamp: Date
  imageUrl?: string
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href: string
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

interface ProfileDashboardProps {
  stats: UserStats
  recentActivities: RecentActivity[]
  quickActions: QuickAction[]
  loading?: boolean
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

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  stats,
  recentActivities,
  quickActions,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).getFullYear()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
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

  const getActivityColor = (type: RecentActivity['type']) => {
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

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-accent/10 to-accent/5 dark:from-accent/20 dark:to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/20 dark:bg-accent/30 rounded-lg">
                  <Heart className="h-6 w-6 text-accent dark:text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">Wishlist</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Total value: {formatCurrency(stats.totalSpent)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-accent">{stats.totalWishlistItems}</div>
                <div className="text-sm text-muted-foreground">Items</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/20 dark:bg-primary/30 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary dark:text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Instructions
                  </CardTitle>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3 text-warning" />
                    <span>{stats.averageRating.toFixed(1)} avg rating</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{stats.totalMocInstructions}</div>
                <div className="text-sm text-muted-foreground">MOCs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-success/10 to-success/5 dark:from-success/20 dark:to-success/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/20 dark:bg-success/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-success dark:text-success" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">Activity</CardTitle>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Since {formatDate(stats.memberSince)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-success">{stats.totalDownloads}</div>
                <div className="text-sm text-muted-foreground">Downloads</div>
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
                  <a
                    key={action.id}
                    href={action.href}
                    className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${colorMap[action.color]}`}
                  >
                    {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
                    <span className="text-sm font-medium">{action.title}</span>
                  </a>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map(activity => (
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
                    <img src={activity.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
