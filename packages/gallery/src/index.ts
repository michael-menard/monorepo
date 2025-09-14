// Main Gallery Component
export { Gallery } from './components/Gallery/Gallery';

// Layout Components
export { GridLayout } from './components/Gallery/layouts/GridLayout';
export { MasonryLayout } from './components/Gallery/layouts/MasonryLayout';
export { ListLayout } from './components/Gallery/layouts/ListLayout';
export { TableLayout } from './components/Gallery/layouts/TableLayout';
export { CarouselLayout } from './components/Gallery/layouts/CarouselLayout';

// Supporting Components
export { GalleryCard } from './components/Gallery/GalleryCard';
export { GalleryListItem } from './components/Gallery/GalleryListItem';
export { GalleryHeader } from './components/Gallery/GalleryHeader';
export { GalleryToolbar } from './components/Gallery/GalleryToolbar';
export { LoadingState } from './components/Gallery/LoadingState';
export { ErrorState } from './components/Gallery/ErrorState';
export { EmptyState } from './components/Gallery/EmptyState';

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
} from './types/index';

export {
  GalleryItemSchema,
  GalleryLayoutSchema,
  GalleryConfigSchema,
  ViewModeSchema,
  SortOptionSchema,
  FilterConfigSchema,
} from './types/index';

// Data Adapters
export {
  adapters,
  imageAdapter,
  inspirationAdapter,
  instructionAdapter,
  wishlistAdapter,
  featureWishlistAdapter,
  featureMocInstructionAdapter,
  createAdapter,
} from './utils/adapters';

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
} from './presets/index';

// Import presets, adapters, and Gallery for use in convenience objects
import {
  inspirationGalleryPreset,
  instructionsGalleryPreset,
  wishlistGalleryPreset,
  compactGalleryPreset,
  tableGalleryPreset,
  carouselGalleryPreset,
} from './presets/index';

import {
  imageAdapter,
  inspirationAdapter,
  instructionAdapter,
  wishlistAdapter,
  featureWishlistAdapter,
  featureMocInstructionAdapter,
  createAdapter,
} from './utils/adapters';

import { Gallery } from './components/Gallery/Gallery';

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
  featureWishlist: featureWishlistAdapter,
  featureMocInstruction: featureMocInstructionAdapter,
  create: createAdapter,
};

// Default export for convenience
export default Gallery;
