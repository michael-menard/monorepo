import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@repo/ui';
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
  ArrowRight
} from 'lucide-react';

// Import mock data (in a real app, this would come from Redux/RTK Query)
import {
  mockWishlistItems,
  mockMocInstructions,
  mockUserStats,
  mockRecentActivities,
  mockQuickActions,
  type WishlistItem,
  type MockInstruction,
  type UserStats,
  type RecentActivity,
  type QuickAction,
} from '@repo/mock-data';

/**
 * Demo page showing the new ProfileContent component
 * This demonstrates how to use the centralized mock data and
 * the new profile components with gallery integration
 */
export default function ProfileContentDemo() {
  // In a real app, these would come from Redux store
  const [loading, setLoading] = React.useState(true);
  const [wishlistItems, setWishlistItems] = React.useState<WishlistItem[]>([]);
  const [mocInstructions, setMocInstructions] = React.useState<MockInstruction[]>([]);
  const [userStats, setUserStats] = React.useState<UserStats | undefined>();
  const [recentActivities, setRecentActivities] = React.useState<RecentActivity[]>([]);
  const [quickActions, setQuickActions] = React.useState<QuickAction[]>([]);

  // Simulate loading data
  React.useEffect(() => {
    const loadData = async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setWishlistItems(mockWishlistItems);
      setMocInstructions(mockMocInstructions);
      setUserStats(mockUserStats);
      setRecentActivities(mockRecentActivities);
      setQuickActions(mockQuickActions);
      setLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Profile Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your LEGO collection and MOC instructions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Demo Mode
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Using @repo/mock-data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <ProfileContentSimplified
        wishlistItems={wishlistItems}
        mocInstructions={mocInstructions}
        userStats={userStats}
        recentActivities={recentActivities}
        quickActions={quickActions}
        loading={loading}
      />

      {/* Footer Info */}
      <div className="bg-white dark:bg-gray-800 border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                🎯 What's New
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>✅ Centralized mock data in @repo/mock-data</li>
                <li>✅ Gallery integration with feature adapters</li>
                <li>✅ Responsive dashboard with stats cards</li>
                <li>✅ List mode for wishlist and instructions</li>
                <li>✅ Quick actions and recent activity</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                📦 Packages Used
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>@repo/mock-data - Centralized test data</li>
                <li>@repo/features-profile - Profile components</li>
                <li>@repo/gallery - Gallery with adapters</li>
                <li>@repo/ui - Shared UI components</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                🚀 Next Steps
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Connect to Redux/RTK Query</li>
                <li>Add real API endpoints</li>
                <li>Implement user authentication</li>
                <li>Add more interactive features</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified ProfileContent component for demo purposes
interface ProfileContentSimplifiedProps {
  wishlistItems: WishlistItem[];
  mocInstructions: MockInstruction[];
  userStats?: UserStats;
  recentActivities: RecentActivity[];
  quickActions: QuickAction[];
  loading: boolean;
}

const ProfileContentSimplified: React.FC<ProfileContentSimplifiedProps> = ({
  wishlistItems,
  mocInstructions,
  userStats,
  recentActivities,
  quickActions,
  loading,
}) => {
  const iconMap = {
    Upload,
    Search,
    Download,
    Heart,
    Users,
    Settings,
    Plus,
  };

  const colorMap = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).getFullYear();
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'download': return <Download className="h-4 w-4" />;
      case 'wishlist_add': return <Heart className="h-4 w-4" />;
      case 'instruction_upload': return <Upload className="h-4 w-4" />;
      case 'review': return <Star className="h-4 w-4" />;
      case 'follow': return <Users className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'download': return 'text-blue-600';
      case 'wishlist_add': return 'text-red-600';
      case 'instruction_upload': return 'text-green-600';
      case 'review': return 'text-yellow-600';
      case 'follow': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Dashboard skeleton */}
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

        {/* Sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = userStats || {
    totalWishlistItems: wishlistItems.length,
    totalMocInstructions: mocInstructions.length,
    totalDownloads: mocInstructions.reduce((sum, instruction) => sum + instruction.downloadCount, 0),
    memberSince: '2023-01-15',
    favoriteCategory: 'Star Wars',
    totalSpent: wishlistItems.reduce((sum, item) => sum + (item.isPurchased ? item.price : 0), 0),
    averageRating: mocInstructions.length > 0
      ? mocInstructions.reduce((sum, instruction) => sum + (instruction.rating || 0), 0) / mocInstructions.length
      : 0,
    profileViews: 1234,
    followersCount: 89,
    followingCount: 156,
  };

  return (
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
                <span className="text-2xl font-bold text-red-600">{stats.totalWishlistItems}</span>
                <span className="text-sm text-gray-500">Items</span>
              </div>
              <div className="text-sm text-gray-600">
                Total value: {formatCurrency(stats.totalSpent)}
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
                <span className="text-2xl font-bold text-blue-600">{stats.totalMocInstructions}</span>
                <span className="text-sm text-gray-500">MOCs</span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Star className="h-3 w-3 text-yellow-500" />
                <span>{stats.averageRating.toFixed(1)} avg rating</span>
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
                <span className="text-2xl font-bold text-green-600">{stats.totalDownloads}</span>
                <span className="text-sm text-gray-500">Downloads</span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-3 w-3" />
                <span>Member since {formatDate(stats.memberSince)}</span>
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
              {quickActions.slice(0, 6).map((action) => {
                const IconComponent = iconMap[action.icon as keyof typeof iconMap];
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className={`flex items-center space-x-2 p-3 h-auto ${colorMap[action.color]}`}
                    asChild
                  >
                    <a href={action.href}>
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      <span className="text-sm font-medium">{action.title}</span>
                    </a>
                  </Button>
                );
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
              {recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className={`mt-1 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                  {activity.imageUrl && (
                    <img
                      src={activity.imageUrl}
                      alt=""
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
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
                  ({wishlistItems.filter(item => !item.isPurchased).length} items)
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href="/wishlist" className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700">
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
                {wishlistItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow">
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
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.priority === 'high' ? 'bg-red-100 text-red-800' :
                          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.priority} priority
                        </span>
                        {item.isPurchased && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Purchased
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
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
                <a href="/moc-instructions" className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700">
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
                {mocInstructions.slice(0, 5).map((instruction) => {
                  const getDifficultyColor = (difficulty: string) => {
                    switch (difficulty) {
                      case 'beginner': return 'bg-green-100 text-green-800';
                      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
                      case 'advanced': return 'bg-orange-100 text-orange-800';
                      case 'expert': return 'bg-red-100 text-red-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };

                  return (
                    <div key={instruction.id} className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow">
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
                          <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(instruction.difficulty)}`}>
                            {instruction.difficulty}
                          </span>
                          <span className="text-sm text-gray-500">
                            {instruction.category}
                          </span>
                          {instruction.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-sm text-gray-600">
                                {instruction.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Download className="h-4 w-4" />
                          <span>{instruction.downloadCount}</span>
                        </div>
                        <div className="text-xs">
                          {new Date(instruction.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
