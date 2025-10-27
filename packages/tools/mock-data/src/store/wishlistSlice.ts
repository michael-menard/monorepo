import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { WishlistItem } from '../wishlist'
import {
  mockWishlistItems,
  getWishlistStats,
  getWishlistCategories,
  getWishlistItemsByCategory,
  getWishlistItemsByPriority,
  getPurchasedWishlistItems,
  getUnpurchasedWishlistItems,
} from '../wishlist'

export interface WishlistState {
  items: WishlistItem[]
  loading: boolean
  error: string | null
  filters: {
    category: string | null
    priority: 'low' | 'medium' | 'high' | null
    showPurchased: boolean
  }
  stats: {
    total: number
    purchased: number
    unpurchased: number
    totalValue: number
    purchasedValue: number
    unpurchasedValue: number
    categories: number
  } | null
}

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
  filters: {
    category: null,
    priority: null,
    showPurchased: true,
  },
  stats: null,
}

// Async thunks
export const fetchWishlistItems = createAsyncThunk(
  'wishlist/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockWishlistItems
    } catch (error) {
      return rejectWithValue('Failed to fetch wishlist items')
    }
  },
)

export const addWishlistItem = createAsyncThunk(
  'wishlist/addItem',
  async (item: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      const newItem: WishlistItem = {
        ...item,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      return newItem
    } catch (error) {
      return rejectWithValue('Failed to add wishlist item')
    }
  },
)

export const updateWishlistItem = createAsyncThunk(
  'wishlist/updateItem',
  async ({ id, updates }: { id: string; updates: Partial<WishlistItem> }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      return {
        id,
        updates: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    } catch (error) {
      return rejectWithValue('Failed to update wishlist item')
    }
  },
)

export const deleteWishlistItem = createAsyncThunk(
  'wishlist/deleteItem',
  async (id: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return id
    } catch (error) {
      return rejectWithValue('Failed to delete wishlist item')
    }
  },
)

export const togglePurchaseStatus = createAsyncThunk(
  'wishlist/togglePurchase',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { wishlist: WishlistState }
      const item = state.wishlist.items.find(item => item.id === id)

      if (!item) {
        return rejectWithValue('Item not found')
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      return {
        id,
        updates: {
          isPurchased: !item.isPurchased,
          updatedAt: new Date(),
        },
      }
    } catch (error) {
      return rejectWithValue('Failed to toggle purchase status')
    }
  },
)

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<WishlistState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearFilters: state => {
      state.filters = {
        category: null,
        priority: null,
        showPurchased: true,
      }
    },
    clearError: state => {
      state.error = null
    },
    updateStats: state => {
      // Calculate stats from current items
      const stats = getWishlistStats()
      state.stats = stats
    },
  },
  extraReducers: builder => {
    builder
      // Fetch wishlist items
      .addCase(fetchWishlistItems.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWishlistItems.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
        state.stats = getWishlistStats()
      })
      .addCase(fetchWishlistItems.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Add wishlist item
      .addCase(addWishlistItem.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(addWishlistItem.fulfilled, (state, action) => {
        state.loading = false
        state.items.push(action.payload)
        state.stats = getWishlistStats()
      })
      .addCase(addWishlistItem.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Update wishlist item
      .addCase(updateWishlistItem.fulfilled, (state, action) => {
        const { id, updates } = action.payload
        const index = state.items.findIndex(item => item.id === id)
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates }
          state.stats = getWishlistStats()
        }
      })
      .addCase(updateWishlistItem.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // Delete wishlist item
      .addCase(deleteWishlistItem.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload)
        state.stats = getWishlistStats()
      })
      .addCase(deleteWishlistItem.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // Toggle purchase status
      .addCase(togglePurchaseStatus.fulfilled, (state, action) => {
        const { id, updates } = action.payload
        const index = state.items.findIndex(item => item.id === id)
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates }
          state.stats = getWishlistStats()
        }
      })
      .addCase(togglePurchaseStatus.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { setFilter, clearFilters, clearError, updateStats } = wishlistSlice.actions
export default wishlistSlice.reducer

// Selectors
export const selectWishlistItems = (state: { wishlist: WishlistState }) => state.wishlist.items
export const selectWishlistLoading = (state: { wishlist: WishlistState }) => state.wishlist.loading
export const selectWishlistError = (state: { wishlist: WishlistState }) => state.wishlist.error
export const selectWishlistFilters = (state: { wishlist: WishlistState }) => state.wishlist.filters
export const selectWishlistStats = (state: { wishlist: WishlistState }) => state.wishlist.stats

export const selectFilteredWishlistItems = (state: { wishlist: WishlistState }) => {
  const { items, filters } = state.wishlist
  let filtered = items

  if (filters.category) {
    filtered = filtered.filter(item => item.category === filters.category)
  }

  if (filters.priority) {
    filtered = filtered.filter(item => item.priority === filters.priority)
  }

  if (!filters.showPurchased) {
    filtered = filtered.filter(item => !item.isPurchased)
  }

  return filtered
}

export const selectWishlistCategories = (state: { wishlist: WishlistState }) => {
  return Array.from(new Set(state.wishlist.items.map(item => item.category).filter(Boolean)))
}
