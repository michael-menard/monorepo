import type { GalleryPreset } from '../types/index';
import { adapters } from '../utils/adapters';

// Inspiration Gallery Preset
export const inspirationGalleryPreset: GalleryPreset = {
  name: 'inspiration',
  description: 'Optimized for browsing LEGO inspiration and creative builds',
  config: {
    layout: 'masonry',
    viewMode: 'comfortable',
    itemsPerPage: 20,
    infiniteScroll: true,
    selectable: false,
    multiSelect: false,
    draggable: false,
    sortable: true,
    sortOptions: [
      { field: 'createdAt', direction: 'desc', label: 'Newest First' },
      { field: 'createdAt', direction: 'asc', label: 'Oldest First' },
      { field: 'title', direction: 'asc', label: 'Title A-Z' },
      { field: 'liked', direction: 'desc', label: 'Most Liked' },
    ],
    filterConfig: {
      searchable: true,
      searchFields: ['title', 'description', 'author', 'tags'],
      tagFilter: true,
      categoryFilter: false,
      dateFilter: true,
      customFilters: [
        {
          key: 'difficulty',
          label: 'Difficulty',
          type: 'select',
          options: [
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' },
          ],
        },
      ],
    },
    columns: {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
    },
    gap: 6,
    animations: {
      enabled: true,
      duration: 0.4,
      stagger: true,
      staggerDelay: 0.05,
    },
  },
  adapter: adapters.inspiration,
};

// MOC Instructions Gallery Preset
export const instructionsGalleryPreset: GalleryPreset = {
  name: 'instructions',
  description: 'Optimized for browsing and managing MOC instruction sets',
  config: {
    layout: 'grid',
    viewMode: 'comfortable',
    itemsPerPage: 24,
    infiniteScroll: true,
    selectable: true,
    multiSelect: true,
    draggable: false,
    sortable: true,
    sortOptions: [
      { field: 'createdAt', direction: 'desc', label: 'Recently Added' },
      { field: 'title', direction: 'asc', label: 'Title A-Z' },
      { field: 'difficulty', direction: 'asc', label: 'Difficulty: Easy First' },
      { field: 'pieceCount', direction: 'asc', label: 'Piece Count: Low to High' },
      { field: 'downloadCount', direction: 'desc', label: 'Most Downloaded' },
    ],
    filterConfig: {
      searchable: true,
      searchFields: ['title', 'description', 'author', 'tags'],
      tagFilter: true,
      categoryFilter: true,
      dateFilter: false,
      customFilters: [
        {
          key: 'difficulty',
          label: 'Difficulty',
          type: 'multiselect',
          options: [
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' },
          ],
        },
        {
          key: 'pieceCount',
          label: 'Piece Count',
          type: 'range',
        },
      ],
    },
    columns: {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 4,
    },
    gap: 4,
    animations: {
      enabled: true,
      duration: 0.3,
      stagger: true,
      staggerDelay: 0.03,
    },
  },
  adapter: adapters.instruction,
};

// Wishlist Gallery Preset
export const wishlistGalleryPreset: GalleryPreset = {
  name: 'wishlist',
  description: 'Optimized for managing wishlist items with purchase tracking',
  config: {
    layout: 'grid',
    viewMode: 'comfortable',
    itemsPerPage: 20,
    infiniteScroll: false, // Better for wishlist management
    selectable: true,
    multiSelect: true,
    draggable: true, // Allow reordering by priority
    sortable: true,
    sortOptions: [
      { field: 'priority', direction: 'desc', label: 'Priority: High to Low' },
      { field: 'createdAt', direction: 'desc', label: 'Recently Added' },
      { field: 'price', direction: 'asc', label: 'Price: Low to High' },
      { field: 'price', direction: 'desc', label: 'Price: High to Low' },
      { field: 'title', direction: 'asc', label: 'Name A-Z' },
    ],
    filterConfig: {
      searchable: true,
      searchFields: ['name', 'description', 'brand', 'category'],
      tagFilter: true,
      categoryFilter: true,
      dateFilter: false,
      customFilters: [
        {
          key: 'purchased',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'all', label: 'All Items' },
            { value: 'purchased', label: 'Purchased' },
            { value: 'unpurchased', label: 'Not Purchased' },
          ],
        },
        {
          key: 'priority',
          label: 'Priority',
          type: 'multiselect',
          options: [
            { value: 'high', label: 'High Priority' },
            { value: 'medium', label: 'Medium Priority' },
            { value: 'low', label: 'Low Priority' },
          ],
        },
        {
          key: 'price',
          label: 'Price Range',
          type: 'range',
        },
      ],
    },
    columns: {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
    },
    gap: 4,
    animations: {
      enabled: true,
      duration: 0.2,
      stagger: false, // Faster for management interface
    },
  },
  adapter: adapters.wishlist,
};

// Compact Gallery Preset (for sidebars, modals, etc.)
export const compactGalleryPreset: GalleryPreset = {
  name: 'compact',
  description: 'Compact layout for sidebars, modals, and small spaces',
  config: {
    layout: 'list',
    viewMode: 'compact',
    itemsPerPage: 10,
    infiniteScroll: true,
    selectable: false,
    multiSelect: false,
    draggable: false,
    sortable: false,
    filterConfig: {
      searchable: true,
      searchFields: ['title', 'description'],
      tagFilter: false,
      categoryFilter: false,
      dateFilter: false,
      customFilters: [],
    },
    columns: {
      xs: 1,
      sm: 1,
      md: 1,
      lg: 1,
      xl: 1,
    },
    gap: 2,
    animations: {
      enabled: false, // Faster for compact views
    },
  },
  adapter: adapters.image,
};

// Table View Preset (for data-heavy management)
export const tableGalleryPreset: GalleryPreset = {
  name: 'table',
  description: 'Table layout for data-heavy management interfaces',
  config: {
    layout: 'table',
    viewMode: 'compact',
    itemsPerPage: 50,
    infiniteScroll: false,
    selectable: true,
    multiSelect: true,
    draggable: false,
    sortable: true,
    sortOptions: [
      { field: 'title', direction: 'asc', label: 'Title A-Z' },
      { field: 'createdAt', direction: 'desc', label: 'Date Created' },
      { field: 'updatedAt', direction: 'desc', label: 'Last Modified' },
      { field: 'author', direction: 'asc', label: 'Author' },
    ],
    filterConfig: {
      searchable: true,
      searchFields: ['title', 'description', 'author', 'tags'],
      tagFilter: true,
      categoryFilter: true,
      dateFilter: true,
      customFilters: [],
    },
    animations: {
      enabled: false, // Tables don't need animations
    },
  },
  adapter: adapters.image,
};

// Carousel Preset (for featured content)
export const carouselGalleryPreset: GalleryPreset = {
  name: 'carousel',
  description: 'Carousel layout for featured content and highlights',
  config: {
    layout: 'carousel',
    viewMode: 'spacious',
    itemsPerPage: 5,
    infiniteScroll: false,
    selectable: false,
    multiSelect: false,
    draggable: false,
    sortable: false,
    filterConfig: {
      searchable: false,
      tagFilter: false,
      categoryFilter: false,
      dateFilter: false,
      customFilters: [],
    },
    animations: {
      enabled: true,
      duration: 0.6,
      stagger: false,
    },
  },
  adapter: adapters.image,
};

// Export all presets
export const presets = {
  inspiration: inspirationGalleryPreset,
  instructions: instructionsGalleryPreset,
  wishlist: wishlistGalleryPreset,
  compact: compactGalleryPreset,
  table: tableGalleryPreset,
  carousel: carouselGalleryPreset,
};

// Helper function to get preset by name
export function getPreset(name: string): GalleryPreset | undefined {
  return presets[name as keyof typeof presets];
}

// Helper function to merge preset with custom config
export function mergePresetConfig(preset: GalleryPreset, customConfig: any = {}) {
  return {
    ...preset.config,
    ...customConfig,
    filterConfig: {
      ...preset.config.filterConfig,
      ...customConfig.filterConfig,
    },
    columns: {
      ...preset.config.columns,
      ...customConfig.columns,
    },
    animations: {
      ...preset.config.animations,
      ...customConfig.animations,
    },
  };
}
