// If you see a type error for '@storybook/react', ensure you have @storybook/react and its types installed.
import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import GalleryImageCard, { GalleryImageCardProps } from './index';

const meta: Meta<typeof GalleryImageCard> = {
  title: 'Gallery/GalleryImageCard',
  component: GalleryImageCard,
  tags: ['autodocs'],
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' },
    author: { control: 'text' },
    uploadDate: { control: 'date' },
    initialLiked: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component: 'A card component for displaying gallery images with metadata, like/favorite button, and responsive design.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof GalleryImageCard>;

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