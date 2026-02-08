/**
 * Mock data for Instructions Gallery API (MSW handlers)
 * Story INST-1100: MOC Gallery E2E tests
 *
 * This mock data matches the MocInstructionsSchema from @repo/api-client
 */

export interface MockDesigner {
  username: string
  displayName?: string | null
  profileUrl?: string | null
  avatarUrl?: string | null
  socialLinks?: {
    instagram?: string | null
    twitter?: string | null
    youtube?: string | null
    website?: string | null
  } | null
}

export interface MockDimensions {
  height?: { cm?: number | null; inches?: number | null } | null
  width?: { cm?: number | null; inches?: number | null } | null
  depth?: { cm?: number | null; inches?: number | null } | null
  weight?: { kg?: number | null; lbs?: number | null } | null
  studsWidth?: number | null
  studsDepth?: number | null
}

export interface MockInstructionsMetadata {
  instructionType?: 'pdf' | 'xml' | 'studio' | 'ldraw' | 'lxf' | 'other' | null
  hasInstructions: boolean
  pageCount?: number | null
  fileSize?: number | null
  previewImages: string[]
}

export interface MockFeature {
  title: string
  description?: string | null
  icon?: string | null
}

export interface MockMocInstruction {
  id: string // UUID format
  userId: string
  title: string
  description: string | null
  type: 'moc' | 'set'

  // Core Identification
  mocId: string | null
  slug: string | null

  // MOC-specific fields
  author: string | null
  partsCount: number | null
  minifigCount: number | null
  theme: string | null
  themeId: number | null
  subtheme: string | null
  uploadedDate: string | null

  // Set-specific fields
  brand: string | null
  setNumber: string | null
  releaseYear: number | null
  retired: boolean | null

  // Extended Metadata
  designer: MockDesigner | null
  dimensions: MockDimensions | null
  instructionsMetadata: MockInstructionsMetadata | null
  features: MockFeature[] | null

  // Rich Description
  descriptionHtml: string | null
  shortDescription: string | null

  // Difficulty & Build Info
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
  buildTimeHours: number | null
  ageRecommendation: string | null

  // Status & Visibility
  status: 'draft' | 'published' | 'archived' | 'pending_review'
  visibility: 'public' | 'private' | 'unlisted'
  isFeatured: boolean
  isVerified: boolean

  // Common fields
  tags: string[] | null
  thumbnailUrl: string | null
  totalPieceCount: number | null

  // Timestamps
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MockMocListResponse {
  items: MockMocInstruction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Canonical MOC instructions mock items used by MSW and tests
export const mockMocInstructions: MockMocInstruction[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: 'test-user-123',
    title: 'Custom X-Wing Starfighter',
    description: 'A custom build of the iconic X-Wing from Star Wars',
    type: 'moc',

    mocId: 'MOC-001',
    slug: 'custom-x-wing-starfighter',

    author: 'BrickMaster42',
    partsCount: 1250,
    minifigCount: 1,
    theme: 'Star Wars',
    themeId: 158,
    subtheme: 'Original Trilogy',
    uploadedDate: '2024-01-15T10:00:00Z',

    brand: null,
    setNumber: null,
    releaseYear: null,
    retired: null,

    designer: {
      username: 'BrickMaster42',
      displayName: 'Brick Master',
      profileUrl: null,
      avatarUrl: null,
      socialLinks: null,
    },
    dimensions: {
      height: { cm: 15, inches: 5.9 },
      width: { cm: 40, inches: 15.7 },
      depth: { cm: 30, inches: 11.8 },
      weight: null,
      studsWidth: 50,
      studsDepth: 38,
    },
    instructionsMetadata: {
      instructionType: 'pdf',
      hasInstructions: true,
      pageCount: 42,
      fileSize: 5242880,
      previewImages: ['/mock-images/x-wing-preview-1.jpg'],
    },
    features: [
      { title: 'Retractable landing gear', description: null, icon: null },
      { title: 'Opening cockpit', description: null, icon: null },
    ],

    descriptionHtml: '<p>A custom build of the iconic X-Wing from Star Wars</p>',
    shortDescription: 'Custom X-Wing MOC',

    difficulty: 'intermediate',
    buildTimeHours: 8,
    ageRecommendation: '12+',

    status: 'published',
    visibility: 'public',
    isFeatured: true,
    isVerified: true,

    tags: ['Star Wars', 'Space', 'Vehicle'],
    thumbnailUrl: '/mock-images/x-wing.jpg',
    totalPieceCount: 1250,

    publishedAt: '2024-01-15T12:00:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    userId: 'test-user-123',
    title: 'Medieval Castle Tower',
    description: 'A detailed medieval castle tower with interior',
    type: 'moc',

    mocId: 'MOC-002',
    slug: 'medieval-castle-tower',

    author: 'CastleBuilder',
    partsCount: 850,
    minifigCount: 3,
    theme: 'Castle',
    themeId: 186,
    subtheme: 'Medieval',
    uploadedDate: '2024-01-16T10:00:00Z',

    brand: null,
    setNumber: null,
    releaseYear: null,
    retired: null,

    designer: {
      username: 'CastleBuilder',
      displayName: 'Castle Builder',
      profileUrl: null,
      avatarUrl: null,
      socialLinks: null,
    },
    dimensions: {
      height: { cm: 45, inches: 17.7 },
      width: { cm: 25, inches: 9.8 },
      depth: { cm: 25, inches: 9.8 },
      weight: null,
      studsWidth: 32,
      studsDepth: 32,
    },
    instructionsMetadata: {
      instructionType: 'pdf',
      hasInstructions: true,
      pageCount: 38,
      fileSize: 4194304,
      previewImages: ['/mock-images/castle-preview-1.jpg'],
    },
    features: [
      { title: 'Removable roof', description: null, icon: null },
      { title: 'Detailed interior', description: null, icon: null },
    ],

    descriptionHtml: '<p>A detailed medieval castle tower with interior</p>',
    shortDescription: 'Medieval tower MOC',

    difficulty: 'intermediate',
    buildTimeHours: 6,
    ageRecommendation: '10+',

    status: 'published',
    visibility: 'public',
    isFeatured: false,
    isVerified: true,

    tags: ['Castle', 'Medieval', 'Building'],
    thumbnailUrl: '/mock-images/castle.jpg',
    totalPieceCount: 850,

    publishedAt: '2024-01-16T12:00:00Z',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    userId: 'test-user-123',
    title: 'Technic Racing Car',
    description: 'A fully functional Technic racing car with working suspension',
    type: 'moc',

    mocId: 'MOC-003',
    slug: 'technic-racing-car',

    author: 'TechnicPro',
    partsCount: 2100,
    minifigCount: 0,
    theme: 'Technic',
    themeId: 1,
    subtheme: 'Racing',
    uploadedDate: '2024-01-17T10:00:00Z',

    brand: null,
    setNumber: null,
    releaseYear: null,
    retired: null,

    designer: {
      username: 'TechnicPro',
      displayName: 'Technic Pro',
      profileUrl: null,
      avatarUrl: null,
      socialLinks: null,
    },
    dimensions: {
      height: { cm: 12, inches: 4.7 },
      width: { cm: 50, inches: 19.7 },
      depth: { cm: 22, inches: 8.7 },
      weight: null,
      studsWidth: null,
      studsDepth: null,
    },
    instructionsMetadata: {
      instructionType: 'studio',
      hasInstructions: true,
      pageCount: 156,
      fileSize: 15728640,
      previewImages: ['/mock-images/racing-car-preview-1.jpg'],
    },
    features: [
      { title: 'Working suspension', description: null, icon: null },
      { title: 'Steering mechanism', description: null, icon: null },
      { title: 'Opening doors', description: null, icon: null },
    ],

    descriptionHtml: '<p>A fully functional Technic racing car with working suspension</p>',
    shortDescription: 'Technic racing car MOC',

    difficulty: 'advanced',
    buildTimeHours: 12,
    ageRecommendation: '14+',

    status: 'published',
    visibility: 'public',
    isFeatured: false,
    isVerified: true,

    tags: ['Technic', 'Vehicle', 'Racing'],
    thumbnailUrl: '/mock-images/racing-car.jpg',
    totalPieceCount: 2100,

    publishedAt: '2024-01-17T12:00:00Z',
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T10:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    userId: 'test-user-123',
    title: 'Space Station Module',
    description: 'A modular space station with docking capabilities',
    type: 'moc',

    mocId: 'MOC-004',
    slug: 'space-station-module',

    author: 'SpaceExplorer',
    partsCount: 1800,
    minifigCount: 2,
    theme: 'Space',
    themeId: 130,
    subtheme: 'Classic Space',
    uploadedDate: '2024-01-18T10:00:00Z',

    brand: null,
    setNumber: null,
    releaseYear: null,
    retired: null,

    designer: {
      username: 'SpaceExplorer',
      displayName: 'Space Explorer',
      profileUrl: null,
      avatarUrl: null,
      socialLinks: null,
    },
    dimensions: {
      height: { cm: 30, inches: 11.8 },
      width: { cm: 35, inches: 13.8 },
      depth: { cm: 35, inches: 13.8 },
      weight: null,
      studsWidth: 44,
      studsDepth: 44,
    },
    instructionsMetadata: {
      instructionType: 'pdf',
      hasInstructions: true,
      pageCount: 68,
      fileSize: 8388608,
      previewImages: ['/mock-images/space-station-preview-1.jpg'],
    },
    features: [
      { title: 'Modular design', description: null, icon: null },
      { title: 'Docking ports', description: null, icon: null },
    ],

    descriptionHtml: '<p>A modular space station with docking capabilities</p>',
    shortDescription: 'Modular space station MOC',

    difficulty: 'advanced',
    buildTimeHours: 10,
    ageRecommendation: '12+',

    status: 'draft',
    visibility: 'private',
    isFeatured: false,
    isVerified: false,

    tags: ['Space', 'Modular', 'Sci-Fi'],
    thumbnailUrl: '/mock-images/space-station.jpg',
    totalPieceCount: 1800,

    publishedAt: null,
    createdAt: '2024-01-18T10:00:00Z',
    updatedAt: '2024-01-18T10:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    userId: 'test-user-123',
    title: 'City Fire Station',
    description: 'A detailed city fire station with multiple vehicles',
    type: 'moc',

    mocId: 'MOC-005',
    slug: 'city-fire-station',

    author: 'CityBuilder',
    partsCount: 1500,
    minifigCount: 6,
    theme: 'City',
    themeId: 52,
    subtheme: 'Fire',
    uploadedDate: '2024-01-19T10:00:00Z',

    brand: null,
    setNumber: null,
    releaseYear: null,
    retired: null,

    designer: {
      username: 'CityBuilder',
      displayName: 'City Builder',
      profileUrl: null,
      avatarUrl: null,
      socialLinks: null,
    },
    dimensions: {
      height: { cm: 35, inches: 13.8 },
      width: { cm: 48, inches: 18.9 },
      depth: { cm: 32, inches: 12.6 },
      weight: null,
      studsWidth: 60,
      studsDepth: 40,
    },
    instructionsMetadata: {
      instructionType: 'pdf',
      hasInstructions: true,
      pageCount: 92,
      fileSize: 10485760,
      previewImages: ['/mock-images/fire-station-preview-1.jpg'],
    },
    features: [
      { title: 'Opening garage doors', description: null, icon: null },
      { title: 'Fire truck included', description: null, icon: null },
      { title: 'Working fire pole', description: null, icon: null },
    ],

    descriptionHtml: '<p>A detailed city fire station with multiple vehicles</p>',
    shortDescription: 'City fire station MOC',

    difficulty: 'intermediate',
    buildTimeHours: 8,
    ageRecommendation: '10+',

    status: 'published',
    visibility: 'public',
    isFeatured: true,
    isVerified: true,

    tags: ['City', 'Emergency', 'Building'],
    thumbnailUrl: '/mock-images/fire-station.jpg',
    totalPieceCount: 1500,

    publishedAt: '2024-01-19T12:00:00Z',
    createdAt: '2024-01-19T10:00:00Z',
    updatedAt: '2024-01-19T10:00:00Z',
  },
]

/**
 * Build a mock list response with pagination
 */
export function buildMocListResponse(
  items: MockMocInstruction[],
  page = 1,
  limit = 20,
): MockMocListResponse {
  const total = items.length
  const totalPages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const paginatedItems = items.slice(start, start + limit)

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}
