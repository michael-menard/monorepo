/**
 * Mock Sets API
 * Temporary mock until Story 3.4.3 (Sets API Endpoints) is implemented
 */
import { z } from 'zod'

// Schemas from Story 3.4.3
export const BrickSetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  setNumber: z.string(),
  thumbnail: z.string(),
  images: z.array(
    z.object({
      id: z.string(),
      src: z.string(),
      thumbnail: z.string(),
    }),
  ),
  pieceCount: z.number(),
  theme: z.string(),
  tags: z.array(z.string()),
  buildStatus: z.enum(['complete', 'in-progress', 'planned']).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  purchaseCurrency: z.string().optional(),
  notes: z.string().optional(),
  linkedMocs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      thumbnail: z.string(),
      pieceCount: z.number(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateSetRequestSchema = z.object({
  name: z.string().min(1),
  setNumber: z.string().min(1),
  pieceCount: z.number().int().positive(),
  theme: z.string().min(1),
  tags: z.array(z.string()).default([]),
  buildStatus: z.enum(['complete', 'in-progress', 'planned']).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  purchaseCurrency: z.string().default('USD'),
  notes: z.string().optional(),
})

export type BrickSet = z.infer<typeof BrickSetSchema>
export type CreateSetRequest = z.infer<typeof CreateSetRequestSchema>

// Mock delay to simulate network
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock in-memory storage with sample data
let mockSets: BrickSet[] = [
  {
    id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    name: 'The Friends Apartments',
    setNumber: '10292',
    thumbnail: 'https://via.placeholder.com/300x200?text=Friends+Apartments',
    images: [],
    pieceCount: 2048,
    theme: 'Creator Expert',
    tags: ['Modular', 'TV Show'],
    buildStatus: 'complete',
    linkedMocs: [],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'b2c3d4e5-6789-01bc-defg-2345678901bc',
    name: 'Millennium Falcon',
    setNumber: '75192',
    thumbnail: 'https://via.placeholder.com/300x200?text=Millennium+Falcon',
    images: [],
    pieceCount: 7541,
    theme: 'Star Wars',
    tags: ['UCS', 'Movie'],
    buildStatus: 'in-progress',
    linkedMocs: [],
    createdAt: '2024-02-20T14:30:00Z',
    updatedAt: '2024-02-20T14:30:00Z',
  },
  {
    id: 'c3d4e5f6-7890-12cd-efgh-3456789012cd',
    name: 'Hogwarts Castle',
    setNumber: '71043',
    thumbnail: 'https://via.placeholder.com/300x200?text=Hogwarts+Castle',
    images: [],
    pieceCount: 6020,
    theme: 'Harry Potter',
    tags: ['Castle', 'Movie'],
    buildStatus: 'planned',
    linkedMocs: [],
    createdAt: '2024-03-10T09:15:00Z',
    updatedAt: '2024-03-10T09:15:00Z',
  },
]

/**
 * Mock: Add a new set
 */
export const mockAddSet = async (data: CreateSetRequest): Promise<BrickSet> => {
  await delay(500)

  const newSet: BrickSet = {
    id: crypto.randomUUID(),
    ...data,
    thumbnail: '',
    images: [],
    linkedMocs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockSets.push(newSet)
  return newSet
}

/**
 * Mock: Upload set image
 */
export const mockUploadSetImage = async (params: {
  setId: string
  formData: FormData
}): Promise<{ id: string; src: string; thumbnail: string }> => {
  await delay(300)

  const imageId = crypto.randomUUID()
  const mockImageUrl = `https://via.placeholder.com/800x600?text=Set+Image+${imageId.slice(0, 8)}`

  // Update the set with the new image
  const set = mockSets.find(s => s.id === params.setId)
  if (set) {
    const newImage = {
      id: imageId,
      src: mockImageUrl,
      thumbnail: mockImageUrl,
    }
    set.images.push(newImage)

    // Set first image as thumbnail if not set
    if (!set.thumbnail) {
      set.thumbnail = mockImageUrl
    }
  }

  return {
    id: imageId,
    src: mockImageUrl,
    thumbnail: mockImageUrl,
  }
}

/**
 * Mock: Get all sets
 */
export const mockGetSets = async (): Promise<BrickSet[]> => {
  await delay(300)
  return mockSets
}

/**
 * Mock: Get set by ID
 */
export const mockGetSetById = async (id: string): Promise<BrickSet | null> => {
  await delay(200)
  return mockSets.find(s => s.id === id) || null
}

/**
 * Mock: Delete set
 */
export const mockDeleteSet = async (id: string): Promise<void> => {
  await delay(300)
  mockSets = mockSets.filter(s => s.id !== id)
}
