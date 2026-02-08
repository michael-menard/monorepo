export interface DashboardStats {
  totalMocs: number
  wishlistCount: number
  themeCount: number
  buildProgress: number
}

export interface BuildStatus {
  added: number
  inProgress: number
  built: number
}

export interface ThemeBreakdown {
  theme: string
  mocCount: number
  setCount: number
}

export interface RecentMoc {
  id: string
  title: string
  thumbnail: string | null
  createdAt: string
  theme: string
}

export interface PartsCoverage {
  fullInventory: number
  partialOrdered: number
  missingParts: number
}

export interface PartialMoc {
  id: string
  name: string
  theme: string
  coverage: number
  lastUpdated: string
}

export interface ActivityItem {
  id: string
  type: 'added' | 'built' | 'wishlist' | 'progress'
  message: string
  timestamp: string
}
