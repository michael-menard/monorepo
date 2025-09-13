import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Gallery } from './Gallery';
import { GalleryAdapters } from '../../utils/adapters';
import type { GalleryItem } from '../../types/index';

// Mock data for stories
const mockItems: GalleryItem[] = [
  {
    id: '1',
    title: 'Space Station Alpha',
    description: 'A massive space station MOC with rotating sections and detailed interior',
    imageUrl: 'https://picsum.photos/400/300?random=1',
    thumbnailUrl: 'https://picsum.photos/200/150?random=1',
    author: 'SpaceBuilder2023',
    tags: ['space', 'moc', 'advanced', 'rotating'],
    category: 'space',
    createdAt: new Date('2023-12-01'),
    liked: false,
    type: 'inspiration',
  },
  {
    id: '2',
    title: 'Medieval Castle Instructions',
    description: 'Complete building instructions for a detailed medieval castle with working drawbridge',
    imageUrl: 'https://picsum.photos/400/300?random=2',
    thumbnailUrl: 'https://picsum.photos/200/150?random=2',
    author: 'CastleDesigner',
    tags: ['castle', 'instructions', 'medieval', 'drawbridge'],
    category: 'instructions',
    createdAt: new Date('2023-11-15'),
    liked: true,
    type: 'instruction',
  },
  {
    id: '3',
    title: 'Millennium Falcon UCS',
    description: 'Ultimate Collector Series Millennium Falcon - the largest LEGO set ever made',
    imageUrl: 'https://picsum.photos/400/300?random=3',
    thumbnailUrl: 'https://picsum.photos/200/150?random=3',
    author: 'LEGO',
    tags: ['star-wars', 'ucs', 'millennium-falcon', 'ultimate'],
    category: 'wishlist',
    createdAt: new Date('2023-10-20'),
    liked: false,
    type: 'wishlist',
  },
  {
    id: '4',
    title: 'Cyberpunk City Block',
    description: 'Neon-lit cyberpunk cityscape with detailed buildings and vehicles',
    imageUrl: 'https://picsum.photos/400/300?random=4',
    thumbnailUrl: 'https://picsum.photos/200/150?random=4',
    author: 'CyberBuilder',
    tags: ['cyberpunk', 'city', 'neon', 'futuristic'],
    category: 'inspiration',
    createdAt: new Date('2023-09-10'),
    liked: true,
    type: 'inspiration',
  },
  {
    id: '5',
    title: 'Technic Supercar',
    description: 'High-performance supercar with working suspension and steering',
    imageUrl: 'https://picsum.photos/400/300?random=5',
    thumbnailUrl: 'https://picsum.photos/200/150?random=5',
    author: 'TechnicMaster',
    tags: ['technic', 'supercar', 'suspension', 'steering'],
    category: 'instructions',
    createdAt: new Date('2023-08-05'),
    liked: false,
    type: 'instruction',
  },
  {
    id: '6',
    title: 'Hogwarts Castle',
    description: 'Massive Hogwarts Castle with all the iconic locations from Harry Potter',
    imageUrl: 'https://picsum.photos/400/300?random=6',
    thumbnailUrl: 'https://picsum.photos/200/150?random=6',
    author: 'WizardBuilder',
    tags: ['harry-potter', 'hogwarts', 'castle', 'magic'],
    category: 'wishlist',
    createdAt: new Date('2023-07-12'),
    liked: true,
    type: 'wishlist',
  },
];

const mockActions = {
  onItemClick: action('onItemClick'),
  onItemLike: action('onItemLike'),
  onItemShare: action('onItemShare'),
  onItemDelete: action('onItemDelete'),
  onItemDownload: action('onItemDownload'),
  onItemEdit: action('onItemEdit'),
  onItemsSelected: action('onItemsSelected'),
  onBatchDelete: action('onBatchDelete'),
  onBatchDownload: action('onBatchDownload'),
  onBatchShare: action('onBatchShare'),
  onLoadMore: action('onLoadMore'),
  onRefresh: action('onRefresh'),
};

const meta: Meta<typeof Gallery> = {
  title: 'Gallery/Gallery',
  component: Gallery,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The Gallery component is a comprehensive, flexible gallery system that supports multiple layouts, 
data types, and interaction patterns. It can be configured with presets for common use cases or 
customized for specific needs.

## Features
- **Multiple Layouts**: Grid, Masonry, List, Table, and Carousel
- **Data Adapters**: Transform any data type to gallery format
- **Preset Configurations**: Pre-configured setups for common use cases
- **Selection & Batch Operations**: Single and multi-select with batch actions
- **Search & Filtering**: Configurable search and filter options
- **Responsive Design**: Mobile-first approach with customizable breakpoints
- **Animations**: Smooth transitions with Framer Motion
        `,
      },
    },
  },
  argTypes: {
    items: {
      description: 'Array of gallery items to display',
      control: false,
    },
    config: {
      description: 'Gallery configuration object',
      control: 'object',
    },
    preset: {
      description: 'Preset configuration name',
      control: {
        type: 'select',
        options: ['inspiration', 'instructions', 'wishlist', 'compact', 'table', 'carousel'],
      },
    },
    adapter: {
      description: 'Data adapter for transforming items',
      control: false,
    },
    actions: {
      description: 'Event handlers for gallery interactions',
      control: false,
    },
    selectedItems: {
      description: 'Array of selected item IDs (for controlled selection)',
      control: 'object',
    },
    loading: {
      description: 'Loading state',
      control: 'boolean',
    },
    error: {
      description: 'Error message to display',
      control: 'text',
    },
    className: {
      description: 'Additional CSS classes',
      control: 'text',
    },
  },
  args: {
    items: mockItems,
    actions: mockActions,
  },
};

export default meta;
type Story = StoryObj<typeof Gallery>;

// Basic Stories
export const Default: Story = {
  name: 'Default Gallery',
  args: {},
};

export const Loading: Story = {
  name: 'Loading State',
  args: {
    items: [],
    loading: true,
  },
};

export const Error: Story = {
  name: 'Error State',
  args: {
    items: [],
    error: 'Failed to load gallery items. Please try again.',
  },
};

export const Empty: Story = {
  name: 'Empty State',
  args: {
    items: [],
    loading: false,
    error: null,
  },
};

// Layout Stories
export const GridLayout: Story = {
  name: 'Grid Layout',
  args: {
    config: {
      layout: 'grid',
      viewMode: 'comfortable',
      columns: { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
      gap: 4,
    },
  },
};

export const MasonryLayout: Story = {
  name: 'Masonry Layout',
  args: {
    config: {
      layout: 'masonry',
      viewMode: 'comfortable',
      columns: { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
      gap: 6,
    },
  },
};

export const ListLayout: Story = {
  name: 'List Layout',
  args: {
    config: {
      layout: 'list',
      viewMode: 'comfortable',
      gap: 2,
    },
  },
};

export const TableLayout: Story = {
  name: 'Table Layout',
  args: {
    config: {
      layout: 'table',
      viewMode: 'compact',
      selectable: true,
      sortable: true,
    },
  },
};

export const CarouselLayout: Story = {
  name: 'Carousel Layout',
  args: {
    config: {
      layout: 'carousel',
      viewMode: 'spacious',
      itemsPerPage: 3,
    },
  },
};

// View Mode Stories
export const CompactView: Story = {
  name: 'Compact View Mode',
  args: {
    config: {
      layout: 'grid',
      viewMode: 'compact',
      columns: { xs: 2, sm: 3, md: 4, lg: 5, xl: 6 },
    },
  },
};

export const ComfortableView: Story = {
  name: 'Comfortable View Mode',
  args: {
    config: {
      layout: 'grid',
      viewMode: 'comfortable',
      columns: { xs: 1, sm: 2, md: 3, lg: 4, xl: 4 },
    },
  },
};

export const SpaciousView: Story = {
  name: 'Spacious View Mode',
  args: {
    config: {
      layout: 'grid',
      viewMode: 'spacious',
      columns: { xs: 1, sm: 1, md: 2, lg: 3, xl: 3 },
    },
  },
};

// Selection Stories
export const WithSelection: Story = {
  name: 'With Selection',
  args: {
    config: {
      selectable: true,
      multiSelect: true,
    },
  },
};

export const WithSelectedItems: Story = {
  name: 'With Selected Items',
  args: {
    config: {
      selectable: true,
      multiSelect: true,
    },
    selectedItems: ['1', '3', '5'],
  },
};

// Filter Stories
export const WithFilters: Story = {
  name: 'With Search and Filters',
  args: {
    config: {
      filterConfig: {
        searchable: true,
        tagFilter: true,
        categoryFilter: true,
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
            ],
          },
        ],
      },
    },
  },
};

// Preset Stories
export const InspirationPreset: Story = {
  name: 'Inspiration Gallery Preset',
  args: {
    preset: 'inspiration',
    adapter: GalleryAdapters.inspiration,
  },
  parameters: {
    docs: {
      description: {
        story: 'Masonry layout optimized for browsing creative inspiration with search and filtering.',
      },
    },
  },
};

export const InstructionsPreset: Story = {
  name: 'Instructions Gallery Preset',
  args: {
    preset: 'instructions',
    adapter: GalleryAdapters.instruction,
  },
  parameters: {
    docs: {
      description: {
        story: 'Grid layout with selection and batch operations for managing MOC instructions.',
      },
    },
  },
};

export const WishlistPreset: Story = {
  name: 'Wishlist Gallery Preset',
  args: {
    preset: 'wishlist',
    adapter: GalleryAdapters.wishlist,
  },
  parameters: {
    docs: {
      description: {
        story: 'Grid layout with drag-and-drop for organizing wishlist items by priority.',
      },
    },
  },
};

export const CompactPreset: Story = {
  name: 'Compact Gallery Preset',
  args: {
    preset: 'compact',
    items: mockItems.slice(0, 4), // Show fewer items for compact demo
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal list layout perfect for sidebars and modal dialogs.',
      },
    },
  },
};

export const TablePreset: Story = {
  name: 'Table Gallery Preset',
  args: {
    preset: 'table',
  },
  parameters: {
    docs: {
      description: {
        story: 'Table layout optimized for data management with sorting and bulk operations.',
      },
    },
  },
};

export const CarouselPreset: Story = {
  name: 'Carousel Gallery Preset',
  args: {
    preset: 'carousel',
    items: mockItems.slice(0, 5), // Show fewer items for carousel demo
  },
  parameters: {
    docs: {
      description: {
        story: 'Carousel layout perfect for showcasing featured content.',
      },
    },
  },
};

// Animation Stories
export const WithAnimations: Story = {
  name: 'With Animations',
  args: {
    config: {
      layout: 'grid',
      animations: {
        enabled: true,
        duration: 0.5,
        stagger: true,
        staggerDelay: 0.1,
      },
    },
  },
};

export const WithoutAnimations: Story = {
  name: 'Without Animations',
  args: {
    config: {
      layout: 'grid',
      animations: {
        enabled: false,
        duration: 0,
        stagger: false,
        staggerDelay: 0,
      },
    },
  },
};

// Interactive Stories
export const InteractiveDemo: Story = {
  name: 'Interactive Demo',
  args: {
    config: {
      layout: 'grid',
      selectable: true,
      multiSelect: true,
      filterConfig: {
        searchable: true,
        tagFilter: true,
        categoryFilter: true,
      },
      sortable: true,
      sortOptions: [
        { field: 'createdAt', direction: 'desc', label: 'Newest First' },
        { field: 'title', direction: 'asc', label: 'Title A-Z' },
        { field: 'author', direction: 'asc', label: 'Author A-Z' },
      ],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive gallery with all features enabled. Try selecting items, searching, and filtering!',
      },
    },
  },
};
