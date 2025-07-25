// If you see a type error for '@storybook/react', ensure you have @storybook/react and its types installed.
import React from 'react';
// import { Meta, StoryObj } from '@storybook/react';
// import GalleryImageCard, { GalleryImageCardProps } from './index.js';

// const meta: Meta<typeof GalleryImageCard> = {
//   title: 'Gallery/GalleryImageCard',
//   component: GalleryImageCard,
//   tags: ['autodocs'],
//   argTypes: {
//     onClick: { action: 'clicked' },
//   },
// };

// export default meta;

// type Story = StoryObj<typeof GalleryImageCard>;

// export const Default: Story = {
//   args: {
//     image: {
//       id: '1',
//       url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
//       title: 'Sample Image',
//       tags: ['nature', 'forest'],
//       category: 'Nature',
//       createdAt: '2023-01-01T00:00:00Z',
//       updatedAt: '2023-01-01T00:00:00Z',
//     },
//   },
// };

export const Default: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    title: 'Sunset Over the Lake',
    description: 'A beautiful sunset over a tranquil lake, with vibrant colors and calm waters.',
    author: 'Jane Doe',
    uploadDate: new Date(),
    initialLiked: false,
  },
};

export const Liked: Story = {
  args: {
    ...Default.args,
    initialLiked: true,
  },
};

export const NoAuthor: Story = {
  args: {
    ...Default.args,
    author: undefined,
  },
};

export const NoDescription: Story = {
  args: {
    ...Default.args,
    description: undefined,
  },
};

export const Responsive: Story = {
  render: (args: GalleryImageCardProps) => (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <GalleryImageCard {...args} />
    </div>
  ),
  args: {
    ...Default.args,
  },
}; 