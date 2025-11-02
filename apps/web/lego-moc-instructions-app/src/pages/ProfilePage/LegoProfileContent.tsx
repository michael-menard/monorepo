import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  AppCard,
  Badge,
  Button,
  TabPanel,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui'
import { Gallery } from '@repo/gallery'
import { useGetInstructionsQuery } from '@repo/moc-instructions'
import {
  Bell,
  Blocks,
  BookOpen,
  Calendar,
  Download,
  Edit,
  Eye,
  Github,
  Globe,
  Heart,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Palette,
  Phone,
  Shield,
  Star,
  Trash2,
  Trophy,
  Twitter,
  User,
  Users,
  TrendingUp,
  BarChart3,
  Zap,
} from 'lucide-react'
import type { Profile } from '@repo/profile'
import {
  DoughnutChart,
  LineChart,
  ScatterPlot,
  ScatterPlot3D,
  Heatmap,
  GroupedBarChart,
  ForceDirectedGraph,
  RadialStackedBarChart,
} from '@monorepo/charts'
import { useGetMOCStatsByCategoryQuery, useGetMOCUploadsOverTimeQuery } from '../../services/api'

interface LegoProfileContentProps {
  profile: Profile
  onEdit: () => void
  isEditing: boolean
}

export const LegoProfileContent: React.FC<LegoProfileContentProps> = ({
  profile,
  onEdit,
  isEditing,
}) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch user's MOC instructions
  const {
    data: apiResponse,
    isLoading: mocsLoading,
    error: mocsError,
  } = useGetInstructionsQuery({
    q: '', // Empty query to get all MOCs
    from: 0,
    size: 100, // Get user's MOCs
  })

  // Transform MOCs data for the gallery
  const userMocs = useMemo(() => {
    if (!apiResponse?.mocs) return []

    return apiResponse.mocs.map((moc: any) => ({
      id: moc.id,
      title: moc.title,
      description: moc.description || '',
      author: moc.author || 'User',
      theme: moc.theme || 'modular',
      tags: moc.tags || [],
      coverImageUrl: moc.thumbnailUrl,
      createdAt: moc.createdAt,
      updatedAt: moc.updatedAt,
    }))
  }, [apiResponse])

  // Debug component mount
  useEffect(() => {}, [])

  // Fetch real MOC statistics by category
  const {
    data: mocStatsResponse,
    isLoading: mocStatsLoading,
    error: mocStatsError,
  } = useGetMOCStatsByCategoryQuery()

  // Fetch MOC uploads over time data
  const {
    data: uploadsOverTimeResponse,
    isLoading: uploadsLoading,
    error: uploadsError,
  } = useGetMOCUploadsOverTimeQuery()
  // Debug logging removed

  // Transform the data for the line chart
  const transformUploadsData = (
    rawData: Array<{ date: string; category: string; count: number }>,
  ) => {
    if (!rawData || !Array.isArray(rawData)) return { chartData: [], categories: [] }

    // Get unique categories
    const categories = [...new Set(rawData.map(item => item.category))]

    // Get unique dates
    const dates = [...new Set(rawData.map(item => item.date))].sort()

    // Transform to chart format: array of {date, Category1: count, Category2: count, ...}
    const chartData = dates.map(date => {
      const dataPoint: any = { date }

      // Initialize all categories to 0
      categories.forEach(category => {
        dataPoint[category] = 0
      })

      // Fill in actual counts
      rawData
        .filter(item => item.date === date)
        .forEach(item => {
          dataPoint[item.category] = item.count
        })

      return dataPoint
    })

    return { chartData, categories }
  }

  const { chartData, categories } = uploadsOverTimeResponse?.data
    ? transformUploadsData(uploadsOverTimeResponse.data)
    : { chartData: [], categories: [] }

  // Mock data for sets purchased by manufacturer over time
  const mockSetsPurchasedData = [
    { date: '2024-01', LEGO: 2, 'Mega Construx': 1, KNEX: 0, Cobi: 1 },
    { date: '2024-02', LEGO: 3, 'Mega Construx': 0, KNEX: 1, Cobi: 0 },
    { date: '2024-03', LEGO: 1, 'Mega Construx': 2, KNEX: 0, Cobi: 2 },
    { date: '2024-04', LEGO: 4, 'Mega Construx': 1, KNEX: 2, Cobi: 0 },
    { date: '2024-05', LEGO: 2, 'Mega Construx': 0, KNEX: 1, Cobi: 1 },
    { date: '2024-06', LEGO: 5, 'Mega Construx': 1, KNEX: 0, Cobi: 0 },
    { date: '2024-07', LEGO: 1, 'Mega Construx': 2, KNEX: 1, Cobi: 2 },
    { date: '2024-08', LEGO: 3, 'Mega Construx': 0, KNEX: 0, Cobi: 1 },
    { date: '2024-09', LEGO: 2, 'Mega Construx': 1, KNEX: 2, Cobi: 0 },
    { date: '2024-10', LEGO: 4, 'Mega Construx': 0, KNEX: 1, Cobi: 1 },
  ]

  const setsManufacturers = ['LEGO', 'Mega Construx', 'KNEX', 'Cobi']

  // Mock data for layered scatter plot: Price vs Piece Count by Layer (MOCs, Sets, Wishlist)
  // State for 2D/3D toggle
  const [is3DView, setIs3DView] = useState(false)

  const scatterPlotData = [
    // MOCs (circles) - Your creative builds
    {
      x: 1200,
      y: 85,
      category: 'Space',
      layer: 'MOCs',
      shape: 'circle' as const,
      label: 'Custom Star Destroyer MOC',
    },
    {
      x: 800,
      y: 45,
      category: 'Castle',
      layer: 'MOCs',
      shape: 'circle' as const,
      label: 'Medieval Castle MOC',
    },
    {
      x: 1500,
      y: 120,
      category: 'City',
      layer: 'MOCs',
      shape: 'circle' as const,
      label: 'Modular Building MOC',
    },
    {
      x: 600,
      y: 35,
      category: 'Technic',
      layer: 'MOCs',
      shape: 'circle' as const,
      label: 'Custom Car MOC',
    },

    // Sets (squares) - Your purchased sets
    {
      x: 1000,
      y: 150,
      category: 'Space',
      layer: 'Sets',
      shape: 'square' as const,
      label: 'UCS Millennium Falcon',
    },
    {
      x: 2000,
      y: 280,
      category: 'Space',
      layer: 'Sets',
      shape: 'square' as const,
      label: 'UCS Star Destroyer',
    },
    {
      x: 1500,
      y: 200,
      category: 'Creator',
      layer: 'Sets',
      shape: 'square' as const,
      label: 'Creator Expert Car',
    },
    {
      x: 800,
      y: 90,
      category: 'Architecture',
      layer: 'Sets',
      shape: 'square' as const,
      label: 'Statue of Liberty',
    },
    {
      x: 1200,
      y: 160,
      category: 'Creator',
      layer: 'Sets',
      shape: 'square' as const,
      label: 'Creator House',
    },
    {
      x: 600,
      y: 70,
      category: 'City',
      layer: 'Sets',
      shape: 'square' as const,
      label: 'Police Station',
    },
    {
      x: 900,
      y: 120,
      category: 'Technic',
      layer: 'Sets',
      shape: 'square' as const,
      label: 'Technic Supercar',
    },

    // Wishlist (diamonds) - Sets you want to buy
    {
      x: 3000,
      y: 400,
      category: 'Space',
      layer: 'Wishlist',
      shape: 'diamond' as const,
      label: 'UCS AT-AT',
    },
    {
      x: 2500,
      y: 350,
      category: 'Creator',
      layer: 'Wishlist',
      shape: 'diamond' as const,
      label: 'Titanic',
    },
    {
      x: 1800,
      y: 250,
      category: 'Architecture',
      layer: 'Wishlist',
      shape: 'diamond' as const,
      label: 'Empire State Building',
    },
    {
      x: 1400,
      y: 180,
      category: 'Castle',
      layer: 'Wishlist',
      shape: 'diamond' as const,
      label: 'Medieval Blacksmith',
    },
    {
      x: 1100,
      y: 140,
      category: 'City',
      layer: 'Wishlist',
      shape: 'diamond' as const,
      label: 'Fire Station',
    },
    {
      x: 2200,
      y: 320,
      category: 'Technic',
      layer: 'Wishlist',
      shape: 'diamond' as const,
      label: 'Liebherr Excavator',
    },
  ]

  // Transform 2D data to 3D data (adding Z-axis for layer separation)
  const scatterPlot3DData = scatterPlotData.map(item => ({
    ...item,
    z: item.layer === 'MOCs' ? 0 : item.layer === 'Sets' ? 1 : 2, // Z-axis represents layer
  }))

  // Mock data for heatmap: MOC instruction purchases by theme over months
  const heatmapData = [
    // January through December - MOC instruction purchase activity by theme
    { x: 1, y: 'Space', value: 4 },
    { x: 2, y: 'Space', value: 6 },
    { x: 3, y: 'Space', value: 3 },
    { x: 4, y: 'Space', value: 2 },
    { x: 5, y: 'Space', value: 5 },
    { x: 6, y: 'Space', value: 7 },
    { x: 7, y: 'Space', value: 4 },
    { x: 8, y: 'Space', value: 3 },
    { x: 9, y: 'Space', value: 6 },
    { x: 10, y: 'Space', value: 8 },
    { x: 11, y: 'Space', value: 5 },
    { x: 12, y: 'Space', value: 4 },

    { x: 1, y: 'Castle', value: 2 },
    { x: 2, y: 'Castle', value: 1 },
    { x: 3, y: 'Castle', value: 5 },
    { x: 4, y: 'Castle', value: 7 },
    { x: 5, y: 'Castle', value: 4 },
    { x: 6, y: 'Castle', value: 2 },
    { x: 7, y: 'Castle', value: 1 },
    { x: 8, y: 'Castle', value: 3 },
    { x: 9, y: 'Castle', value: 6 },
    { x: 10, y: 'Castle', value: 8 },
    { x: 11, y: 'Castle', value: 4 },
    { x: 12, y: 'Castle', value: 2 },

    { x: 1, y: 'City', value: 8 },
    { x: 2, y: 'City', value: 6 },
    { x: 3, y: 'City', value: 4 },
    { x: 4, y: 'City', value: 2 },
    { x: 5, y: 'City', value: 1 },
    { x: 6, y: 'City', value: 1 },
    { x: 7, y: 'City', value: 2 },
    { x: 8, y: 'City', value: 3 },
    { x: 9, y: 'City', value: 2 },
    { x: 10, y: 'City', value: 1 },
    { x: 11, y: 'City', value: 1 },
    { x: 12, y: 'City', value: 3 },

    { x: 1, y: 'Creator', value: 1 },
    { x: 2, y: 'Creator', value: 2 },
    { x: 3, y: 'Creator', value: 3 },
    { x: 4, y: 'Creator', value: 2 },
    { x: 5, y: 'Creator', value: 4 },
    { x: 6, y: 'Creator', value: 5 },
    { x: 7, y: 'Creator', value: 6 },
    { x: 8, y: 'Creator', value: 4 },
    { x: 9, y: 'Creator', value: 3 },
    { x: 10, y: 'Creator', value: 2 },
    { x: 11, y: 'Creator', value: 4 },
    { x: 12, y: 'Creator', value: 5 },

    { x: 1, y: 'Technic', value: 0 },
    { x: 2, y: 'Technic', value: 1 },
    { x: 3, y: 'Technic', value: 0 },
    { x: 4, y: 'Technic', value: 2 },
    { x: 5, y: 'Technic', value: 3 },
    { x: 6, y: 'Technic', value: 2 },
    { x: 7, y: 'Technic', value: 1 },
    { x: 8, y: 'Technic', value: 2 },
    { x: 9, y: 'Technic', value: 4 },
    { x: 10, y: 'Technic', value: 3 },
    { x: 11, y: 'Technic', value: 2 },
    { x: 12, y: 'Technic', value: 1 },
  ]

  // Mock data for grouped bar chart: Purchase vs Build by theme
  const groupedBarData = [
    {
      category: 'Space',
      groups: {
        'MOC Plans Purchased': 10,
        'MOCs Built': 8,
        'Sets Purchased': 3,
        'Sets Built': 3, // High completion rate for sets
      },
    },
    {
      category: 'Castle',
      groups: {
        'MOC Plans Purchased': 15,
        'MOCs Built': 12,
        'Sets Purchased': 1,
        'Sets Built': 1, // 100% completion rate
      },
    },
    {
      category: 'City',
      groups: {
        'MOC Plans Purchased': 20,
        'MOCs Built': 4, // The gap you mentioned - buy city plans but don't build them
        'Sets Purchased': 5,
        'Sets Built': 2, // Lower completion rate for city sets too
      },
    },
    {
      category: 'Creator',
      groups: {
        'MOC Plans Purchased': 6,
        'MOCs Built': 4,
        'Sets Purchased': 7,
        'Sets Built': 6, // Good completion rate
      },
    },
    {
      category: 'Technic',
      groups: {
        'MOC Plans Purchased': 3,
        'MOCs Built': 2,
        'Sets Purchased': 4,
        'Sets Built': 3, // Good completion rate
      },
    },
  ]

  // Mock data for force-directed graph: Collection network
  const forceDirectedNodes = [
    // MOCs - Purchased (Green Circles)
    {
      id: 'moc-1',
      title: 'Custom Star Destroyer',
      type: 'moc' as const,
      status: 'purchased' as const,
      theme: 'Space',
      subtheme: 'Star Wars',
      partsCount: 1200,
      author: 'BrickBuilder123',
      setNumber: 'MOC-172552',
    },
    {
      id: 'moc-2',
      title: 'Medieval Castle',
      type: 'moc' as const,
      status: 'purchased' as const,
      theme: 'Castle',
      partsCount: 800,
      author: 'CastleKing',
      setNumber: 'MOC-98765',
    },
    {
      id: 'moc-3',
      title: 'Modular Cafe',
      type: 'moc' as const,
      status: 'purchased' as const,
      theme: 'City',
      subtheme: 'Modular',
      partsCount: 1500,
      author: 'ModularMaster',
      setNumber: 'MOC-45678',
    },

    // MOCs - Wishlist (Amber Circles)
    {
      id: 'moc-4',
      title: 'Space Station Alpha',
      type: 'moc' as const,
      status: 'wishlist' as const,
      theme: 'Space',
      partsCount: 2000,
      author: 'SpaceBuilder',
      setNumber: 'MOC-11111',
    },
    {
      id: 'moc-5',
      title: 'Castle Siege Tower',
      type: 'moc' as const,
      status: 'wishlist' as const,
      theme: 'Castle',
      partsCount: 600,
      author: 'CastleKing',
      setNumber: 'MOC-22222',
    },

    // Sets - Purchased (Green Rectangles)
    {
      id: 'set-1',
      title: 'UCS Millennium Falcon',
      type: 'set' as const,
      status: 'purchased' as const,
      theme: 'Space',
      subtheme: 'Star Wars',
      partsCount: 7541,
      brand: 'LEGO',
      setNumber: '75192',
    },
    {
      id: 'set-2',
      title: 'Creator Expert Car',
      type: 'set' as const,
      status: 'purchased' as const,
      theme: 'Creator',
      partsCount: 1500,
      brand: 'LEGO',
      setNumber: '10294',
    },
    {
      id: 'set-3',
      title: 'Medieval Blacksmith',
      type: 'set' as const,
      status: 'purchased' as const,
      theme: 'Castle',
      partsCount: 2164,
      brand: 'LEGO',
      setNumber: '21325',
    },
    {
      id: 'set-4',
      title: 'Police Station',
      type: 'set' as const,
      status: 'purchased' as const,
      theme: 'City',
      partsCount: 2923,
      brand: 'LEGO',
      setNumber: '10278',
    },

    // Sets - Wishlist (Amber Rectangles)
    {
      id: 'set-5',
      title: 'UCS AT-AT',
      type: 'set' as const,
      status: 'wishlist' as const,
      theme: 'Space',
      subtheme: 'Star Wars',
      partsCount: 6785,
      brand: 'LEGO',
      setNumber: '75313',
    },
    {
      id: 'set-6',
      title: 'Titanic',
      type: 'set' as const,
      status: 'wishlist' as const,
      theme: 'Creator',
      partsCount: 9090,
      brand: 'LEGO',
      setNumber: '10294',
    },
    {
      id: 'set-7',
      title: 'Hogwarts Castle',
      type: 'set' as const,
      status: 'wishlist' as const,
      theme: 'Castle',
      subtheme: 'Harry Potter',
      partsCount: 6020,
      brand: 'LEGO',
      setNumber: '71043',
    },
  ]

  // Mock links showing relationships between items
  const forceDirectedLinks = [
    // Same theme connections
    { source: 'moc-1', target: 'set-1', relationship: 'same-subtheme' as const, strength: 0.8 }, // Both Star Wars
    { source: 'moc-1', target: 'moc-4', relationship: 'same-theme' as const, strength: 0.6 }, // Both Space
    { source: 'moc-1', target: 'set-5', relationship: 'same-subtheme' as const, strength: 0.8 }, // Both Star Wars

    { source: 'moc-2', target: 'set-3', relationship: 'same-theme' as const, strength: 0.7 }, // Both Castle
    { source: 'moc-2', target: 'moc-5', relationship: 'same-author' as const, strength: 0.9 }, // Same author
    { source: 'moc-5', target: 'set-7', relationship: 'same-theme' as const, strength: 0.6 }, // Both Castle

    { source: 'moc-3', target: 'set-4', relationship: 'same-theme' as const, strength: 0.7 }, // Both City

    { source: 'set-2', target: 'set-6', relationship: 'same-theme' as const, strength: 0.6 }, // Both Creator

    // Similar parts count connections
    { source: 'moc-1', target: 'moc-3', relationship: 'similar-parts' as const, strength: 0.4 }, // Similar size
    { source: 'set-3', target: 'set-4', relationship: 'similar-parts' as const, strength: 0.5 }, // Similar size
  ]

  // Mock data for radial stacked bar chart: Collection overview by theme
  const radialStackedBarData = [
    {
      theme: 'Space',
      setsPurchased: 8,
      mocInstructionsPurchased: 12,
      setsBuilt: 6,
    },
    {
      theme: 'Castle',
      setsPurchased: 3,
      mocInstructionsPurchased: 18,
      setsBuilt: 2,
    },
    {
      theme: 'City',
      setsPurchased: 12,
      mocInstructionsPurchased: 25,
      setsBuilt: 8,
    },
    {
      theme: 'Creator',
      setsPurchased: 15,
      mocInstructionsPurchased: 8,
      setsBuilt: 12,
    },
    {
      theme: 'Technic',
      setsPurchased: 6,
      mocInstructionsPurchased: 4,
      setsBuilt: 5,
    },
    {
      theme: 'Architecture',
      setsPurchased: 4,
      mocInstructionsPurchased: 2,
      setsBuilt: 3,
    },
  ]

  // Color palette for consistent theming
  const colorPalette = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#7C3AED', // Violet
  ]

  // Transform API data to chart format, filtering out zero values
  const mocThemeData =
    mocStatsResponse?.data
      ?.filter(stat => stat.count > 0) // Only include categories with actual data
      ?.map((stat, index) => ({
        label: stat.category,
        value: stat.count,
        color: colorPalette[index % colorPalette.length],
      })) || []

  // Debug logging

  // Fallback to mock data if API returns empty data (for testing)
  const finalMocThemeData =
    mocThemeData.length > 0
      ? mocThemeData
      : [
          { label: 'Space', value: 1, color: '#3B82F6' },
          // Only show categories with actual values
        ]

  const setsThemeData = [
    { label: 'Creator', value: 15, color: '#EF4444' },
    { label: 'Architecture', value: 8, color: '#6366F1' },
    { label: 'Friends', value: 6, color: '#EC4899' },
    { label: 'Ninjago', value: 4, color: '#14B8A6' },
  ].filter(item => item.value > 0)

  const wishlistThemeData = [
    { label: 'Star Wars', value: 12, color: '#F97316' },
    { label: 'Harry Potter', value: 7, color: '#7C3AED' },
    { label: 'Marvel', value: 9, color: '#DC2626' },
    { label: 'Ideas', value: 5, color: '#059669' },
  ].filter(item => item.value > 0)

  const inspirationThemeData = [
    { label: 'MOCs', value: 45, color: '#2563EB' },
    { label: 'Techniques', value: 28, color: '#7C2D12' },
    { label: 'Reviews', value: 18, color: '#BE185D' },
    { label: 'News', value: 12, color: '#166534' },
  ].filter(item => item.value > 0)

  // Navigation handlers for the cards
  const handleInstructionsClick = () => {
    router.navigate({ to: '/moc-gallery' })
  }

  const handleSetsClick = () => {
    router.navigate({ to: '/moc-gallery' }) // For now, both go to MOC gallery
  }

  const handleWishlistClick = () => {
    router.navigate({ to: '/wishlist' })
  }

  const handleInspirationClick = () => {
    router.navigate({ to: '/inspiration-gallery' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          <AppCard title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">
                      {profile.firstName} {profile.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>
                {profile.phone ? (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{profile.phone}</p>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-4">
                {profile.location ? (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{profile.location}</p>
                    </div>
                  </div>
                ) : null}
                {profile.website ? (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Website</p>
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  </div>
                ) : null}
                {profile.dateOfBirth ? (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Birth Date</p>
                      <p className="font-medium">{formatDate(profile.dateOfBirth)}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </AppCard>

          {profile.bio ? (
            <AppCard title="Bio">
              <p className="text-gray-700">{profile.bio}</p>
            </AppCard>
          ) : null}

          {profile.socialLinks ? (
            <AppCard title="Social Links">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {profile.socialLinks.twitter ? (
                  <a
                    href={profile.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Twitter className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Twitter</span>
                  </a>
                ) : null}
                {profile.socialLinks.linkedin ? (
                  <a
                    href={profile.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Linkedin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">LinkedIn</span>
                  </a>
                ) : null}
                {profile.socialLinks.github ? (
                  <a
                    href={profile.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Github className="h-4 w-4 text-gray-800" />
                    <span className="text-sm font-medium">GitHub</span>
                  </a>
                ) : null}
                {profile.socialLinks.instagram ? (
                  <a
                    href={profile.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium">Instagram</span>
                  </a>
                ) : null}
              </div>
            </AppCard>
          ) : null}
        </div>
      ),
    },
    {
      id: 'lego-stats',
      label: 'LEGO Stats',
      content: (
        <div className="space-y-6">
          <AppCard title="MOC Statistics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">12</div>
                <div className="text-sm text-gray-600">MOCs Created</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">1.2k</div>
                <div className="text-sm text-gray-600">Downloads</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">4.8</div>
                <div className="text-sm text-gray-600">Avg Rating</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">847</div>
                <div className="text-sm text-gray-600">Views</div>
              </div>
            </div>
          </AppCard>

          <AppCard title="Recent Activity">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Download className="h-4 w-4 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">New MOC uploaded</p>
                  <p className="text-sm text-gray-500">"Space Station Alpha" - 2 days ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Star className="h-4 w-4 text-yellow-500" />
                <div className="flex-1">
                  <p className="font-medium">Received 5-star rating</p>
                  <p className="text-sm text-gray-500">"Castle Fortress" - 1 week ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Heart className="h-4 w-4 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium">MOC favorited</p>
                  <p className="text-sm text-gray-500">"Robot Companion" - 2 weeks ago</p>
                </div>
              </div>
            </div>
          </AppCard>

          <AppCard title="Favorite Categories">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Space</Badge>
              <Badge variant="outline">Castles</Badge>
              <Badge variant="outline">Vehicles</Badge>
              <Badge variant="outline">Robots</Badge>
              <Badge variant="outline">Architecture</Badge>
            </div>
          </AppCard>
        </div>
      ),
    },
    {
      id: 'preferences',
      label: 'Preferences',
      content: (
        <div className="space-y-6">
          <AppCard title="Notification Settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive email updates about your MOCs</p>
                  </div>
                </div>
                <Badge variant={profile.preferences?.emailNotifications ? 'default' : 'secondary'}>
                  {profile.preferences?.emailNotifications ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">
                      Receive push notifications in your browser
                    </p>
                  </div>
                </div>
                <Badge variant={profile.preferences?.pushNotifications ? 'default' : 'secondary'}>
                  {profile.preferences?.pushNotifications ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </AppCard>

          <AppCard title="Privacy Settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Public Profile</p>
                    <p className="text-sm text-gray-500">Allow others to view your profile</p>
                  </div>
                </div>
                <Badge variant={profile.preferences?.publicProfile ? 'default' : 'secondary'}>
                  {profile.preferences?.publicProfile ? 'Public' : 'Private'}
                </Badge>
              </div>
            </div>
          </AppCard>

          <AppCard title="Theme Settings">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-gray-500">Choose your preferred theme</p>
                </div>
              </div>
              <Badge variant="outline">{profile.preferences?.theme || 'system'}</Badge>
            </div>
          </AppCard>
        </div>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      content: (
        <div className="space-y-6">
          <AppCard title="Account Security">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Email Address</p>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Change Email
                </Button>
              </div>
            </div>
          </AppCard>

          <AppCard title="Danger Zone">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="font-medium text-red-900">Delete Account</p>
                    <p className="text-sm text-red-700">
                      Permanently delete your account and all data
                    </p>
                  </div>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </div>
          </AppCard>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MOCs Card */}
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-0 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10"
          onClick={handleInstructionsClick}
        >
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-foreground mb-4">MOCs</h3>
            <div className="flex justify-center mb-2">
              {mocStatsLoading ? (
                <div className="w-[120px] h-[120px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : mocStatsError || finalMocThemeData.length === 0 ? (
                <div className="w-[120px] h-[120px] flex items-center justify-center bg-muted rounded-full">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🧱</div>
                    <div className="text-xs text-muted-foreground">No MOCs</div>
                  </div>
                </div>
              ) : (
                <DoughnutChart
                  data={finalMocThemeData}
                  width={180}
                  height={180}
                  showLeaderLines={true}
                  animate={true}
                  duration={1000}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sets Card */}
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-0"
          onClick={handleSetsClick}
          style={{
            backgroundColor: 'hsl(198 42% 82% / 0.2)',
            backgroundImage:
              'linear-gradient(135deg, hsl(198 42% 82% / 0.2) 0%, hsl(198 42% 82% / 0.1) 100%)',
          }}
        >
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-foreground mb-4">Sets</h3>
            <div className="flex justify-center mb-2">
              <DoughnutChart
                data={setsThemeData}
                width={180}
                height={180}
                showLeaderLines={true}
                animate={true}
                duration={1000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Wishlist Card */}
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-0 bg-gradient-to-br from-accent/10 to-accent/5 dark:from-accent/20 dark:to-accent/10"
          onClick={handleWishlistClick}
        >
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-foreground mb-4">Wishlist</h3>
            <div className="flex justify-center mb-2">
              <DoughnutChart
                data={wishlistThemeData}
                width={180}
                height={180}
                showLeaderLines={true}
                animate={true}
                duration={1000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inspiration Gallery Card */}
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-0 bg-gradient-to-br from-secondary/20 to-secondary/10 dark:from-secondary/10 dark:to-secondary/5"
          onClick={handleInspirationClick}
        >
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-foreground mb-4">Inspiration</h3>
            <div className="flex justify-center mb-2">
              <DoughnutChart
                data={inspirationThemeData}
                width={180}
                height={180}
                showLeaderLines={true}
                animate={true}
                duration={1000}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* MOC Uploads Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              MOC Uploads Over Time
            </CardTitle>
            <CardDescription>
              Track your MOC creation activity by category over the past year
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : uploadsError || !uploadsOverTimeResponse?.data || chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upload data available</p>
                </div>
              </div>
            ) : (
              <LineChart
                data={chartData}
                categories={categories}
                width={500}
                height={250}
                animate={true}
                duration={1000}
              />
            )}
          </CardContent>
        </Card>

        {/* Sets Purchased by Manufacturer Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sets Purchased by Manufacturer
            </CardTitle>
            <CardDescription>Track your set purchases by manufacturer over time</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={mockSetsPurchasedData}
              categories={setsManufacturers}
              width={500}
              height={250}
              animate={true}
              duration={1000}
            />
          </CardContent>
        </Card>
      </div>

      {/* Price vs Piece Count Scatter Plot */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Price vs Piece Count Analysis
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIs3DView(false)}
                  className={`px-3 py-1 text-sm rounded ${
                    !is3DView
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  2D
                </button>
                <button
                  onClick={() => setIs3DView(true)}
                  className={`px-3 py-1 text-sm rounded ${
                    is3DView
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  3D
                </button>
              </div>
            </CardTitle>
            <CardDescription>
              {is3DView
                ? 'Explore your collection in 3D space - drag to rotate, MOCs/Sets/Wishlist on different Z-levels'
                : 'Compare value across your MOCs (●), purchased sets (■), and wishlist (◆) by theme'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {is3DView ? (
              <ScatterPlot3D
                data={scatterPlot3DData}
                width={800}
                height={500}
                xLabel="Piece Count"
                yLabel="Price ($)"
                zLabel="Collection Type"
                animate={true}
              />
            ) : (
              <ScatterPlot
                data={scatterPlotData}
                width={800}
                height={400}
                xLabel="Piece Count"
                yLabel="Price ($)"
                layered={true}
                layerOpacity={{ MOCs: 0.9, Sets: 0.7, Wishlist: 0.5 }}
                animate={true}
                duration={1000}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* MOC Purchase Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              MOC Purchase Activity
            </CardTitle>
            <CardDescription>
              Your buying patterns - when do you purchase MOC instructions by theme over the months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Heatmap
              data={heatmapData}
              width={500}
              height={300}
              xLabel="Month of Year"
              yLabel="Theme"
              animate={true}
              duration={1000}
            />
          </CardContent>
        </Card>

        {/* Purchase vs Build Grouped Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Purchase vs Build Analysis
            </CardTitle>
            <CardDescription>
              Compare purchase vs build completion rates for both MOC plans and official sets by
              theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={groupedBarData}
              width={500}
              height={300}
              xLabel="Theme"
              yLabel="Count"
              animate={true}
              duration={1000}
            />
          </CardContent>
        </Card>
      </div>

      {/* Collection Network Graph */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Collection Network
            </CardTitle>
            <CardDescription>
              Interactive network showing relationships between your MOCs and Sets - drag nodes,
              zoom, and explore connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForceDirectedGraph
              nodes={forceDirectedNodes}
              links={forceDirectedLinks}
              width={900}
              height={600}
              showLegend={true}
              enableZoom={true}
              enableDrag={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Radial Collection Overview */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Collection Overview by Theme
            </CardTitle>
            <CardDescription>
              Radial view of your collection - sets purchased, MOC instructions bought, and sets
              actually built by theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadialStackedBarChart
              data={radialStackedBarData}
              width={600}
              height={600}
              innerRadius={80}
              outerRadius={250}
              animate={true}
              duration={1000}
              showLegend={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="mocs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mocs" className="flex items-center gap-2">
            <Blocks className="h-4 w-4" />
            MOCs
          </TabsTrigger>
          <TabsTrigger value="instructions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Instructions
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mocs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="h-5 w-5" />
                My Original Creations ({userMocs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mocsLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p>Loading your MOCs...</p>
                </div>
              ) : mocsError ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Error loading MOCs</p>
                  <p className="text-sm">Please try again later</p>
                </div>
              ) : userMocs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No MOCs created yet</p>
                  <p className="text-sm">Upload your first MOC to get started!</p>
                  <Button className="mt-4" onClick={() => router.navigate({ to: '/moc-gallery' })}>
                    Create Your First MOC
                  </Button>
                </div>
              ) : (
                <Gallery
                  images={userMocs.map(moc => ({
                    id: moc.id,
                    url: moc.coverImageUrl || '/placeholder-instruction.jpg',
                    title: moc.title,
                    description: moc.description,
                    author: moc.author,
                    tags: moc.tags,
                    createdAt: new Date(moc.createdAt),
                    updatedAt: new Date(moc.updatedAt),
                  }))}
                  layout="grid"
                  onImageClick={image => {
                    router.navigate({ to: `/moc-detail/${image.id}` })
                  }}
                  className="mt-4"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Building Instructions (8)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Instruction sets will be displayed here</p>
                <p className="text-sm">Create detailed building guides for your MOCs!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Favorite MOCs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Favorite MOCs will be displayed here</p>
                <p className="text-sm">Heart MOCs you love to save them here!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Building Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <h4 className="font-semibold">First MOC</h4>
                    <p className="text-sm text-muted-foreground">
                      Created your first original design
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Zap className="h-8 w-8 text-blue-500" />
                  <div>
                    <h4 className="font-semibold">Quick Builder</h4>
                    <p className="text-sm text-muted-foreground">
                      Completed 10 builds in one month
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Users className="h-8 w-8 text-green-500" />
                  <div>
                    <h4 className="font-semibold">Community Favorite</h4>
                    <p className="text-sm text-muted-foreground">Received 100+ likes on a MOC</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Star className="h-8 w-8 text-purple-500" />
                  <div>
                    <h4 className="font-semibold">Master Builder</h4>
                    <p className="text-sm text-muted-foreground">Created 50+ original MOCs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
