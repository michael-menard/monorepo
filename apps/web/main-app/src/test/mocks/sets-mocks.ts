import type { SetListResponse } from '@repo/api-client/schemas/sets'

export interface MockSetItem {
  id: string
  userId: string
  title: string
  setNumber: string | null
  store: string | null
  sourceUrl: string | null
  pieceCount: number | null
  releaseDate: string | null
  theme: string | null
  tags: string[]
  notes: string | null
  isBuilt: boolean
  quantity: number
  purchasePrice: number | null
  tax: number | null
  shipping: number | null
  purchaseDate: string | null
  wishlistItemId: string | null
  images: Array<{
    id: string
    imageUrl: string
    thumbnailUrl: string | null
    position: number
  }>
  createdAt: string
  updatedAt: string
}

// Canonical sample sets used for MSW + E2E read-only scenarios
export const mockSets: MockSetItem[] = [
  {
    id: 'set-001',
    userId: 'test-user-123',
    title: 'Downtown Diner',
    setNumber: '10260',
    store: 'LEGO',
    sourceUrl: 'https://lego.com/product/10260',
    pieceCount: 2480,
    releaseDate: '2018-01-01T00:00:00.000Z',
    theme: 'Creator Expert',
    tags: ['modular', 'city'],
    notes: null,
    isBuilt: false,
    quantity: 1,
    purchasePrice: 169.99,
    tax: 0,
    shipping: 0,
    purchaseDate: null,
    wishlistItemId: null,
    images: [
      {
        id: 'img-set-001-1',
        imageUrl: '/mock-images/sets/downtown-diner.jpg',
        thumbnailUrl: '/mock-images/sets/downtown-diner-thumb.jpg',
        position: 0,
      },
    ],
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z',
  },
  {
    id: 'set-002',
    userId: 'test-user-123',
    title: 'Corner Garage',
    setNumber: '10264',
    store: 'LEGO',
    sourceUrl: 'https://lego.com/product/10264',
    pieceCount: 2569,
    releaseDate: '2019-01-01T00:00:00.000Z',
    theme: 'Creator Expert',
    tags: ['modular'],
    notes: null,
    isBuilt: true,
    quantity: 2,
    purchasePrice: 199.99,
    tax: 0,
    shipping: 0,
    purchaseDate: null,
    wishlistItemId: null,
    images: [
      {
        id: 'img-set-002-1',
        imageUrl: '/mock-images/sets/corner-garage.jpg',
        thumbnailUrl: '/mock-images/sets/corner-garage-thumb.jpg',
        position: 0,
      },
    ],
    createdAt: '2025-01-02T10:00:00Z',
    updatedAt: '2025-01-02T10:00:00Z',
  },
]

export function buildSetListResponse(items: MockSetItem[] = mockSets): SetListResponse {
  return {
    items,
    pagination: {
      page: 1,
      limit: 20,
      total: items.length,
      totalPages: 1,
    },
    filters: {
      availableThemes: Array.from(new Set(items.map(s => s.theme).filter((t): t is string => Boolean(t)))),
      availableTags: Array.from(new Set(items.flatMap(s => s.tags))).sort(),
    },
  }
}
