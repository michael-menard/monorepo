/**
 * Dashboard Mock Data
 * Realistic LEGO-themed data for development and testing
 */

import type {
  BuildStatus,
  ThemeBreakdown,
  PartsCoverage,
  PartialMoc,
  ActivityItem,
  RecentMocExtended,
  DashboardStatsExtended,
} from '../__types__'

export const dashboardStats: DashboardStatsExtended = {
  totalMocs: 47,
  wishlistCount: 23,
  ownedSetsCount: 31,
  ownedMinifigsCount: 89,
  themeCount: 12,
  plannedBuildsCount: 5,
  buildProgress: 68,
  lastUpdated: new Date().toISOString(),
}

export const buildStatus: BuildStatus = {
  added: 12,
  inProgress: 8,
  built: 27,
}

export const themeBreakdown: ThemeBreakdown[] = [
  {
    theme: 'Star Wars',
    mocCount: 15,
    tags: [
      { tag: 'UCS', mocCount: 6 },
      { tag: 'X-Wing', mocCount: 5 },
      { tag: 'AT-AT', mocCount: 4 },
    ],
  },
  {
    theme: 'Technic',
    mocCount: 12,
    tags: [
      { tag: 'Supercar', mocCount: 7 },
      { tag: 'Crane', mocCount: 5 },
    ],
  },
  {
    theme: 'City',
    mocCount: 8,
    tags: [
      { tag: 'Modular', mocCount: 5 },
      { tag: 'Train', mocCount: 3 },
    ],
  },
  {
    theme: 'Creator',
    mocCount: 6,
    tags: [
      { tag: '3-in-1', mocCount: 4 },
      { tag: 'Expert', mocCount: 2 },
    ],
  },
  {
    theme: 'Architecture',
    mocCount: 4,
    tags: [
      { tag: 'Skyline', mocCount: 3 },
      { tag: 'Landmark', mocCount: 1 },
    ],
  },
  {
    theme: 'Speed Champions',
    mocCount: 2,
    tags: [
      { tag: 'F1', mocCount: 1 },
      { tag: 'Rally', mocCount: 1 },
    ],
  },
]

export const partsCoverage: PartsCoverage = {
  fullInventory: 27,
  partialOrdered: 12,
  missingParts: 8,
}

export const recentMocs: RecentMocExtended[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    title: 'UCS Millennium Falcon',
    slug: 'ucs-millennium-falcon',
    thumbnail: null,
    theme: 'Star Wars',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    title: 'Bugatti Chiron',
    slug: 'bugatti-chiron',
    thumbnail: null,
    theme: 'Technic',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    title: 'Modular Police Station',
    slug: 'modular-police-station',
    thumbnail: null,
    theme: 'City',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
  },
  {
    id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
    title: 'Treehouse',
    slug: 'treehouse',
    thumbnail: null,
    theme: 'Creator',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
  },
  {
    id: 'e5f6a7b8-c9d0-1234-ef01-345678901234',
    title: 'AT-AT Walker',
    slug: 'at-at-walker',
    thumbnail: null,
    theme: 'Star Wars',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
  },
]

export const partialMocs: PartialMoc[] = [
  {
    id: 'f6a7b8c9-d0e1-2345-0123-456789012345',
    name: 'Imperial Star Destroyer',
    theme: 'Star Wars',
    coverage: 78,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'a7b8c9d0-e1f2-3456-1234-567890123456',
    name: 'Lamborghini Sián',
    theme: 'Technic',
    coverage: 45,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'b8c9d0e1-f2a3-4567-2345-678901234567',
    name: 'Haunted House',
    theme: 'Creator',
    coverage: 92,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'c9d0e1f2-a3b4-5678-3456-789012345678',
    name: 'Colosseum',
    theme: 'Architecture',
    coverage: 33,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
]

export const activityFeed: ActivityItem[] = [
  {
    id: 'd0e1f2a3-b4c5-6789-4567-890123456789',
    type: 'added',
    message: 'Added new MOC: UCS Millennium Falcon',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'e1f2a3b4-c5d6-7890-5678-901234567890',
    type: 'built',
    message: 'Marked as Built: Bugatti Chiron',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'f2a3b4c5-d6e7-8901-6789-012345678901',
    type: 'wishlist',
    message: 'Added 3 items to wishlist',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'a3b4c5d6-e7f8-9012-7890-123456789012',
    type: 'progress',
    message: 'Updated parts for Imperial Star Destroyer',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'b4c5d6e7-f8a9-0123-8901-234567890123',
    type: 'added',
    message: 'Added new MOC: Modular Police Station',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
]
