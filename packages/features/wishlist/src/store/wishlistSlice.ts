import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { WishlistItem, Wishlist } from '../schemas'

interface WishlistState {
  items: WishlistItem[]
  currentWishlist: Wishlist | null
  isLoading: boolean
  error: string | null
  filters: {
    search: string
    category: string
    priority: 'low' | 'medium' | 'high' | null
    isPurchased: boolean | null
  }
  sortBy: 'name' | 'price' | 'priority' | 'createdAt'
  sortOrder: 'asc' | 'desc'
}

const initialState: WishlistState = {
  items: [],
  currentWishlist: null,
  isLoading: false,
  error: null,
  filters: {
    search: '',
    category: '',
    priority: null,
    isPurchased: null,
  },
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<WishlistItem[]>) => {
      state.items = action.payload
    },
    addItem: (state, action: PayloadAction<WishlistItem>) => {
      state.items.push(action.payload)
    },
    updateItem: (state, action: PayloadAction<WishlistItem>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id)
      if (index !== -1) {
        state.items[index] = action.payload
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload)
    },
    setCurrentWishlist: (state, action: PayloadAction<Wishlist | null>) => {
      state.currentWishlist = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setFilters: (state, action: PayloadAction<Partial<WishlistState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setSortBy: (state, action: PayloadAction<WishlistState['sortBy']>) => {
      state.sortBy = action.payload
    },
    setSortOrder: (state, action: PayloadAction<WishlistState['sortOrder']>) => {
      state.sortOrder = action.payload
    },
    clearFilters: state => {
      state.filters = initialState.filters
    },
  },
})

export const {
  setItems,
  addItem,
  updateItem,
  removeItem,
  setCurrentWishlist,
  setLoading,
  setError,
  setFilters,
  setSortBy,
  setSortOrder,
  clearFilters,
} = wishlistSlice.actions

export default wishlistSlice.reducer
