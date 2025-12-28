/**
 * GotItModal Stories
 *
 * Story wish-2004: Got It Flow Modal
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '@repo/app-component-library'
import { GotItModal, type GotItModalProps } from '../index'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

/**
 * Mock wishlist item for stories
 */
const mockItem: WishlistItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  title: 'LEGO Star Wars Millennium Falcon',
  store: 'LEGO',
  setNumber: '75192',
  sourceUrl: null,
  imageUrl: 'https://images.brickset.com/sets/images/75192-1.jpg',
  price: '849.99',
  currency: 'USD',
  pieceCount: 7541,
  releaseDate: null,
  tags: ['Star Wars', 'UCS'],
  priority: 5,
  notes: 'Dream set!',
  sortOrder: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

/**
 * Wrapper component for controlled story state
 */
function GotItModalStory(props: Omit<GotItModalProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Got It Modal</Button>
      <GotItModal {...props} open={open} onOpenChange={setOpen} />
    </div>
  )
}

const meta: Meta<typeof GotItModal> = {
  title: 'Wishlist/GotItModal',
  component: GotItModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal for marking a wishlist item as purchased. Captures purchase details like price paid, tax, shipping, quantity, and date.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <GotItModalStory
      item={mockItem}
      onCompleted={() => {
        // Storybook action
      }}
    />
  ),
}

export const WithPrefilledPrice: Story = {
  render: () => (
    <GotItModalStory
      item={mockItem}
      onCompleted={() => {
        // Storybook action
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Price is pre-filled from the wishlist item price.',
      },
    },
  },
}

export const WithoutImage: Story = {
  render: () => (
    <GotItModalStory
      item={{ ...mockItem, imageUrl: null }}
      onCompleted={() => {
        // Storybook action
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows placeholder icon when item has no image.',
      },
    },
  },
}

export const WithoutPrice: Story = {
  render: () => (
    <GotItModalStory
      item={{ ...mockItem, price: null }}
      onCompleted={() => {
        // Storybook action
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Price field starts at 0 when item has no price.',
      },
    },
  },
}

export const MinimalItem: Story = {
  render: () => (
    <GotItModalStory
      item={{
        ...mockItem,
        setNumber: null,
        pieceCount: null,
        imageUrl: null,
        price: null,
      }}
      onCompleted={() => {
        // Storybook action
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Item with minimal data - no set number, piece count, image, or price.',
      },
    },
  },
}

export const ThirdPartyStore: Story = {
  render: () => (
    <GotItModalStory
      item={{
        ...mockItem,
        store: 'Barweer',
        title: 'MOC Star Wars AT-AT Walker',
        setNumber: 'MOC-1234',
        price: '199.99',
      }}
      onCompleted={() => {
        // Storybook action
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Item from a third-party store.',
      },
    },
  },
}
