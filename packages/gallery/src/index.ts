// Main Gallery Component
export { Gallery } from './components/Gallery/Gallery.js';

// Layout Components
export { GridLayout } from './components/Gallery/layouts/GridLayout.js';
export { MasonryLayout } from './components/Gallery/layouts/MasonryLayout.js';
export { ListLayout } from './components/Gallery/layouts/ListLayout.js';
export { TableLayout } from './components/Gallery/layouts/TableLayout.js';
export { CarouselLayout } from './components/Gallery/layouts/CarouselLayout.js';

// Supporting Components
export { GalleryCard } from './components/Gallery/GalleryCard.js';
export { GalleryListItem } from './components/Gallery/GalleryListItem.js';
export { GalleryHeader } from './components/Gallery/GalleryHeader.js';
export { GalleryToolbar } from './components/Gallery/GalleryToolbar.js';
export { LoadingState } from './components/Gallery/LoadingState.js';
export { ErrorState } from './components/Gallery/ErrorState.js';
export { EmptyState } from './components/Gallery/EmptyState.js';

// Types and Schemas
export type {
  GalleryItem,
  GalleryLayout,
  GalleryConfig,
  GalleryActions,
  GalleryState,
  GalleryProps,
  ViewMode,
  SortOption,
  FilterConfig,
  DataAdapter,
  GalleryPreset,
  // Convenience aliases
  Item,
  Layout,
  Config,
  Actions,
  State,
  Props,
} from './types/index.js';

export {
  GalleryItemSchema,
  GalleryLayoutSchema,
  GalleryConfigSchema,
  ViewModeSchema,
  SortOptionSchema,
  FilterConfigSchema,
} from './types/index.js';

// Data Adapters
export {
  adapters,
  imageAdapter,
  inspirationAdapter,
  instructionAdapter,
  wishlistAdapter,
  createAdapter,
} from './utils/adapters.js';

// Presets
export {
  presets,
  inspirationGalleryPreset,
  instructionsGalleryPreset,
  wishlistGalleryPreset,
  compactGalleryPreset,
  tableGalleryPreset,
  carouselGalleryPreset,
  getPreset,
  mergePresetConfig,
} from './presets/index.js';

// Import presets, adapters, and Gallery for use in convenience objects
import {
  inspirationGalleryPreset,
  instructionsGalleryPreset,
  wishlistGalleryPreset,
  compactGalleryPreset,
  tableGalleryPreset,
  carouselGalleryPreset,
} from './presets/index.js';

import {
  imageAdapter,
  inspirationAdapter,
  instructionAdapter,
  wishlistAdapter,
  createAdapter,
} from './utils/adapters.js';

import { Gallery } from './components/Gallery/Gallery.js';

// Convenience exports for common use cases
export const GalleryPresets = {
  inspiration: inspirationGalleryPreset,
  instructions: instructionsGalleryPreset,
  wishlist: wishlistGalleryPreset,
  compact: compactGalleryPreset,
  table: tableGalleryPreset,
  carousel: carouselGalleryPreset,
};

export const GalleryAdapters = {
  image: imageAdapter,
  inspiration: inspirationAdapter,
  instruction: instructionAdapter,
  wishlist: wishlistAdapter,
  create: createAdapter,
};

// Default export for convenience
export default Gallery;
