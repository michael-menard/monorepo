import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { GalleryCard } from './GalleryCard';
import type { GalleryItem, GalleryConfig } from '../../types/index';

const mockItem: GalleryItem = {
  id: '1',
  title: 'Space Station Alpha',
  description: 'A massive space station MOC with rotating sections and detailed interior. This build features multiple docking bays, a command center, and living quarters for the crew.',
  imageUrl: 'https://picsum.photos/400/300?random=1',
  thumbnailUrl: 'https://picsum.photos/200/150?random=1',
  author: 'SpaceBuilder2023',
  tags: ['space', 'moc', 'advanced', 'rotating', 'detailed', 'interior'],
  category: 'space',
  createdAt: new Date('2023-12-01'),
  liked: false,
  type: 'inspiration',
};

const mockConfig: GalleryConfig = {
  layout: 'grid',
  viewMode: 'comfortable',
  selectable: true,
  animations: {
    enabled: true,
    duration: 0.3,
    stagger: true,
    staggerDelay: 0.05,
  },
  columns: { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap: 4,
  itemsPerPage: 20,
  infiniteScroll: true,
  multiSelect: false,
  draggable: false,
  sortable: true,
  sortOptions: [],
  filterConfig: {
    searchable: true,
    searchFields: ['title'],
    tagFilter: true,
    categoryFilter: true,
    dateFilter: false,
    customFilters: [],
  },
};

const mockHandlers = {
  onSelect: action('onSelect'),
  onClick: action('onClick'),
  onLike: action('onLike'),
  onShare: action('onShare'),
  onDelete: action('onDelete'),
  onDownload: action('onDownload'),
  onEdit: action('onEdit'),
};

const meta: Meta<typeof GalleryCard> = {
  title: 'Gallery/GalleryCard',
  component: GalleryCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The GalleryCard component displays individual gallery items with support for various 
view modes, interactions, and states. It's the building block used by all gallery layouts.

## Features
- **Multiple View Modes**: Compact, Comfortable, and Spacious
- **Interactive Actions**: Like, Share, Download, Edit, Delete
- **Selection Support**: Single and multi-select with visual feedback
- **Image Loading States**: Loading, error, and success states
- **Tag Display**: Configurable tag display with overflow handling
- **Type Badges**: Visual indicators for different content types
        `,
      },
    },
  },
  argTypes: {
    item: {
      description: 'Gallery item data to display',
      control: 'object',
    },
    config: {
      description: 'Gallery configuration affecting card display',
      control: 'object',
    },
    selected: {
      description: 'Whether the card is selected',
      control: 'boolean',
    },
    className: {
      description: 'Additional CSS classes',
      control: 'text',
    },
  },
  args: {
    item: mockItem,
    config: mockConfig,
    selected: false,
    ...mockHandlers,
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GalleryCard>;

// Basic States
export const Default: Story = {
  name: 'Default Card',
  args: {},
};

export const Selected: Story = {
  name: 'Selected Card',
  args: {
    selected: true,
  },
};

export const Liked: Story = {
  name: 'Liked Card',
  args: {
    item: {
      ...mockItem,
      liked: true,
    },
  },
};

export const WithoutSelection: Story = {
  name: 'Without Selection',
  args: {
    config: {
      ...mockConfig,
      selectable: false,
    },
  },
};

// View Modes
export const CompactMode: Story = {
  name: 'Compact View Mode',
  args: {
    config: {
      ...mockConfig,
      viewMode: 'compact',
    },
  },
};

export const ComfortableMode: Story = {
  name: 'Comfortable View Mode',
  args: {
    config: {
      ...mockConfig,
      viewMode: 'comfortable',
    },
  },
};

export const SpaciousMode: Story = {
  name: 'Spacious View Mode',
  args: {
    config: {
      ...mockConfig,
      viewMode: 'spacious',
    },
  },
};

// Content Variations
export const MinimalContent: Story = {
  name: 'Minimal Content',
  args: {
    item: {
      id: '2',
      imageUrl: 'https://picsum.photos/400/300?random=2',
      createdAt: new Date(),
    },
  },
};

export const LongTitle: Story = {
  name: 'Long Title',
  args: {
    item: {
      ...mockItem,
      title: 'This is a very long title that should wrap to multiple lines and test how the card handles overflow text content',
    },
  },
};

export const ManyTags: Story = {
  name: 'Many Tags',
  args: {
    item: {
      ...mockItem,
      tags: ['space', 'moc', 'advanced', 'rotating', 'detailed', 'interior', 'command-center', 'docking-bay', 'crew-quarters', 'engineering'],
    },
  },
};

export const NoTags: Story = {
  name: 'No Tags',
  args: {
    item: {
      ...mockItem,
      tags: [],
    },
  },
};

// Different Types
export const InstructionType: Story = {
  name: 'Instruction Type',
  args: {
    item: {
      ...mockItem,
      type: 'instruction',
      title: 'Medieval Castle Instructions',
      description: 'Step-by-step building guide for a detailed medieval castle',
      category: 'instructions',
    },
  },
};

export const WishlistType: Story = {
  name: 'Wishlist Type',
  args: {
    item: {
      ...mockItem,
      type: 'wishlist',
      title: 'LEGO Creator Expert Big Ben',
      description: 'Iconic London landmark in LEGO form',
      category: 'wishlist',
    },
  },
};

export const CustomType: Story = {
  name: 'Custom Type',
  args: {
    item: {
      ...mockItem,
      type: 'custom',
      title: 'Custom Build',
      description: 'A unique custom creation',
      category: 'custom',
    },
  },
};

// Image States
export const ImageError: Story = {
  name: 'Image Error',
  args: {
    item: {
      ...mockItem,
      imageUrl: 'https://invalid-url.com/image.jpg',
    },
  },
};

export const NoImage: Story = {
  name: 'No Image',
  args: {
    item: {
      ...mockItem,
      imageUrl: '',
    },
  },
};

// Interactive States
export const AllActionsEnabled: Story = {
  name: 'All Actions Enabled',
  args: {
    item: mockItem,
  },
  parameters: {
    docs: {
      description: {
        story: 'Card with all interactive actions enabled. Try clicking the action buttons!',
      },
    },
  },
};

export const ReadOnlyCard: Story = {
  name: 'Read-Only Card',
  args: {
    onClick: undefined,
    onLike: undefined,
    onShare: undefined,
    onDelete: undefined,
    onDownload: undefined,
    onEdit: undefined,
    config: {
      ...mockConfig,
      selectable: false,
    },
  },
};

// Layout Variations
export const WideCard: Story = {
  name: 'Wide Card',
  args: {},
  decorators: [
    (Story) => (
      <div className="w-96 p-4">
        <Story />
      </div>
    ),
  ],
};

export const NarrowCard: Story = {
  name: 'Narrow Card',
  args: {},
  decorators: [
    (Story) => (
      <div className="w-64 p-4">
        <Story />
      </div>
    ),
  ],
};

// Dark Mode
export const DarkMode: Story = {
  name: 'Dark Mode',
  args: {},
  decorators: [
    (Story) => (
      <div className="w-80 p-4 bg-gray-900 min-h-screen">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
