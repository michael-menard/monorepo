import { z } from 'zod';

// Base gallery item schema - flexible to support any data type
export const GalleryItemSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional(), // Flexible metadata for any additional data
  liked: z.boolean().optional(),
  selected: z.boolean().optional(),
  // Support for different item types
  type: z.enum(['image', 'instruction', 'inspiration', 'wishlist', 'custom']).optional(),
  // Original data for type-specific operations
  originalData: z.unknown().optional(),
});

export type GalleryItem = z.infer<typeof GalleryItemSchema>;

// Layout options
export const GalleryLayoutSchema = z.enum(['grid', 'masonry', 'list', 'table', 'carousel']);
export type GalleryLayout = z.infer<typeof GalleryLayoutSchema>;

// View modes for different display styles
export const ViewModeSchema = z.enum(['compact', 'comfortable', 'spacious']);
export type ViewMode = z.infer<typeof ViewModeSchema>;

// Sorting options
export const SortOptionSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
  label: z.string(),
});
export type SortOption = z.infer<typeof SortOptionSchema>;

// Filter configuration
export const FilterConfigSchema = z.object({
  searchable: z.boolean().default(true),
  searchFields: z.array(z.string()).default(['title', 'description', 'tags']),
  tagFilter: z.boolean().default(true),
  categoryFilter: z.boolean().default(true),
  dateFilter: z.boolean().default(false),
  customFilters: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['select', 'multiselect', 'range', 'boolean']),
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
    })).optional(),
  })).default([]),
});
export type FilterConfig = z.infer<typeof FilterConfigSchema>;

// Gallery configuration
export const GalleryConfigSchema = z.object({
  layout: GalleryLayoutSchema.default('grid'),
  viewMode: ViewModeSchema.default('comfortable'),
  itemsPerPage: z.number().min(1).max(100).default(20),
  infiniteScroll: z.boolean().default(true),
  selectable: z.boolean().default(false),
  multiSelect: z.boolean().default(false),
  draggable: z.boolean().default(false),
  sortable: z.boolean().default(true),
  sortOptions: z.array(SortOptionSchema).default([
    { field: 'createdAt', direction: 'desc', label: 'Newest First' },
    { field: 'createdAt', direction: 'asc', label: 'Oldest First' },
    { field: 'title', direction: 'asc', label: 'Title A-Z' },
    { field: 'title', direction: 'desc', label: 'Title Z-A' },
  ]),
  filterConfig: FilterConfigSchema.default({}),
  // Grid-specific options
  columns: z.object({
    xs: z.number().min(1).max(12).default(1),
    sm: z.number().min(1).max(12).default(2),
    md: z.number().min(1).max(12).default(3),
    lg: z.number().min(1).max(12).default(4),
    xl: z.number().min(1).max(12).default(5),
  }).default({}),
  gap: z.number().min(0).max(20).default(4),
  // Animation options
  animations: z.object({
    enabled: z.boolean().default(true),
    duration: z.number().min(0).max(2).default(0.3),
    stagger: z.boolean().default(true),
    staggerDelay: z.number().min(0).max(0.5).default(0.05),
  }).default({}),
});
export type GalleryConfig = z.infer<typeof GalleryConfigSchema>;

// Action handlers
export interface GalleryActions {
  onItemClick?: (item: GalleryItem) => void;
  onItemLike?: (itemId: string, liked: boolean) => void;
  onItemShare?: (itemId: string) => void;
  onItemDelete?: (itemId: string) => void;
  onItemDownload?: (itemId: string) => void;
  onItemEdit?: (item: GalleryItem) => void;
  onItemsSelected?: (itemIds: string[]) => void;
  onBatchDelete?: (itemIds: string[]) => void;
  onBatchDownload?: (itemIds: string[]) => void;
  onBatchShare?: (itemIds: string[]) => void;
  onLoadMore?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}

// Gallery state
export interface GalleryState {
  items: GalleryItem[];
  selectedItems: string[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  searchQuery: string;
  activeFilters: Record<string, unknown>;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

// Data adapter interface for transforming different data types
export interface DataAdapter<T = unknown> {
  transform: (data: T) => GalleryItem;
  validate?: (data: unknown) => data is T;
  getSearchableText?: (data: T) => string;
  getFilterableFields?: (data: T) => Record<string, unknown>;
}

// Preset configurations for common use cases
export interface GalleryPreset {
  name: string;
  description: string;
  config: Partial<GalleryConfig>;
  adapter?: DataAdapter;
}

// Component props
export interface GalleryProps {
  items: GalleryItem[];
  config?: Partial<GalleryConfig>;
  actions?: GalleryActions;
  className?: string;
  loading?: boolean;
  error?: string | null;
  selectedItems?: string[];
  // Data transformation
  adapter?: DataAdapter;
  // Preset configuration
  preset?: string | GalleryPreset;
}

// Export commonly used types
export type {
  GalleryItem as Item,
  GalleryLayout as Layout,
  GalleryConfig as Config,
  GalleryActions as Actions,
  GalleryState as State,
  GalleryProps as Props,
};
