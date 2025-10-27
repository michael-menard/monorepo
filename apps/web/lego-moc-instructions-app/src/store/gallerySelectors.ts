import { RootState } from './store'

// Gallery selectors
export const selectGalleryLayout = (state: RootState) => state.gallery.layout
export const selectGallerySortBy = (state: RootState) => state.gallery.sortBy
export const selectGallerySearchQuery = (state: RootState) => state.gallery.searchQuery
export const selectGallerySelectedCategory = (state: RootState) => state.gallery.selectedCategory
export const selectGalleryState = (state: RootState) => state.gallery
