/**
 * Mock MOC Data for Tests
 */

export const mockMocs = {
  basicMoc: {
    id: 'moc-basic-123',
    userId: 'user-123',
    title: 'Medieval Castle',
    description: 'A detailed medieval castle with towers',
    type: 'moc' as const,
    difficulty: 'intermediate' as const,
    pieceCount: 1500,
    estimatedCost: '150.00',
    timeToComplete: 240,
    isPublic: true,
    tags: ['castle', 'medieval', 'architecture'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  setMoc: {
    id: 'moc-set-456',
    userId: 'user-123',
    title: 'Star Wars Death Star',
    description: 'Official LEGO Death Star set',
    type: 'set' as const,
    difficulty: 'advanced' as const,
    pieceCount: 4000,
    estimatedCost: '499.99',
    timeToComplete: 600,
    isPublic: true,
    tags: ['star-wars', 'space', 'official-set'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },

  privateMoc: {
    id: 'moc-private-789',
    userId: 'user-456',
    title: 'Secret Project',
    description: 'Private MOC for testing',
    type: 'moc' as const,
    difficulty: 'beginner' as const,
    pieceCount: 500,
    estimatedCost: '50.00',
    timeToComplete: 120,
    isPublic: false,
    tags: ['private'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
}

/**
 * Mock MOC with all relations (files, images, parts lists)
 */
export const mockMocWithRelations = {
  ...mockMocs.basicMoc,
  files: [
    {
      id: 'file-1',
      mocId: 'moc-basic-123',
      fileType: 'instruction' as const,
      fileUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/moc-basic-123/instructions.pdf',
      originalFilename: 'castle-instructions.pdf',
      mimeType: 'application/pdf',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'file-2',
      mocId: 'moc-basic-123',
      fileType: 'parts-list' as const,
      fileUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/moc-basic-123/parts.csv',
      originalFilename: 'parts-list.csv',
      mimeType: 'text/csv',
      createdAt: new Date('2024-01-01'),
    },
  ],
  images: [
    {
      id: 'image-1',
      mocId: 'moc-basic-123',
      imageUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/moc-basic-123/thumb.jpg',
      imageType: 'thumbnail' as const,
      createdAt: new Date('2024-01-01'),
    },
  ],
  partsLists: [],
}

/**
 * Mock MOC creation payloads
 */
export const mockCreateMocPayloads = {
  validMoc: {
    title: 'New Medieval Castle',
    description: 'A brand new castle design',
    type: 'moc' as const,
    difficulty: 'intermediate' as const,
    pieceCount: 1200,
    estimatedCost: '120.00',
    timeToComplete: 200,
    isPublic: true,
    tags: ['castle', 'medieval'],
  },

  validSet: {
    title: 'LEGO City Police Station',
    description: 'Official police station set',
    type: 'set' as const,
    difficulty: 'beginner' as const,
    pieceCount: 800,
    estimatedCost: '89.99',
    timeToComplete: 150,
    isPublic: true,
    tags: ['city', 'police', 'official-set'],
  },

  missingTitle: {
    description: 'Missing title field',
    type: 'moc' as const,
    difficulty: 'beginner' as const,
  },

  invalidType: {
    title: 'Invalid Type MOC',
    type: 'invalid' as any,
    difficulty: 'beginner' as const,
  },
}

/**
 * Mock MOC update payloads
 */
export const mockUpdateMocPayloads = {
  updateTitle: {
    title: 'Updated Castle Title',
  },

  updateMultipleFields: {
    title: 'Updated Title',
    description: 'Updated description',
    difficulty: 'advanced' as const,
  },

  invalidFieldType: {
    pieceCount: 'not-a-number' as any,
  },
}
