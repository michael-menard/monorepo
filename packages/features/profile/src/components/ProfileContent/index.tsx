import React, { useEffect, useState } from 'react'
import { ProfileDashboard } from '../ProfileDashboard'
import { ProfileWishlistSection } from '../ProfileWishlistSection'
import { ProfileMocInstructionsSection } from '../ProfileMocInstructionsSection'

// Mock data imports (in a real app, these would come from API/store)
interface WishlistItem {
  id: string
  name: string
  description?: string
  price: number
  url: string
  imageUrl: string
  priority: 'low' | 'medium' | 'high'
  category?: string
  isPurchased: boolean
  createdAt: Date
  updatedAt: Date
}

interface MockInstruction {
  id: string
  title: string
  description: string
  author: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  tags: string[]
  coverImageUrl?: string
  rating?: number
  downloadCount: number
  createdAt: Date
  updatedAt: Date
}

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

interface ProfileContentProps {
  // Data props - in a real app these would come from Redux/RTK Query
  wishlistItems?: WishlistItem[]
  mocInstructions?: MockInstruction[]
  userStats?: UserStats
  recentActivities?: RecentActivity[]
  quickActions?: QuickAction[]

  // Loading states
  loading?: boolean
  wishlistLoading?: boolean
  instructionsLoading?: boolean

  // Configuration
  wishlistLimit?: number
  instructionsLimit?: number
  showViewAllLinks?: boolean
}

export const ProfileContent: React.FC<ProfileContentProps> = ({
  wishlistItems = [],
  mocInstructions = [],
  userStats,
  recentActivities = [],
  quickActions = [],
  loading = false,
  wishlistLoading = false,
  instructionsLoading = false,
  wishlistLimit = 5,
  instructionsLimit = 5,
  showViewAllLinks = true,
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    // Simulate initial data loading
    const timer = setTimeout(() => {
      setIsInitialLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Default user stats if not provided
  const defaultStats: UserStats = {
    totalWishlistItems: wishlistItems.length,
    totalMocInstructions: mocInstructions.length,
    totalDownloads: mocInstructions.reduce(
      (sum, instruction) => sum + instruction.downloadCount,
      0,
    ),
    memberSince: '2023-01-15',
    favoriteCategory: 'Star Wars',
    totalSpent: wishlistItems.reduce((sum, item) => sum + (item.isPurchased ? item.price : 0), 0),
    averageRating:
      mocInstructions.length > 0
        ? mocInstructions.reduce((sum, instruction) => sum + (instruction.rating || 0), 0) /
          mocInstructions.length
        : 0,
    profileViews: 1234,
    followersCount: 89,
    followingCount: 156,
  }

  const stats = userStats || defaultStats

  // Default quick actions if not provided
  const defaultQuickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Upload',
      description: 'Share your MOC',
      icon: 'Upload',
      href: '/upload',
      color: 'primary',
    },
    {
      id: '2',
      title: 'Browse',
      description: 'Discover sets',
      href: '/sets',
      icon: 'Search',
      color: 'secondary',
    },
    {
      id: '3',
      title: 'Downloads',
      description: 'Your files',
      icon: 'Download',
      href: '/downloads',
      color: 'success',
    },
    {
      id: '4',
      title: 'Wishlist',
      description: 'Add items',
      icon: 'Heart',
      href: '/wishlist/new',
      color: 'warning',
    },
    {
      id: '5',
      title: 'Community',
      description: 'Find friends',
      icon: 'Users',
      href: '/community',
      color: 'primary',
    },
    {
      id: '6',
      title: 'Settings',
      description: 'Your account',
      icon: 'Settings',
      href: '/settings',
      color: 'secondary',
    },
  ]

  const actions = quickActions.length > 0 ? quickActions : defaultQuickActions

  if (isInitialLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Dashboard skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>

        {/* Sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Dashboard */}
      <ProfileDashboard
        stats={stats}
        recentActivities={recentActivities}
        quickActions={actions}
        loading={loading}
      />

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wishlist Section */}
        <ProfileWishlistSection
          items={wishlistItems}
          loading={wishlistLoading}
          limit={wishlistLimit}
          showViewAll={showViewAllLinks}
          viewAllHref="/wishlist"
        />

        {/* MOC Instructions Section */}
        <ProfileMocInstructionsSection
          instructions={mocInstructions}
          loading={instructionsLoading}
          limit={instructionsLimit}
          showViewAll={showViewAllLinks}
          viewAllHref="/moc-instructions"
        />
      </div>
    </div>
  )
}
