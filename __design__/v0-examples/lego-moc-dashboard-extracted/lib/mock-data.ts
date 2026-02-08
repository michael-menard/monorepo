import type {
  DashboardStats,
  BuildStatus,
  ThemeBreakdown,
  RecentMoc,
  PartsCoverage,
  PartialMoc,
  ActivityItem,
} from "./types"

export const dashboardStats: DashboardStats = {
  totalMocs: 47,
  wishlistCount: 12,
  themeCount: 8,
  buildProgress: 68,
}

export const buildStatus: BuildStatus = {
  added: 15,
  inProgress: 8,
  built: 24,
}

export const themeBreakdown: ThemeBreakdown[] = [
  { theme: "Star Wars", mocCount: 14, setCount: 8 },
  { theme: "Technic", mocCount: 11, setCount: 6 },
  { theme: "City", mocCount: 9, setCount: 12 },
  { theme: "Creator", mocCount: 7, setCount: 5 },
  { theme: "Architecture", mocCount: 6, setCount: 3 },
]

export const recentMocs: RecentMoc[] = [
  {
    id: "1",
    title: "UCS Millennium Falcon",
    thumbnail: null,
    createdAt: "2026-02-01T10:00:00Z",
    theme: "Star Wars",
  },
  {
    id: "2",
    title: "Bugatti Chiron",
    thumbnail: null,
    createdAt: "2026-01-31T15:30:00Z",
    theme: "Technic",
  },
  {
    id: "3",
    title: "Modular Police Station",
    thumbnail: null,
    createdAt: "2026-01-30T09:15:00Z",
    theme: "City",
  },
  {
    id: "4",
    title: "AT-AT Walker",
    thumbnail: null,
    createdAt: "2026-01-28T14:00:00Z",
    theme: "Star Wars",
  },
  {
    id: "5",
    title: "Taj Mahal",
    thumbnail: null,
    createdAt: "2026-01-25T11:45:00Z",
    theme: "Architecture",
  },
]

export const partsCoverage: PartsCoverage = {
  fullInventory: 24,
  partialOrdered: 8,
  missingParts: 15,
}

export const partialMocs: PartialMoc[] = [
  {
    id: "1",
    name: "Death Star II",
    theme: "Star Wars",
    coverage: 78,
    lastUpdated: "2026-02-02T10:00:00Z",
  },
  {
    id: "2",
    name: "Liebherr R 9800",
    theme: "Technic",
    coverage: 65,
    lastUpdated: "2026-02-01T14:30:00Z",
  },
  {
    id: "3",
    name: "Imperial Star Destroyer",
    theme: "Star Wars",
    coverage: 52,
    lastUpdated: "2026-01-30T09:00:00Z",
  },
  {
    id: "4",
    name: "Colosseum",
    theme: "Architecture",
    coverage: 45,
    lastUpdated: "2026-01-28T16:20:00Z",
  },
  {
    id: "5",
    name: "Ferrari Daytona SP3",
    theme: "Technic",
    coverage: 38,
    lastUpdated: "2026-01-26T11:15:00Z",
  },
]

export const activityFeed: ActivityItem[] = [
  {
    id: "1",
    type: "added",
    message: "Added new MOC: UCS Millennium Falcon",
    timestamp: "2026-02-03T08:30:00Z",
  },
  {
    id: "2",
    type: "built",
    message: "Marked as Built: AT-AT Walker",
    timestamp: "2026-02-02T16:45:00Z",
  },
  {
    id: "3",
    type: "wishlist",
    message: "Added 3 items to wishlist",
    timestamp: "2026-02-02T10:20:00Z",
  },
  {
    id: "4",
    type: "progress",
    message: "Updated progress: Bugatti Chiron (75%)",
    timestamp: "2026-02-01T14:00:00Z",
  },
  {
    id: "5",
    type: "added",
    message: "Added new MOC: Modular Police Station",
    timestamp: "2026-01-31T09:15:00Z",
  },
]
