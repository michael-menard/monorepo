export interface MockWishlistItem {
  id: string
  userId: string
  title: string
  store: 'LEGO' | 'Barweer' | 'AliExpress' | 'Other'
  setNumber: string | null
  sourceUrl: string | null
  imageUrl: string | null
  price: number | null
  currency: string
  pieceCount: number | null
  releaseDate: string | null
  tags: string[]
  priority: number
  notes: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface MockWishlistListResponse {
  items: MockWishlistItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  counts: {
    total: number
    byStore: Record<string, number>
    byPriority: Record<string, number>
  }
  filters: {
    availableStores: string[]
    availableTags: string[]
  }
}
