import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type GalleryLayout = 'grid' | 'list' | 'masonry' | 'table'
export type SortBy = 'recent' | 'oldest' | 'alphabetical' | 'rating'

interface GalleryState {
  layout: GalleryLayout
  sortBy: SortBy
  searchQuery: string
  selectedCategory: string
}

const initialState: GalleryState = {
  layout: 'grid',
  sortBy: 'recent',
  searchQuery: '',
  selectedCategory: '',
}

const gallerySlice = createSlice({
  name: 'gallery',
  initialState,
  reducers: {
    setLayout: (state, action: PayloadAction<GalleryLayout>) => {
      state.layout = action.payload
    },
    setSortBy: (state, action: PayloadAction<SortBy>) => {
      state.sortBy = action.payload
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    setSelectedCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload
    },
    resetFilters: state => {
      state.searchQuery = ''
      state.selectedCategory = ''
      state.sortBy = 'recent'
      // Keep layout preference
    },
  },
})

export const { setLayout, setSortBy, setSearchQuery, setSelectedCategory, resetFilters } =
  gallerySlice.actions

export default gallerySlice.reducer
