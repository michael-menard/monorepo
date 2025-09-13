import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Gallery } from '../components/Gallery/Gallery';
import {
  inspirationGalleryPreset,
  instructionsGalleryPreset,
  wishlistGalleryPreset,
  compactGalleryPreset,
  tableGalleryPreset,
  carouselGalleryPreset,
} from './index';
import { GalleryAdapters } from '../utils/adapters';

// Mock data for different types
const inspirationData = [
  {
    id: '1',
    title: 'Cyberpunk Cityscape',
    imageUrl: 'https://picsum.photos/400/600?random=1',
    description: 'Neon-lit futuristic city with detailed buildings',
    author: 'CyberBuilder',
    tags: ['cyberpunk', 'city', 'neon'],
    createdAt: '2023-12-01T00:00:00Z',
    liked: true,
    likes: 142,
    views: 2341,
    difficulty: 'advanced',
  },
  {
    id: '2',
    title: 'Medieval Village',
    imageUrl: 'https://picsum.photos/400/500?random=2',
    description: 'Charming medieval village with market square',
    author: 'HistoryBuilder',
    tags: ['medieval', 'village', 'historical'],
    createdAt: '2023-11-15T00:00:00Z',
    liked: false,
    likes: 89,
    views: 1456,
    difficulty: 'intermediate',
  },
  {
    id: '3',
    title: 'Space Station Omega',
    imageUrl: 'https://picsum.photos/400/700?random=3',
    description: 'Massive rotating space station with docking bays',
    author: 'SpaceMaster',
    tags: ['space', 'station', 'rotating'],
    createdAt: '2023-10-20T00:00:00Z',
    liked: true,
    likes: 203,
    views: 3421,
    difficulty: 'expert',
  },
];

const instructionData = [
  {
    id: '1',
    title: 'Castle Fortress Instructions',
    description: 'Complete building guide for medieval fortress',
    author: 'CastleDesigner',
    tags: ['castle', 'fortress', 'medieval'],
    difficulty: 'advanced',
    pieceCount: 2847,
    createdAt: '2023-12-01T00:00:00Z',
    imageUrl: 'https://picsum.photos/400/300?random=4',
    buildTime: '8-12 hours',
    steps: 156,
    downloadCount: 1234,
  },
  {
    id: '2',
    title: 'Technic Supercar MOC',
    description: 'High-performance sports car with working features',
    author: 'TechnicPro',
    tags: ['technic', 'car', 'supercar'],
    difficulty: 'expert',
    pieceCount: 1456,
    createdAt: '2023-11-15T00:00:00Z',
    imageUrl: 'https://picsum.photos/400/300?random=5',
    buildTime: '6-8 hours',
    steps: 89,
    downloadCount: 892,
  },
];

const wishlistData = [
  {
    id: '1',
    name: 'LEGO Creator Expert Big Ben',
    description: 'Iconic London landmark',
    imageUrl: 'https://picsum.photos/400/300?random=6',
    price: 249.99,
    priority: 'high',
    purchased: false,
    category: 'architecture',
    tags: ['architecture', 'london', 'landmark'],
    createdAt: '2023-12-01T00:00:00Z',
    brand: 'LEGO',
    model: '10253',
  },
  {
    id: '2',
    name: 'Millennium Falcon UCS',
    description: 'Ultimate Collector Series',
    imageUrl: 'https://picsum.photos/400/300?random=7',
    price: 849.99,
    priority: 'medium',
    purchased: true,
    category: 'star-wars',
    tags: ['star-wars', 'ucs', 'millennium-falcon'],
    createdAt: '2023-11-15T00:00:00Z',
    brand: 'LEGO',
    model: '75192',
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
  title: 'Gallery/Presets',
  component: Gallery,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
Gallery presets provide pre-configured setups for common use cases. Each preset includes:
- Optimized layout and view mode
- Appropriate data adapter
- Relevant filters and sort options
- Suitable interaction patterns

These presets can be used as-is or customized further for specific needs.
        `,
      },
    },
  },
  argTypes: {
    preset: {
      control: false,
    },
    config: {
      control: false,
    },
    adapter: {
      control: false,
    },
  },
  args: {
    actions: mockActions,
  },
};

export default meta;
type Story = StoryObj<typeof Gallery>;

export const InspirationGallery: Story = {
  name: 'Inspiration Gallery',
  args: {
    items: inspirationData,
    preset: 'inspiration',
    adapter: GalleryAdapters.inspiration,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Inspiration Gallery Preset**

Perfect for browsing creative MOC inspiration with:
- **Masonry Layout**: Accommodates images of different heights
- **Comfortable View**: Shows descriptions and metadata
- **Search & Filters**: Find inspiration by tags, difficulty, etc.
- **Like System**: Save favorite builds
- **No Selection**: Focus on browsing, not managing

**Use Cases**: MOC galleries, inspiration boards, creative showcases
        `,
      },
    },
  },
};

export const InstructionsGallery: Story = {
  name: 'Instructions Gallery',
  args: {
    items: instructionData,
    preset: 'instructions',
    adapter: GalleryAdapters.instruction,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Instructions Gallery Preset**

Optimized for managing building instructions with:
- **Grid Layout**: Consistent card sizes for easy scanning
- **Multi-Selection**: Select multiple instructions for batch operations
- **Detailed Metadata**: Piece count, difficulty, build time
- **Batch Operations**: Download, delete, or share multiple instructions
- **Advanced Sorting**: By difficulty, piece count, download count

**Use Cases**: Instruction libraries, MOC databases, educational content
        `,
      },
    },
  },
};

export const WishlistGallery: Story = {
  name: 'Wishlist Gallery',
  args: {
    items: wishlistData,
    preset: 'wishlist',
    adapter: GalleryAdapters.wishlist,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Wishlist Gallery Preset**

Designed for managing purchase wishlists with:
- **Grid Layout**: Clear product presentation
- **Priority Sorting**: High-priority items first
- **Purchase Status**: Visual indicators for purchased items
- **Price Information**: Budget planning support
- **Drag & Drop**: Reorder by priority (when enabled)

**Use Cases**: Shopping wishlists, gift lists, collection planning
        `,
      },
    },
  },
};

export const CompactGallery: Story = {
  name: 'Compact Gallery',
  args: {
    items: inspirationData.slice(0, 3),
    preset: 'compact',
    adapter: GalleryAdapters.inspiration,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Compact Gallery Preset**

Minimal layout for space-constrained areas:
- **List Layout**: Efficient vertical space usage
- **Compact View**: Essential information only
- **No Filters**: Simplified interface
- **Small Item Count**: Typically 5-10 items
- **Fast Loading**: Minimal animations

**Use Cases**: Sidebars, modal dialogs, mobile views, related items
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md mx-auto p-4">
        <Story />
      </div>
    ),
  ],
};

export const TableGallery: Story = {
  name: 'Table Gallery',
  args: {
    items: instructionData,
    preset: 'table',
    adapter: GalleryAdapters.instruction,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Table Gallery Preset**

Data-focused layout for management interfaces:
- **Table Layout**: Structured data presentation
- **Sortable Columns**: Click headers to sort
- **Bulk Selection**: Checkbox selection for batch operations
- **High Density**: Many items per page (50+)
- **No Animations**: Fast, responsive interface

**Use Cases**: Admin panels, data management, inventory systems
        `,
      },
    },
  },
};

export const CarouselGallery: Story = {
  name: 'Carousel Gallery',
  args: {
    items: inspirationData,
    preset: 'carousel',
    adapter: GalleryAdapters.inspiration,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Carousel Gallery Preset**

Showcase layout for featured content:
- **Carousel Layout**: Horizontal scrolling presentation
- **Spacious View**: Large, prominent display
- **No Filters**: Focus on featured content
- **Smooth Animations**: Elegant transitions
- **Limited Items**: Typically 3-7 featured items

**Use Cases**: Hero sections, featured content, product showcases
        `,
      },
    },
  },
};

// Comparison Story
export const PresetComparison: Story = {
  name: 'Preset Comparison',
  render: () => (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Inspiration (Masonry)</h2>
        <div className="border rounded-lg p-4">
          <Gallery
            items={inspirationData.slice(0, 3)}
            preset="inspiration"
            adapter={GalleryAdapters.inspiration}
            actions={mockActions}
          />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Instructions (Grid)</h2>
        <div className="border rounded-lg p-4">
          <Gallery
            items={instructionData}
            preset="instructions"
            adapter={GalleryAdapters.instruction}
            actions={mockActions}
          />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Compact (List)</h2>
        <div className="border rounded-lg p-4 max-w-md">
          <Gallery
            items={inspirationData.slice(0, 3)}
            preset="compact"
            adapter={GalleryAdapters.inspiration}
            actions={mockActions}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of different gallery presets showing their unique characteristics.',
      },
    },
  },
};
