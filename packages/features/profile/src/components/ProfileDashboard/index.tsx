import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
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
  Upload
} from 'lucide-react';

interface UserStats {
  totalWishlistItems: number;
  totalMocInstructions: number;
  totalDownloads: number;
  memberSince: string;
  favoriteCategory: string;
  totalSpent: number;
  averageRating: number;
  profileViews: number;
  followersCount: number;
  followingCount: number;
}

interface RecentActivity {
  id: string;
  type: 'download' | 'wishlist_add' | 'instruction_upload' | 'review' | 'follow';
  title: string;
  description: string;
  timestamp: Date;
  imageUrl?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

interface ProfileDashboardProps {
  stats: UserStats;
  recentActivities: RecentActivity[];
  quickActions: QuickAction[];
  loading?: boolean;
}

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
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).getFullYear();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

  return (
    <div className="space-y-8">
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
                <span>{stats.averageRating} avg rating</span>
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
                  <a
                    key={action.id}
                    href={action.href}
                    className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${colorMap[action.color]}`}
                  >
                    {IconComponent && <IconComponent className="h-4 w-4" />}
                    <span className="text-sm font-medium">{action.title}</span>
                  </a>
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
              {recentActivities.map((activity) => (
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
    </div>
  );
};
