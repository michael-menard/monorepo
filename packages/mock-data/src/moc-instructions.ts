/**
 * MOC instruction step type definition
 */
export interface MockInstructionStep {
  id: string;
  instructionsId: string;
  stepNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  parts?: Array<{
    partNumber: string;
    quantity: number;
    color?: string;
    description?: string;
  }>;
  notes?: string;
  estimatedTime?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string; // ISO string instead of Date
  updatedAt: string; // ISO string instead of Date
}

/**
 * MOC instruction type definition - Enhanced to match existing structure
 */
export interface MockInstruction {
  id: string;
  title: string;
  description: string;
  author: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags: string[];
  coverImageUrl?: string;
  coverImageFile?: File;
  steps: MockInstructionStep[];
  partsList: Array<{
    partNumber: string;
    quantity: number;
    color?: string;
    description?: string;
    category?: string;
  }>;
  isPublic: boolean;
  isPublished: boolean;
  rating?: number;
  downloadCount: number;
  estimatedTime?: number; // in hours
  totalParts?: number;
  createdAt: string; // ISO string instead of Date
  updatedAt: string; // ISO string instead of Date
}

/**
 * Filter interface for MOC instructions
 */
export interface MockInstructionFilter {
  search?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  author?: string;
  tags?: string[];
  minParts?: number;
  maxParts?: number;
  minTime?: number;
  maxTime?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'rating' | 'downloadCount';
  sortOrder?: 'asc' | 'desc';
  isPublic?: boolean;
  isPublished?: boolean;
}

/**
 * Mock MOC instructions for development and testing
 */
export const mockMocInstructions: MockInstruction[] = [
  {
    id: '1',
    title: 'Custom Batmobile',
    description: 'A detailed custom Batmobile with working features including opening cockpit, rotating wheels, and detailed interior.',
    author: 'BrickMaster3000',
    category: 'vehicles',
    difficulty: 'advanced',
    tags: ['Batman', 'Vehicles', 'Advanced', 'Custom'],
    coverImageUrl: '/images/mocs/custom-batmobile.jpg',
    estimatedTime: 6,
    totalParts: 1247,
    steps: [
      {
        id: 'step-1',
        instructionsId: '1',
        stepNumber: 1,
        title: 'Build the Chassis',
        description: 'Start by building the main chassis using the provided Technic beams.',
        imageUrl: '/images/mocs/batmobile-step-1.jpg',
        parts: [
          { partNumber: '32524', quantity: 4, color: 'Black', description: 'Technic Beam 1x7' },
          { partNumber: '32316', quantity: 2, color: 'Black', description: 'Technic Beam 1x5' },
        ],
        notes: 'Make sure all connections are secure before proceeding.',
        estimatedTime: 15,
        difficulty: 'medium',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      },
      {
        id: 'step-2',
        instructionsId: '1',
        stepNumber: 2,
        title: 'Add the Wheels',
        description: 'Attach the wheels and suspension system to the chassis.',
        imageUrl: '/images/mocs/batmobile-step-2.jpg',
        parts: [
          { partNumber: '55982', quantity: 4, color: 'Black', description: 'Tire 30.4x14 VR' },
          { partNumber: '56145', quantity: 4, color: 'Dark Bluish Gray', description: 'Wheel 30.4x14 VR' },
        ],
        estimatedTime: 20,
        difficulty: 'medium',
        createdAt: '2024-01-01T10:15:00Z',
        updatedAt: '2024-01-01T10:15:00Z',
      },
    ],
    partsList: [
      { partNumber: '32524', quantity: 4, color: 'Black', description: 'Technic Beam 1x7', category: 'Technic' },
      { partNumber: '32316', quantity: 2, color: 'Black', description: 'Technic Beam 1x5', category: 'Technic' },
      { partNumber: '55982', quantity: 4, color: 'Black', description: 'Tire 30.4x14 VR', category: 'Wheels' },
      { partNumber: '56145', quantity: 4, color: 'Dark Bluish Gray', description: 'Wheel 30.4x14 VR', category: 'Wheels' },
    ],
    isPublic: true,
    isPublished: true,
    rating: 4.8,
    downloadCount: 1250,
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
  },
  {
    id: '2',
    title: 'Medieval Castle',
    description: 'A magnificent medieval castle with towers, walls, and detailed interior rooms.',
    author: 'CastleBuilder42',
    category: 'buildings',
    difficulty: 'expert',
    tags: ['Medieval', 'Castle', 'Architecture', 'Large Build'],
    coverImageUrl: '/images/mocs/medieval-castle.jpg',
    estimatedTime: 12,
    totalParts: 2856,
    steps: [
      {
        id: 'step-1',
        instructionsId: '2',
        stepNumber: 1,
        title: 'Foundation and Base',
        description: 'Build the foundation using large baseplates and basic bricks.',
        imageUrl: '/images/mocs/castle-step-1.jpg',
        parts: [
          { partNumber: '3811', quantity: 4, color: 'Dark Bluish Gray', description: 'Baseplate 32x32' },
          { partNumber: '3001', quantity: 50, color: 'Dark Bluish Gray', description: 'Brick 2x4' },
        ],
        estimatedTime: 45,
        difficulty: 'easy',
        createdAt: '2024-01-02T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      },
    ],
    partsList: [
      { partNumber: '3811', quantity: 4, color: 'Dark Bluish Gray', description: 'Baseplate 32x32', category: 'Baseplates' },
      { partNumber: '3001', quantity: 50, color: 'Dark Bluish Gray', description: 'Brick 2x4', category: 'Bricks' },
    ],
    isPublic: true,
    isPublished: true,
    rating: 4.9,
    downloadCount: 890,
    createdAt: '2024-01-02T09:00:00Z',
    updatedAt: '2024-01-10T16:20:00Z',
  },
  {
    id: '3',
    title: 'Space Station Alpha',
    description: 'Modular space station with rotating sections and detailed interior modules.',
    author: 'SpaceBuilder99',
    category: 'scenes',
    difficulty: 'intermediate',
    tags: ['Space', 'Modular', 'Sci-Fi', 'Station'],
    coverImageUrl: '/images/mocs/space-station.jpg',
    estimatedTime: 4,
    totalParts: 892,
    steps: [
      {
        id: 'step-1',
        instructionsId: '3',
        stepNumber: 1,
        title: 'Central Hub',
        description: 'Build the central hub that connects all modules.',
        imageUrl: '/images/mocs/station-step-1.jpg',
        parts: [
          { partNumber: '3024', quantity: 20, color: 'White', description: 'Plate 1x1' },
          { partNumber: '3023', quantity: 15, color: 'Light Bluish Gray', description: 'Plate 1x2' },
        ],
        estimatedTime: 30,
        difficulty: 'medium',
        createdAt: '2024-01-03T10:00:00Z',
        updatedAt: '2024-01-03T10:00:00Z',
      },
    ],
    partsList: [
      { partNumber: '3024', quantity: 20, color: 'White', description: 'Plate 1x1', category: 'Plates' },
      { partNumber: '3023', quantity: 15, color: 'Light Bluish Gray', description: 'Plate 1x2', category: 'Plates' },
    ],
    isPublic: true,
    isPublished: true,
    rating: 4.6,
    downloadCount: 567,
    createdAt: '2024-01-03T09:00:00Z',
    updatedAt: '2024-01-08T11:15:00Z',
  },
  {
    id: '4',
    title: 'Steampunk Airship',
    description: 'Victorian-era inspired airship with brass details and working propellers.',
    author: 'SteamCraftMaster',
    category: 'vehicles',
    difficulty: 'advanced',
    tags: ['Steampunk', 'Airship', 'Victorian', 'Fantasy'],
    coverImageUrl: '/images/mocs/steampunk-airship.jpg',
    estimatedTime: 8,
    totalParts: 1534,
    steps: [
      {
        id: 'step-1',
        instructionsId: '4',
        stepNumber: 1,
        title: 'Build the Gondola',
        description: 'Start with the passenger gondola using curved and angled pieces.',
        imageUrl: '/images/mocs/airship-step-1.jpg',
        parts: [
          { partNumber: '4162', quantity: 8, color: 'Reddish Brown', description: 'Tile 1x8' },
          { partNumber: '2357', quantity: 6, color: 'Dark Tan', description: 'Brick Corner 1x2x2' },
        ],
        estimatedTime: 25,
        difficulty: 'medium',
        createdAt: new Date('2024-01-04T10:00:00Z'),
        updatedAt: new Date('2024-01-04T10:00:00Z'),
      },
    ],
    partsList: [
      { partNumber: '4162', quantity: 8, color: 'Reddish Brown', description: 'Tile 1x8', category: 'Tiles' },
      { partNumber: '2357', quantity: 6, color: 'Dark Tan', description: 'Brick Corner 1x2x2', category: 'Bricks' },
    ],
    isPublic: true,
    isPublished: true,
    rating: 4.7,
    downloadCount: 723,
    createdAt: new Date('2024-01-04T09:00:00Z'),
    updatedAt: new Date('2024-01-12T13:45:00Z'),
  },
  {
    id: '5',
    title: 'Modular City Street',
    description: 'A detailed city street scene with shops, apartments, and realistic street elements.',
    author: 'UrbanBuilder',
    category: 'buildings',
    difficulty: 'intermediate',
    tags: ['City', 'Modular', 'Street', 'Buildings'],
    coverImageUrl: '/images/mocs/city-street.jpg',
    estimatedTime: 10,
    totalParts: 2134,
    steps: [
      {
        id: 'step-1',
        instructionsId: '5',
        stepNumber: 1,
        title: 'Build the Base',
        description: 'Create the street base using road plates and sidewalk elements.',
        imageUrl: '/images/mocs/city-step-1.jpg',
        parts: [
          { partNumber: '44336', quantity: 8, color: 'Dark Bluish Gray', description: 'Road Plate 32x32' },
          { partNumber: '3024', quantity: 50, color: 'Light Bluish Gray', description: 'Plate 1x1' },
        ],
        estimatedTime: 45,
        difficulty: 'easy',
        createdAt: new Date('2024-01-05T10:00:00Z'),
        updatedAt: new Date('2024-01-05T10:00:00Z'),
      },
    ],
    partsList: [
      { partNumber: '44336', quantity: 8, color: 'Dark Bluish Gray', description: 'Road Plate 32x32', category: 'Baseplates' },
      { partNumber: '3024', quantity: 50, color: 'Light Bluish Gray', description: 'Plate 1x1', category: 'Plates' },
    ],
    isPublic: true,
    isPublished: true,
    rating: 4.4,
    downloadCount: 445,
    createdAt: new Date('2024-01-05T09:00:00Z'),
    updatedAt: new Date('2024-01-14T10:30:00Z'),
  },
  {
    id: '6',
    title: 'Pirate Ship Adventure',
    description: 'Classic pirate ship with detailed sails, cannons, and treasure room.',
    author: 'SeafarerMOCs',
    category: 'vehicles',
    difficulty: 'advanced',
    tags: ['Pirates', 'Ship', 'Adventure', 'Classic'],
    coverImageUrl: '/images/mocs/pirate-ship.jpg',
    estimatedTime: 7,
    totalParts: 1678,
    steps: [
      {
        id: 'step-1',
        instructionsId: '6',
        stepNumber: 1,
        title: 'Hull Construction',
        description: 'Build the main hull of the pirate ship using curved pieces.',
        imageUrl: '/images/mocs/ship-step-1.jpg',
        parts: [
          { partNumber: '2877', quantity: 12, color: 'Reddish Brown', description: 'Brick Corner 1x2x3' },
          { partNumber: '3001', quantity: 30, color: 'Reddish Brown', description: 'Brick 2x4' },
        ],
        estimatedTime: 60,
        difficulty: 'medium',
        createdAt: new Date('2024-01-06T10:00:00Z'),
        updatedAt: new Date('2024-01-06T10:00:00Z'),
      },
    ],
    partsList: [
      { partNumber: '2877', quantity: 12, color: 'Reddish Brown', description: 'Brick Corner 1x2x3', category: 'Bricks' },
      { partNumber: '3001', quantity: 30, color: 'Reddish Brown', description: 'Brick 2x4', category: 'Bricks' },
    ],
    isPublic: true,
    isPublished: true,
    rating: 4.8,
    downloadCount: 892,
    createdAt: new Date('2024-01-06T09:00:00Z'),
    updatedAt: new Date('2024-01-15T14:20:00Z'),
  },
  {
    id: '7',
    title: 'Cyberpunk Motorcycle',
    description: 'Futuristic motorcycle with neon details and advanced building techniques.',
    author: 'CyberBuilder2077',
    category: 'vehicles',
    difficulty: 'expert',
    tags: ['Cyberpunk', 'Motorcycle', 'Futuristic', 'Neon'],
    coverImageUrl: '/images/mocs/cyber-motorcycle.jpg',
    estimatedTime: 5,
    totalParts: 756,
    steps: [
      {
        id: 'step-1',
        instructionsId: '7',
        stepNumber: 1,
        title: 'Frame Assembly',
        description: 'Construct the main frame using Technic beams and connectors.',
        imageUrl: '/images/mocs/cyber-step-1.jpg',
        parts: [
          { partNumber: '32524', quantity: 6, color: 'Black', description: 'Technic Beam 1x7' },
          { partNumber: '32140', quantity: 4, color: 'Dark Bluish Gray', description: 'Technic Brick 1x4' },
        ],
        estimatedTime: 30,
        difficulty: 'hard',
        createdAt: new Date('2024-01-07T10:00:00Z'),
        updatedAt: new Date('2024-01-07T10:00:00Z'),
      },
    ],
    partsList: [
      { partNumber: '32524', quantity: 6, color: 'Black', description: 'Technic Beam 1x7', category: 'Technic' },
      { partNumber: '32140', quantity: 4, color: 'Dark Bluish Gray', description: 'Technic Brick 1x4', category: 'Technic' },
    ],
    isPublic: true,
    isPublished: true,
    rating: 4.9,
    downloadCount: 1156,
    createdAt: new Date('2024-01-07T09:00:00Z'),
    updatedAt: new Date('2024-01-16T11:45:00Z'),
  },
  {
    id: '8',
    title: 'Fantasy Dragon',
    description: 'Majestic dragon with articulated wings, detailed scales, and poseable limbs.',
    author: 'DragonCrafter',
    category: 'characters',
    difficulty: 'expert',
    tags: ['Dragon', 'Fantasy', 'Articulated', 'Creature'],
    coverImageUrl: '/images/mocs/fantasy-dragon.jpg',
    estimatedTime: 9,
    totalParts: 1923,
    steps: [
      {
        id: 'step-1',
        instructionsId: '8',
        stepNumber: 1,
        title: 'Body Core',
        description: 'Build the central body structure with internal framework.',
        imageUrl: '/images/mocs/dragon-step-1.jpg',
        parts: [
          { partNumber: '3001', quantity: 25, color: 'Dark Red', description: 'Brick 2x4' },
          { partNumber: '3002', quantity: 20, color: 'Dark Red', description: 'Brick 2x3' },
        ],
        estimatedTime: 75,
        difficulty: 'hard',
        createdAt: new Date('2024-01-08T10:00:00Z'),
        updatedAt: new Date('2024-01-08T10:00:00Z'),
      },
    ],
    partsList: [
      { partNumber: '3001', quantity: 25, color: 'Dark Red', description: 'Brick 2x4', category: 'Bricks' },
      { partNumber: '3002', quantity: 20, color: 'Dark Red', description: 'Brick 2x3', category: 'Bricks' },
    ],
    isPublic: true,
    isPublished: true,
    rating: 4.7,
    downloadCount: 678,
    createdAt: new Date('2024-01-08T09:00:00Z'),
    updatedAt: new Date('2024-01-17T16:30:00Z'),
  },
];

/**
 * Get MOC instructions by category
 */
export const getMocInstructionsByCategory = (category: string): MockInstruction[] => {
  return mockMocInstructions.filter(instruction => instruction.category === category);
};

/**
 * Get MOC instructions by difficulty
 */
export const getMocInstructionsByDifficulty = (difficulty: string): MockInstruction[] => {
  return mockMocInstructions.filter(instruction => instruction.difficulty === difficulty);
};

/**
 * Get MOC instructions by author
 */
export const getMocInstructionsByAuthor = (author: string): MockInstruction[] => {
  return mockMocInstructions.filter(instruction => instruction.author === author);
};

/**
 * Get published MOC instructions
 */
export const getPublishedMocInstructions = (): MockInstruction[] => {
  return mockMocInstructions.filter(instruction => instruction.isPublished);
};

/**
 * Get MOC instruction categories
 */
export const getMocInstructionCategories = (): string[] => {
  return Array.from(new Set(mockMocInstructions.map(instruction => instruction.category)));
};

/**
 * Get MOC instruction stats
 */
export const getMocInstructionStats = () => {
  const total = mockMocInstructions.length;
  const published = getPublishedMocInstructions().length;
  const totalDownloads = mockMocInstructions.reduce((sum, instruction) => sum + instruction.downloadCount, 0);
  const averageRating = mockMocInstructions.reduce((sum, instruction) => sum + (instruction.rating || 0), 0) / total;
  const categories = getMocInstructionCategories().length;
  const authors = Array.from(new Set(mockMocInstructions.map(instruction => instruction.author))).length;

  return {
    total,
    published,
    totalDownloads,
    averageRating: Math.round(averageRating * 10) / 10,
    categories,
    authors,
  };
};
