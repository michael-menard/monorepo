export interface DashboardStats {
  totalMocs: number
  wishlistCount: number
  themeCount: number
  lastUpdated: string | null
}

export interface ThemeBreakdownItem {
  theme: string
  mocCount: number
  setCount: number
}

export interface RecentMoc {
  id: string
  title: string
  slug: string | null
  thumbnailS3Key: string | null
  theme: string | null
  createdAt: string
}

export interface ActivityItem {
  id: string
  type: 'added' | 'progress'
  message: string
  timestamp: string
}

export interface DashboardData {
  stats: DashboardStats
  themeBreakdown: ThemeBreakdownItem[]
  recentMocs: RecentMoc[]
  activityFeed: ActivityItem[]
}

export interface TagWithThemes {
  tag: string
  themes: string[]
  mocCount: number
}

export interface DashboardRepository {
  getStats(userId: string): Promise<DashboardStats>
  getThemeBreakdown(userId: string): Promise<ThemeBreakdownItem[]>
  getRecentMocs(userId: string, limit: number): Promise<RecentMoc[]>
  getActivityFeed(userId: string, limit: number): Promise<ActivityItem[]>
  getUserTags(userId: string): Promise<TagWithThemes[]>
  getDistinctThemes(): Promise<string[]>
  createTheme(name: string): Promise<void>
  deleteTheme(name: string): Promise<void>
  addTagThemeMappings(mappings: { tag: string; theme: string }[]): Promise<void>
  removeTagThemeMapping(tag: string, theme: string): Promise<void>
}
