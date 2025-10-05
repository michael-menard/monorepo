import { getWishlistStats } from './wishlist';
import { getMocInstructionStats } from './moc-instructions';

/**
 * User profile statistics
 */
export interface UserStats {
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

/**
 * Recent activity item
 */
export interface RecentActivity {
  id: string;
  type: 'download' | 'wishlist_add' | 'instruction_upload' | 'review' | 'follow';
  title: string;
  description: string;
  timestamp: Date;
  imageUrl?: string;
  relatedId?: string;
}

/**
 * Quick action item
 */
export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

/**
 * Mock user statistics
 */
export const mockUserStats: UserStats = {
  totalWishlistItems: getWishlistStats().total,
  totalMocInstructions: getMocInstructionStats().total,
  totalDownloads: getMocInstructionStats().totalDownloads,
  memberSince: '2023-01-15',
  favoriteCategory: 'Star Wars',
  totalSpent: 2847.50,
  averageRating: getMocInstructionStats().averageRating,
  profileViews: 1234,
  followersCount: 89,
  followingCount: 156,
};

/**
 * Mock recent activities
 */
export const mockRecentActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'download',
    title: 'Downloaded Custom Batmobile',
    description: 'Downloaded MOC instructions by BrickMaster3000',
    timestamp: new Date('2024-01-15T14:30:00Z'),
    imageUrl: '/images/mocs/custom-batmobile.jpg',
    relatedId: '1',
  },
  {
    id: '2',
    type: 'wishlist_add',
    title: 'Added Millennium Falcon to Wishlist',
    description: 'Added LEGO set 75257 to high priority wishlist',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    imageUrl: '/images/sets/millennium-falcon.jpg',
    relatedId: '1',
  },
  {
    id: '3',
    type: 'review',
    title: 'Reviewed Medieval Castle',
    description: 'Left a 5-star review for CastleBuilder42\'s instructions',
    timestamp: new Date('2024-01-14T16:45:00Z'),
    imageUrl: '/images/mocs/medieval-castle.jpg',
    relatedId: '2',
  },
  {
    id: '4',
    type: 'follow',
    title: 'Started following SpaceBuilder99',
    description: 'Now following SpaceBuilder99 for space-themed MOCs',
    timestamp: new Date('2024-01-13T11:20:00Z'),
    relatedId: 'user-123',
  },
  {
    id: '5',
    type: 'instruction_upload',
    title: 'Uploaded Custom X-Wing Fighter',
    description: 'Published new MOC instructions with 45 steps',
    timestamp: new Date('2024-01-12T09:15:00Z'),
    imageUrl: '/images/mocs/custom-xwing.jpg',
    relatedId: '5',
  },
];

/**
 * Mock quick actions
 */
export const mockQuickActions: QuickAction[] = [
  {
    id: '1',
    title: 'Upload Instructions',
    description: 'Share your MOC with the community',
    icon: 'Upload',
    href: '/upload',
    color: 'primary',
  },
  {
    id: '2',
    title: 'Browse Sets',
    description: 'Discover new LEGO sets',
    href: '/sets',
    icon: 'Search',
    color: 'secondary',
  },
  {
    id: '3',
    title: 'My Downloads',
    description: 'View your downloaded instructions',
    icon: 'Download',
    href: '/downloads',
    color: 'success',
  },
  {
    id: '4',
    title: 'Create Wishlist',
    description: 'Start a new wishlist',
    icon: 'Heart',
    href: '/wishlist/new',
    color: 'warning',
  },
  {
    id: '5',
    title: 'Find Friends',
    description: 'Connect with other builders',
    icon: 'Users',
    href: '/community',
    color: 'primary',
  },
  {
    id: '6',
    title: 'Settings',
    description: 'Manage your account',
    icon: 'Settings',
    href: '/settings',
    color: 'secondary',
  },
];

/**
 * Get recent activities by type
 */
export const getRecentActivitiesByType = (type: RecentActivity['type']): RecentActivity[] => {
  return mockRecentActivities.filter(activity => activity.type === type);
};

/**
 * Get recent activities (limited)
 */
export const getRecentActivities = (limit: number = 5): RecentActivity[] => {
  return mockRecentActivities.slice(0, limit);
};

/**
 * Get quick actions by category
 */
export const getQuickActionsByColor = (color: QuickAction['color']): QuickAction[] => {
  return mockQuickActions.filter(action => action.color === color);
};

/**
 * Get profile dashboard data
 */
export const getProfileDashboardData = () => {
  return {
    stats: mockUserStats,
    recentActivities: getRecentActivities(5),
    quickActions: mockQuickActions.slice(0, 6),
  };
};
