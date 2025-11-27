import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface GalleryItem {
  id: string
  title: string
  imageUrl: string
  createdAt: string
}

interface GalleryState {
  items: GalleryItem[]
  selectedItems: string[]
  isLoading: boolean
  error: string | null
}

const initialState: GalleryState = {
  items: [],
  selectedItems: [],
  isLoading: false,
  error: null,
}

const gallerySlice = createSlice({
  name: 'gallery',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<GalleryItem[]>) => {
      state.items = action.payload
    },
    addItem: (state, action: PayloadAction<GalleryItem>) => {
      state.items.push(action.payload)
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload)
    },
    toggleItemSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedItems.indexOf(action.payload)
      if (index === -1) {
        state.selectedItems.push(action.payload)
      } else {
        state.selectedItems.splice(index, 1)
      }
    },
    clearSelection: state => {
      state.selectedItems = []
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const {
  setItems,
  addItem,
  removeItem,
  toggleItemSelection,
  clearSelection,
  setLoading,
  setError,
} = gallerySlice.actions

export default gallerySlice.reducer
